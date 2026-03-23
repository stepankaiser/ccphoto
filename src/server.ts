import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import Busboy from "busboy";
import { renderMobilePage } from "./mobile-page.js";
import { validateToken } from "./token.js";
import { savePhoto, ensureOutputDir } from "./storage.js";
import type { PhotoMeta, ServerConfig, OutgoingMessage, FrameData, CertPems } from "./types.js";

type PhotoListener = (meta: PhotoMeta) => void;

let server: http.Server | null = null;
let httpsServer: https.Server | null = null;
let config: ServerConfig | null = null;
const photoListeners: PhotoListener[] = [];
// Buffer for photos that arrive when no listener is waiting (race condition fix)
let pendingPhoto: PhotoMeta | null = null;
let latestFrame: FrameData | null = null;
const sseClients = new Set<http.ServerResponse>();

// Channel notification callback — bridges HTTP events to MCP channel pushes
type ChannelNotifier = (content: string, meta: Record<string, string>) => void;
let channelNotifier: ChannelNotifier | null = null;

export function setChannelNotifier(notifier: ChannelNotifier): void {
  channelNotifier = notifier;
}

// User action system — phone can trigger actions that resolve waitForPhoto
export interface UserAction {
  action: string;
  data?: Record<string, unknown>;
}
type ActionListener = (action: UserAction) => void;
const actionListeners: ActionListener[] = [];
let pendingAction: UserAction | null = null;

export function waitForPhoto(timeoutMs: number): Promise<PhotoMeta | null | UserAction> {
  // Check if a photo or action already arrived before we started waiting
  if (pendingPhoto) {
    const meta = pendingPhoto;
    pendingPhoto = null;
    return Promise.resolve(meta);
  }
  if (pendingAction) {
    const action = pendingAction;
    pendingAction = null;
    return Promise.resolve(action);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    function cleanup() {
      const photoIdx = photoListeners.indexOf(photoListener);
      if (photoIdx !== -1) photoListeners.splice(photoIdx, 1);
      const actionIdx = actionListeners.indexOf(actionListener);
      if (actionIdx !== -1) actionListeners.splice(actionIdx, 1);
    }

    function photoListener(meta: PhotoMeta) {
      clearTimeout(timer);
      cleanup();
      resolve(meta);
    }

    function actionListener(action: UserAction) {
      clearTimeout(timer);
      cleanup();
      resolve(action);
    }

    photoListeners.push(photoListener);
    actionListeners.push(actionListener);
  });
}

function notifyPhotoListeners(meta: PhotoMeta): void {
  // Push channel notification (if channels enabled)
  if (channelNotifier) {
    channelNotifier(
      `Photo captured: ${meta.filename} (${Math.round(meta.sizeBytes / 1024)} KB)`,
      {
        event: "photo",
        file_name: meta.filename,
        file_path: meta.absolutePath,
        size_kb: String(Math.round(meta.sizeBytes / 1024)),
      },
    );
  }

  if (photoListeners.length === 0) {
    pendingPhoto = meta;
    return;
  }

  const listeners = [...photoListeners];
  for (const listener of listeners) {
    listener(meta);
  }
}

function notifyActionListeners(action: UserAction): void {
  // Push channel notification for voice messages
  if (channelNotifier && action.action === "voice_message") {
    channelNotifier(
      (action.data?.text as string) || "(voice)",
      { event: "voice", speaker: "user" },
    );
  }

  if (actionListeners.length === 0) {
    pendingAction = action;
    return;
  }

  const listeners = [...actionListeners];
  for (const listener of listeners) {
    listener(action);
  }
}

function handleModeSwitch(
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

  const chunks: Buffer[] = [];
  let totalSize = 0;
  const MAX_BODY_SIZE = 64 * 1024; // 64KB

  req.on("data", (chunk: Buffer) => {
    totalSize += chunk.length;
    if (totalSize <= MAX_BODY_SIZE) {
      chunks.push(chunk);
    }
  });

  req.on("end", () => {
    if (totalSize > MAX_BODY_SIZE) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Body too large" }));
      return;
    }

    try {
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const action: UserAction = { action: body.action ?? "unknown", data: body };
      notifyActionListeners(action);

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
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

  const html = renderMobilePage(cfg.token);
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

  const MAX_SSE_CLIENTS = 10;
  if (sseClients.size >= MAX_SSE_CLIENTS) {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Too many connections");
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

function handleUnifiedRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  cfg: ServerConfig,
): void {
  const url = new URL(req.url ?? "/", `${(req.socket as any).encrypted ? 'https' : 'http'}://${req.headers.host}`);

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

  if (req.method === "POST" && url.pathname === "/frame") {
    handleFrameUpload(req, res, cfg);
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    handleEvents(req, res, cfg);
    return;
  }

  if (req.method === "POST" && url.pathname === "/mode-switch") {
    handleModeSwitch(req, res, cfg);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
}

function handleFrameUpload(
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

  const chunks: Buffer[] = [];
  let totalSize = 0;
  const MAX_FRAME_SIZE = 2 * 1024 * 1024; // 2MB

  req.on("data", (chunk: Buffer) => {
    totalSize += chunk.length;
    if (totalSize <= MAX_FRAME_SIZE) {
      chunks.push(chunk);
    }
  });

  req.on("end", () => {
    if (totalSize > MAX_FRAME_SIZE) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Frame too large" }));
      return;
    }

    const data = Buffer.concat(chunks);
    const w = parseInt(url.searchParams.get("w") ?? "0", 10);
    const h = parseInt(url.searchParams.get("h") ?? "0", 10);

    latestFrame = {
      data,
      timestamp: new Date(),
      width: w,
      height: h,
      mimeType: "image/jpeg",
    };

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ ok: true, timestamp: latestFrame.timestamp.toISOString() }));
  });
}

export async function startHttpsServer(cfg: ServerConfig, certs: CertPems): Promise<ServerConfig> {
  ensureOutputDir(cfg.outputDir);

  if (httpsServer) return config!;

  const httpsPort = cfg.httpsPort ?? cfg.port + 1;
  cfg.httpsPort = httpsPort;

  return new Promise((resolve, reject) => {
    const s = https.createServer(
      { key: certs.key, cert: certs.cert },
      (req, res) => handleUnifiedRequest(req, res, cfg),
    );

    s.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        cfg.httpsPort = (cfg.httpsPort ?? httpsPort) + 1;
        s.listen(cfg.httpsPort, "0.0.0.0");
      } else {
        reject(err);
      }
    });

    s.on("listening", () => {
      httpsServer = s;
      config = cfg;
      resolve(cfg);
    });

    s.listen(httpsPort, "0.0.0.0");
  });
}

export function getLatestFrame(): FrameData | null {
  return latestFrame;
}

export function isHttpsServerRunning(): boolean {
  return httpsServer !== null;
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
    const s = http.createServer((req, res) => handleUnifiedRequest(req, res, cfg));

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

export function switchToLiveMode(): void {
  for (const client of sseClients) {
    client.write("event: switch-to-live\ndata: {}\n\n");
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
  pendingAction = null;
  latestFrame = null;
  photoListeners.length = 0;
  actionListeners.length = 0;
  channelNotifier = null;
  for (const client of sseClients) {
    client.end();
  }
  sseClients.clear();
}

export function stopServer(): void {
  if (httpsServer) {
    httpsServer.close();
    httpsServer = null;
  }
  latestFrame = null;
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
