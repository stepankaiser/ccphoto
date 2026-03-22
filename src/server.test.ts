import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  startServer,
  stopServer,
  isServerRunning,
  getServerConfig,
  waitForPhoto,
  requestPhoto,
  hasConnectedClients,
  sendToPhone,
  getLatestFrame,
  _resetState,
} from "./server.js";
import { generateToken } from "./token.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function request(options: {
  port: number;
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: Buffer;
}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", ...options },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode!,
            body: Buffer.concat(chunks).toString(),
          }),
        );
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function createMultipartBody(
  fieldName: string,
  filename: string,
  data: Buffer,
  contentType: string,
): { body: Buffer; contentType: string } {
  const boundary = "----CCPhotoTestBoundary" + Date.now();
  const parts: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
    ),
    data,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];
  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

// ---------------------------------------------------------------------------
// Shared state per test
// ---------------------------------------------------------------------------

let tmpDir: string;
let token: string;
let port: number;

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ccphoto-test-"));
}

async function boot(): Promise<void> {
  tmpDir = makeTmpDir();
  token = generateToken();
  port = 49000 + Math.floor(Math.random() * 1000);
  await startServer({ port, outputDir: tmpDir, token, host: "0.0.0.0" });
  // port may have been bumped if the original was in use
  port = getServerConfig()!.port;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("server", () => {
  afterEach(() => {
    stopServer();
    _resetState();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ---- Security ----------------------------------------------------------

  describe("security", () => {
    it("GET / without token returns 403", async () => {
      await boot();
      const res = await request({ port, path: "/" });
      assert.equal(res.status, 403);
    });

    it("GET / with wrong token returns 403", async () => {
      await boot();
      const res = await request({ port, path: "/?token=wrong" });
      assert.equal(res.status, 403);
    });

    it("GET / with valid token returns 200 HTML", async () => {
      await boot();
      const res = await request({ port, path: `/?token=${token}` });
      assert.equal(res.status, 200);
    });

    it("POST /upload without token returns 403", async () => {
      await boot();
      const mp = createMultipartBody("photo", "test.jpg", Buffer.from("x"), "image/jpeg");
      const res = await request({
        port,
        path: "/upload",
        method: "POST",
        headers: { "Content-Type": mp.contentType },
        body: mp.body,
      });
      assert.equal(res.status, 403);
    });

    it("POST /upload with wrong token returns 403", async () => {
      await boot();
      const mp = createMultipartBody("photo", "test.jpg", Buffer.from("x"), "image/jpeg");
      const res = await request({
        port,
        path: "/upload?token=wrong",
        method: "POST",
        headers: { "Content-Type": mp.contentType },
        body: mp.body,
      });
      assert.equal(res.status, 403);
    });

    it("GET /health returns 200 without auth", async () => {
      await boot();
      const res = await request({ port, path: "/health" });
      assert.equal(res.status, 200);
      assert.equal(res.body, "ok");
    });
  });

  // ---- Integration -------------------------------------------------------

  describe("integration", () => {
    it("server starts and isServerRunning returns true", async () => {
      await boot();
      assert.equal(isServerRunning(), true);
    });

    it("GET / with valid token returns HTML containing 'Take Photo'", async () => {
      await boot();
      const res = await request({ port, path: `/?token=${token}` });
      assert.equal(res.status, 200);
      assert.ok(res.body.includes("Take Photo"), "HTML should contain 'Take Photo'");
    });

    it("POST /upload with valid token saves file", async () => {
      await boot();
      const data = Buffer.from("fakejpegdata");
      const mp = createMultipartBody("photo", "test.jpg", data, "image/jpeg");
      const res = await request({
        port,
        path: `/upload?token=${token}`,
        method: "POST",
        headers: { "Content-Type": mp.contentType },
        body: mp.body,
      });
      assert.equal(res.status, 200);
      const json = JSON.parse(res.body);
      assert.ok(json.filename, "response should include filename");
      assert.ok(json.path, "response should include path");
      assert.ok(fs.existsSync(json.path), "file should exist on disk");
    });

    it("OPTIONS returns CORS headers with 204", async () => {
      await boot();
      const res = await request({ port, path: "/", method: "OPTIONS" });
      assert.equal(res.status, 204);
    });

    it("unknown path returns 404", async () => {
      await boot();
      const res = await request({ port, path: "/nope" });
      assert.equal(res.status, 404);
    });

    it("waitForPhoto resolves when photo uploaded", async () => {
      await boot();
      const waitPromise = waitForPhoto(5000);

      const data = Buffer.from("jpegbytes");
      const mp = createMultipartBody("photo", "snap.jpg", data, "image/jpeg");
      await request({
        port,
        path: `/upload?token=${token}`,
        method: "POST",
        headers: { "Content-Type": mp.contentType },
        body: mp.body,
      });

      const result = await waitPromise;
      assert.ok(result, "waitForPhoto should resolve with photo meta");
      assert.ok(result!.filename.endsWith(".jpg"));
    });

    it("waitForPhoto times out and returns null", async () => {
      await boot();
      const result = await waitForPhoto(100);
      assert.equal(result, null);
    });
  });

  // ---- Buffer / race condition -------------------------------------------

  describe("buffer and race conditions", () => {
    it("pendingPhoto buffer works: upload then waitForPhoto", async () => {
      await boot();

      // Upload with no listener waiting
      const data = Buffer.from("buffered");
      const mp = createMultipartBody("photo", "buf.jpg", data, "image/jpeg");
      await request({
        port,
        path: `/upload?token=${token}`,
        method: "POST",
        headers: { "Content-Type": mp.contentType },
        body: mp.body,
      });

      // Now call waitForPhoto — should return immediately from buffer
      const result = await waitForPhoto(1000);
      assert.ok(result, "should return buffered photo immediately");
      assert.ok(result!.filename.endsWith(".jpg"));
    });

    it("stopServer makes isServerRunning return false", async () => {
      await boot();
      assert.equal(isServerRunning(), true);
      stopServer();
      assert.equal(isServerRunning(), false);
    });
  });

  // ---- Performance -------------------------------------------------------

  describe("performance", () => {
    it("large file upload (5 MB) succeeds", { timeout: 10000 }, async () => {
      await boot();
      const data = Buffer.alloc(5 * 1024 * 1024, 0x42);
      const mp = createMultipartBody("photo", "big.jpg", data, "image/jpeg");
      const res = await request({
        port,
        path: `/upload?token=${token}`,
        method: "POST",
        headers: { "Content-Type": mp.contentType },
        body: mp.body,
      });
      assert.equal(res.status, 200);
      const json = JSON.parse(res.body);
      assert.equal(json.size, data.length);
    });

    it("multiple sequential uploads (5 photos) all succeed", { timeout: 10000 }, async () => {
      await boot();
      for (let i = 0; i < 5; i++) {
        const data = Buffer.from(`photo-${i}`);
        const mp = createMultipartBody("photo", `seq-${i}.jpg`, data, "image/jpeg");
        const res = await request({
          port,
          path: `/upload?token=${token}`,
          method: "POST",
          headers: { "Content-Type": mp.contentType },
          body: mp.body,
        });
        assert.equal(res.status, 200, `upload ${i} should succeed`);
        const json = JSON.parse(res.body);
        assert.ok(json.filename, `upload ${i} should return filename`);
      }

      // Verify all 5 files exist on disk
      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".jpg"));
      assert.equal(files.length, 5);
    });
  });
});

describe("sendToPhone", () => {
  afterEach(() => {
    stopServer();
    _resetState();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("sendToPhone returns false when no clients connected", async () => {
    await boot();
    const result = sendToPhone({ text: "hello" });
    assert.equal(result, false);
  });
});

describe("frame endpoint", () => {
  afterEach(() => {
    stopServer();
    _resetState();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("getLatestFrame returns null initially", async () => {
    await boot();
    assert.equal(getLatestFrame(), null);
  });

  it("POST /frame with valid token stores frame", async () => {
    await boot();
    const fakeJpeg = Buffer.from("fake-jpeg-data");
    const res = await request({
      port,
      path: `/frame?token=${token}&w=640&h=480`,
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: fakeJpeg,
    });
    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, true);

    const frame = getLatestFrame();
    assert.ok(frame);
    assert.equal(frame!.width, 640);
    assert.equal(frame!.height, 480);
    assert.equal(frame!.mimeType, "image/jpeg");
  });

  it("POST /frame without token returns 403", async () => {
    await boot();
    const res = await request({
      port,
      path: "/frame",
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: Buffer.from("data"),
    });
    assert.equal(res.status, 403);
  });

  it("POST /mode-switch with voice_message resolves waitForPhoto", async () => {
    await boot();
    const waitPromise = waitForPhoto(5000);

    await request({
      port,
      path: `/mode-switch?token=${token}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: Buffer.from(JSON.stringify({
        action: "voice_message",
        text: "What am I looking at?",
        confidence: 0.92,
      })),
    });

    const result = await waitPromise;
    assert.ok(result);
    assert.ok("action" in result!);
  });
});
