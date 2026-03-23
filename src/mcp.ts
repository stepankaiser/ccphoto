import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import qrcode from "qrcode-terminal";
import { startServer, isServerRunning, getServerConfig, waitForPhoto, requestPhoto, hasConnectedClients, sendToPhone, startHttpsServer, isHttpsServerRunning, getLatestFrame, switchToLiveMode, setChannelNotifier } from "./server.js";
import { getLocalIPv4 } from "./network.js";
import { generateToken } from "./token.js";
import { ensureCerts } from "./cert.js";
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

async function ensureHttpsServer(): Promise<string> {
  // Ensure HTTP server is running first (shares config/token)
  await ensureServer();

  if (isHttpsServerRunning()) {
    const cfg = getServerConfig()!;
    return `https://${cfg.host}:${cfg.httpsPort}/?token=${cfg.token}`;
  }

  const cfg = getServerConfig()!;
  const certs = await ensureCerts(cfg.host);
  await startHttpsServer(cfg, certs);

  return `https://${cfg.host}:${cfg.httpsPort}/?token=${cfg.token}`;
}

export async function runMcpServer(): Promise<void> {
  const server = new McpServer(
    {
      name: "ccphoto",
      version: "0.3.0-beta.0",
    },
    {
      capabilities: {
        experimental: { "claude/channel": {} },
      },
      instructions: `CCPhoto is a phone camera bridge. Events from the phone arrive as <channel source="ccphoto"> tags when channels are enabled. Photo uploads include file_name and size metadata — call get_latest_photo to see the image. Voice messages include the transcribed text. Use send_to_phone to reply (with speak:true for TTS).`,
    },
  );

  server.tool(
    "capture_photo",
    "Start the camera server and return a QR code for the user to scan with their phone. The server stays running for the entire session — the user only needs to scan once, then they can take photos anytime and switch between Photo and Live modes. If a phone is already connected, it will be notified that a photo is requested (the button will pulse). CRITICAL: You MUST paste the QR code directly in your response text (inside a code block) so the user can see and scan it. After showing the QR, IMMEDIATELY call wait_for_photo to receive the photo.",
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
    "Wait for a photo or a user action from the phone. Blocks until something happens: a photo is uploaded, the user switches to Live mode, or timeout. The phone is fully bidirectional — the user can drive the interaction by tapping Photo or Live on their phone. If the user switches to Live mode, you should call get_live_frame to start watching. If a photo arrives, it is returned as an image. IMPORTANT: After processing the result, IMMEDIATELY call wait_for_photo AGAIN to keep listening. This creates a persistent connection where the user can keep sending photos, voice messages, or switching modes from the phone without typing in Claude Code. Only stop the loop if the user explicitly types something in Claude Code.",
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

      const result = await waitForPhoto(timeoutMs);

      if (!result) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No activity within ${Math.round(timeoutMs / 1000)} seconds. The phone is still connected. Call wait_for_photo again to keep listening.`,
            },
          ],
        };
      }

      // Check if this is a user action (has 'action' property) rather than a photo
      if ("action" in result) {
        const action = result.action;
        if (action === "voice_message") {
          const text = (result.data as Record<string, unknown>)?.text as string || "(empty)";
          return {
            content: [{
              type: "text" as const,
              text: `Voice from phone: ${text}`,
            }],
          };
        }
        if (action === "start_livestream") {
          return {
            content: [
              {
                type: "text" as const,
                text: "The user switched to Live mode on their phone. The camera is now streaming frames every 3 seconds. Call get_live_frame to see what the camera sees, and send_to_phone to show guidance on the phone screen.",
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `User action from phone: ${action}`,
            },
          ],
        };
      }

      // It's a photo
      const meta = result;
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
      speak: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional().describe("If true, the phone will speak the text aloud using text-to-speech."),
      ui_spec: z.string().optional().describe(
        "JSON UI specification for rendering rich, contextual UI on the phone. Generate a spec with root + elements map. Available component types: Card (title, subtitle), Text (content with markdown), Image (src, caption), Metric (label, value, unit), MetricGrid (columns: 2|3, children are Metric elements), Checklist (items: [{text, checked}]), StepByStep (steps: string[], currentStep: number), Alert (message, variant: info|warning|success|error), Table (headers: string[], rows: string[][]), Timer (seconds, label), Badge (text, color), Divider. Example: {\"root\":\"c\",\"elements\":{\"c\":{\"type\":\"Card\",\"props\":{\"title\":\"Result\"},\"children\":[\"t\"]},\"t\":{\"type\":\"Text\",\"props\":{\"content\":\"Hello\"}}}} The children array contains element IDs (keys from the elements map), not inline objects."
      ),
    },
    async ({ text, image_base64, image_mime_type, speak, ui_spec }) => {
      if (!text && !image_base64 && !ui_spec) {
        return {
          content: [{ type: "text" as const, text: "Error: provide at least 'text', 'image_base64', or 'ui_spec'." }],
        };
      }

      if (image_base64 && !image_mime_type) {
        return {
          content: [{ type: "text" as const, text: "Error: 'image_mime_type' is required when 'image_base64' is provided." }],
        };
      }

      if (!(isServerRunning() || isHttpsServerRunning()) || !hasConnectedClients()) {
        return {
          content: [{ type: "text" as const, text: "No phone connected. Use capture_photo or start_livestream first to connect a phone." }],
        };
      }

      const message: OutgoingMessage = {};
      if (text) message.text = text;
      if (image_base64) {
        message.imageData = image_base64;
        message.mimeType = image_mime_type;
      }
      if (speak) message.speak = true;
      if (ui_spec) {
        try {
          message.uiSpec = JSON.parse(ui_spec);
        } catch {
          return {
            content: [{ type: "text" as const, text: "Error: ui_spec is not valid JSON." }],
          };
        }
      }

      sendToPhone(message);

      const parts: string[] = [];
      if (text) parts.push(`text (${text.length} chars)`);
      if (image_base64) parts.push(`image (${image_mime_type})`);
      if (ui_spec) parts.push("UI spec");
      if (speak) parts.push("(spoken)");

      return {
        content: [{ type: "text" as const, text: `Sent to phone: ${parts.join(" + ")}` }],
      };
    },
  );

  server.tool(
    "start_livestream",
    "Start a semi-real-time video stream from the phone camera. If a phone is already connected, it switches to live mode automatically (no new QR needed). The phone streams frames every 3 seconds. Call get_live_frame to see what the camera sees, and send_to_phone to show guidance on the phone screen. CRITICAL: If showing a QR code, paste it in your response text inside a code block.",
    {},
    async () => {
      const httpsUrl = await ensureHttpsServer();

      // Always send the SSE event to notify connected phones
      if (hasConnectedClients()) {
        switchToLiveMode();
      }

      // Always show the HTTPS QR code — the phone needs HTTPS for getUserMedia
      // even if already connected via HTTP
      const qrText = generateQRText(httpsUrl);
      return {
        content: [{
          type: "text" as const,
          text: `Livestream ready! Scan the QR code to connect.\n\nOn Android Chrome: tap "Advanced" then "Proceed" past the certificate warning (one-time).\n\nQR_CODE:\n${qrText}\nURL: ${httpsUrl}\n\nAfter connecting, call get_live_frame to see what the camera sees.`,
        }],
      };
    },
  );

  server.tool(
    "get_live_frame",
    "Get the latest frame from the phone's live camera stream. Returns the most recent frame as an image with a timestamp showing how fresh it is. Use wait_seconds to delay before grabbing the frame — this gives the user time to adjust the camera after receiving guidance via send_to_phone. Combine send_to_phone + get_live_frame(wait_seconds) in a loop to guide the user hands-free.",
    {
      wait_seconds: z.coerce.number().optional().describe("Wait this many seconds before returning the frame. Use after sending guidance to give the user time to adjust the camera (e.g., 5-10 seconds)."),
    },
    async ({ wait_seconds }) => {
      if (wait_seconds && wait_seconds > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait_seconds * 1000));
      }

      const frame = getLatestFrame();

      if (!frame) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No frames received yet. Make sure the phone is connected in live mode. Use start_livestream to begin.",
            },
          ],
        };
      }

      const ageMs = Date.now() - frame.timestamp.getTime();
      const base64 = frame.data.toString("base64");

      return {
        content: [
          {
            type: "image" as const,
            data: base64,
            mimeType: frame.mimeType,
          },
          {
            type: "text" as const,
            text: `Live frame (${(frame.data.length / 1024).toFixed(0)} KB) — ${ageMs < 10000 ? "fresh" : "stale"} (${(ageMs / 1000).toFixed(1)}s ago)${frame.width ? ` — ${frame.width}x${frame.height}` : ""}`,
          },
        ],
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Wire up channel notifications — pushes photo/voice events to Claude
  // when running with --channels flag (beta feature)
  setChannelNotifier((content, meta) => {
    server.server.notification({
      method: "notifications/claude/channel",
      params: { content, meta },
    });
  });
}
