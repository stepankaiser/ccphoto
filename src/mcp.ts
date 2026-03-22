import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import qrcode from "qrcode-terminal";
import { startServer, isServerRunning, getServerConfig, waitForPhoto, requestPhoto, hasConnectedClients, sendToPhone } from "./server.js";
import { getLocalIPv4 } from "./network.js";
import { generateToken } from "./token.js";
import { listPhotos, getLatestPhoto, getPhotoByFilename } from "./storage.js";
import type { OutgoingMessage } from "./types.js";

const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), ".ccphoto", "captures");
const DEFAULT_PORT = 3847;

function getOutputDir(): string {
  return process.env.CCPHOTO_DIR || DEFAULT_OUTPUT_DIR;
}

function generateQRText(url: string): string {
  let qrText = "";
  qrcode.generate(url, { small: true }, (code: string) => {
    qrText = code;
  });
  return qrText;
}

async function ensureServer(): Promise<string> {
  if (isServerRunning()) {
    const cfg = getServerConfig()!;
    return `http://${cfg.host}:${cfg.port}/?token=${cfg.token}`;
  }

  const host = getLocalIPv4();
  if (!host) {
    throw new Error(
      "Could not detect local network IP. Make sure you're connected to WiFi.",
    );
  }

  const token = generateToken();
  const cfg = await startServer({
    port: DEFAULT_PORT,
    outputDir: getOutputDir(),
    token,
    host,
  });

  return `http://${cfg.host}:${cfg.port}/?token=${cfg.token}`;
}

export async function runMcpServer(): Promise<void> {
  const server = new McpServer({
    name: "ccphoto",
    version: "0.1.0",
  });

  server.tool(
    "capture_photo",
    "Start the camera server and return a QR code for the user to scan with their phone. The server stays running for the entire session — the user only needs to scan once, then they can take photos anytime. If a phone is already connected, it will be notified that a photo is requested (the button will pulse). CRITICAL: You MUST paste the QR code directly in your response text (inside a code block) so the user can see and scan it. After showing the QR, IMMEDIATELY call wait_for_photo to receive the photo.",
    {},
    async () => {
      const alreadyRunning = isServerRunning();
      const url = await ensureServer();

      if (alreadyRunning && hasConnectedClients()) {
        requestPhoto();
        return {
          content: [
            {
              type: "text" as const,
              text: `Phone has been notified — the camera button is pulsing. Waiting for photo...`,
            },
          ],
        };
      }

      const qrText = generateQRText(url);
      return {
        content: [
          {
            type: "text" as const,
            text: `QR_CODE:\n${qrText}\nURL: ${url}`,
          },
        ],
      };
    },
  );

  server.tool(
    "wait_for_photo",
    "Wait for a photo to be uploaded from the phone. Blocks until a photo arrives or timeout. Useful for the first photo after showing the QR code. For photos the user has already taken, use get_latest_photo instead.",
    {
      timeout_seconds: z
        .number()
        .optional()
        .describe("How long to wait in seconds (default: 120)"),
    },
    async ({ timeout_seconds }) => {
      const timeoutMs = (timeout_seconds ?? 120) * 1000;
      const url = isServerRunning()
        ? `http://${getServerConfig()!.host}:${getServerConfig()!.port}/?token=${getServerConfig()!.token}`
        : null;

      const meta = await waitForPhoto(timeoutMs);

      if (!meta) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No photo received within ${Math.round(timeoutMs / 1000)} seconds.${url ? ` The camera server is still running at: ${url}` : ""}\n\nCall capture_photo again to show the QR code, then wait_for_photo to receive it.`,
            },
          ],
        };
      }

      const imageData = fs.readFileSync(meta.absolutePath);
      const base64 = imageData.toString("base64");

      return {
        content: [
          {
            type: "image" as const,
            data: base64,
            mimeType: meta.mimeType,
          },
          {
            type: "text" as const,
            text: `Photo received: ${meta.filename} (${(meta.sizeBytes / 1024).toFixed(0)} KB)\nSaved at: ${meta.absolutePath}`,
          },
        ],
      };
    },
  );

  server.tool(
    "get_latest_photo",
    "Get a photo from the phone camera. Returns the most recent photo by default, or a specific photo by filename. Use list_photos to see available filenames. Does not wait for a new photo — use wait_for_photo for that.",
    {
      filename: z
        .string()
        .optional()
        .describe("Specific photo filename to retrieve. If omitted, returns the most recent photo."),
    },
    async ({ filename }) => {
      const outputDir = getOutputDir();
      const meta = filename
        ? getPhotoByFilename(outputDir, filename)
        : getLatestPhoto(outputDir);

      if (!meta) {
        return {
          content: [
            {
              type: "text" as const,
              text: filename
                ? `Photo "${filename}" not found. Use list_photos to see available photos.`
                : "No photos have been captured yet. Use capture_photo first.",
            },
          ],
        };
      }

      const imageData = fs.readFileSync(meta.absolutePath);
      const base64 = imageData.toString("base64");

      return {
        content: [
          {
            type: "image" as const,
            data: base64,
            mimeType: meta.mimeType,
          },
          {
            type: "text" as const,
            text: `Photo: ${meta.filename} (${(meta.sizeBytes / 1024).toFixed(0)} KB)\nCaptured: ${meta.timestamp.toISOString()}\nPath: ${meta.absolutePath}`,
          },
        ],
      };
    },
  );

  server.tool(
    "list_photos",
    "List all captured photos with their filenames, timestamps, and file sizes. Use a filename with get_latest_photo to retrieve a specific photo.",
    {},
    async () => {
      const outputDir = getOutputDir();
      const photos = listPhotos(outputDir);

      if (photos.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No photos have been captured yet. Use capture_photo first.",
            },
          ],
        };
      }

      const lines = photos.map(
        (p) =>
          `- ${p.filename} (${(p.sizeBytes / 1024).toFixed(0)} KB) — ${p.timestamp.toISOString()}`,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `${photos.length} photo(s) captured:\n\n${lines.join("\n")}\n\nDirectory: ${outputDir}`,
          },
        ],
      };
    },
  );

  server.tool(
    "send_to_phone",
    "Send text and/or an image to the connected phone display. The phone becomes a reference screen — useful for showing wiring instructions, pinout diagrams, code snippets, or reference images while the user works with both hands. Text supports basic markdown (headers, bold, code, lists). Requires a phone to be connected via capture_photo first.",
    {
      text: z.string().optional().describe("Text content to display. Supports basic markdown: **bold**, `code`, # headers, - lists, ```code blocks```."),
      image_base64: z.string().optional().describe("Base64-encoded image data to display on the phone."),
      image_mime_type: z.string().optional().describe("MIME type of the image (e.g. 'image/png'). Required when image_base64 is provided."),
    },
    async ({ text, image_base64, image_mime_type }) => {
      if (!text && !image_base64) {
        return {
          content: [{ type: "text" as const, text: "Error: provide at least 'text' or 'image_base64'." }],
        };
      }

      if (image_base64 && !image_mime_type) {
        return {
          content: [{ type: "text" as const, text: "Error: 'image_mime_type' is required when 'image_base64' is provided." }],
        };
      }

      if (!isServerRunning() || !hasConnectedClients()) {
        return {
          content: [{ type: "text" as const, text: "No phone connected. Use capture_photo first to connect a phone." }],
        };
      }

      const message: OutgoingMessage = {};
      if (text) message.text = text;
      if (image_base64) {
        message.imageData = image_base64;
        message.mimeType = image_mime_type;
      }

      sendToPhone(message);

      const parts: string[] = [];
      if (text) parts.push(`text (${text.length} chars)`);
      if (image_base64) parts.push(`image (${image_mime_type})`);

      return {
        content: [{ type: "text" as const, text: `Sent to phone: ${parts.join(" + ")}` }],
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
