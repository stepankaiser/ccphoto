import http from "node:http";
import { URL } from "node:url";
import Busboy from "busboy";
import { renderMobilePage } from "./mobile-page.js";
import { validateToken } from "./token.js";
import { savePhoto, ensureOutputDir } from "./storage.js";
import type { PhotoMeta, ServerConfig, OutgoingMessage } from "./types.js";

type PhotoListener = (meta: PhotoMeta) => void;

let server: http.Server | null = null;
let config: ServerConfig | null = null;
const photoListeners: PhotoListener[] = [];
// Buffer for photos that arrive when no listener is waiting (race condition fix)
let pendingPhoto: PhotoMeta | null = null;
const sseClients = new Set<http.ServerResponse>();

export function waitForPhoto(timeoutMs: number): Promise<PhotoMeta | null> {
  // Check if a photo already arrived before we started waiting
  if (pendingPhoto) {
    const meta = pendingPhoto;
    pendingPhoto = null;
    return Promise.resolve(meta);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const idx = photoListeners.indexOf(listener);
      if (idx !== -1) photoListeners.splice(idx, 1);
      resolve(null);
    }, timeoutMs);

    function listener(meta: PhotoMeta) {
      clearTimeout(timer);
      const idx = photoListeners.indexOf(listener);
      if (idx !== -1) photoListeners.splice(idx, 1);
      resolve(meta);
    }

    photoListeners.push(listener);
  });
}

function notifyPhotoListeners(meta: PhotoMeta): void {
  if (photoListeners.length === 0) {
    // No one is listening yet — buffer it for the next waitForPhoto call
    pendingPhoto = meta;
    return;
  }

  const listeners = [...photoListeners];
  for (const listener of listeners) {
    listener(meta);
  }
}

function checkToken(url: URL, expected: string): boolean {
  const token = url.searchParams.get("token") ?? "";
  return validateToken(token, expected);
}

function handleGetRoot(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  cfg: ServerConfig,
): void {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (!checkToken(url, cfg.token)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  const uploadUrl = `http://${cfg.host}:${cfg.port}/upload`;
  const html = renderMobilePage(cfg.token, uploadUrl);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(html);
}

function handleUpload(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  cfg: ServerConfig,
): void {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (!checkToken(url, cfg.token)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Forbidden" }));
    return;
  }

  const contentType = req.headers["content-type"];
  if (!contentType || !contentType.includes("multipart/form-data")) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Expected multipart/form-data" }));
    return;
  }

  const busboy = Busboy({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024 } });
  let saved = false;

  busboy.on("file", (_fieldname, stream, info) => {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stream.on("end", () => {
      if (saved) return;
      saved = true;

      const data = Buffer.concat(chunks);
      const meta = savePhoto(cfg.outputDir, info.filename, data);
      notifyPhotoListeners(meta);

      process.stderr.write(
        `\n[ccphoto] Photo saved: ${meta.absolutePath} (${(meta.sizeBytes / 1024).toFixed(0)} KB)\n`,
      );

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(
        JSON.stringify({
          filename: meta.filename,
          path: meta.absolutePath,
          size: meta.sizeBytes,
        }),
      );
    });
  });

  busboy.on("error", () => {
    if (!saved) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Upload failed" }));
    }
  });

  req.pipe(busboy);
}

function handleEvents(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  cfg: ServerConfig,
): void {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (!checkToken(url, cfg.token)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  res.write("event: connected\ndata: {}\n\n");
  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
}

function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  cfg: ServerConfig,
): void {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    handleGetRoot(req, res, cfg);
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.method === "POST" && url.pathname === "/upload") {
    handleUpload(req, res, cfg);
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    handleEvents(req, res, cfg);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
}

export function isServerRunning(): boolean {
  return server !== null;
}

export function getServerConfig(): ServerConfig | null {
  return config;
}

export async function startServer(cfg: ServerConfig): Promise<ServerConfig> {
  if (server) return config!;

  ensureOutputDir(cfg.outputDir);
  config = cfg;

  return new Promise((resolve, reject) => {
    const s = http.createServer((req, res) => handleRequest(req, res, cfg));

    s.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        cfg.port++;
        s.listen(cfg.port, "0.0.0.0");
      } else {
        reject(err);
      }
    });

    s.on("listening", () => {
      server = s;
      config = cfg;
      resolve(cfg);
    });

    s.listen(cfg.port, "0.0.0.0");
  });
}

export function requestPhoto(): void {
  for (const client of sseClients) {
    client.write("event: photo-requested\ndata: {}\n\n");
  }
}

export function hasConnectedClients(): boolean {
  return sseClients.size > 0;
}

export function sendToPhone(message: OutgoingMessage): boolean {
  if (sseClients.size === 0) return false;
  const payload = JSON.stringify(message);
  for (const client of sseClients) {
    client.write(`event: content-push\ndata: ${payload}\n\n`);
  }
  return true;
}

export function _resetState(): void {
  pendingPhoto = null;
  photoListeners.length = 0;
  for (const client of sseClients) {
    client.end();
  }
  sseClients.clear();
}

export function stopServer(): void {
  if (server) {
    for (const client of sseClients) {
      client.end();
    }
    sseClients.clear();
    server.close();
    server = null;
    config = null;
  }
}
