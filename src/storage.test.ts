import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ensureOutputDir,
  savePhoto,
  listPhotos,
  getLatestPhoto,
  getPhotoByFilename,
} from "./storage.js";

describe("storage", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccphoto-test-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // 1
  it("ensureOutputDir creates directory recursively", () => {
    const nested = path.join(dir, "a", "b", "c");
    ensureOutputDir(nested);
    assert.ok(fs.existsSync(nested));
    assert.ok(fs.statSync(nested).isDirectory());
  });

  // 2
  it("ensureOutputDir is idempotent", () => {
    const nested = path.join(dir, "a", "b");
    ensureOutputDir(nested);
    ensureOutputDir(nested);
    assert.ok(fs.existsSync(nested));
  });

  // 3
  it("savePhoto saves file with timestamp naming", () => {
    const data = Buffer.from("fake-png-data");
    const meta = savePhoto(dir, "shot.png", data);

    assert.ok(fs.existsSync(meta.absolutePath));
    assert.ok(meta.filename.startsWith("photo-"));
    assert.ok(meta.filename.endsWith(".png"));
  });

  // 4
  it("savePhoto returns correct PhotoMeta", () => {
    const data = Buffer.from("fake-jpeg-data");
    const meta = savePhoto(dir, "camera.jpg", data);

    assert.equal(typeof meta.filename, "string");
    assert.equal(meta.absolutePath, path.join(dir, meta.filename));
    assert.ok(meta.timestamp instanceof Date);
    assert.equal(meta.sizeBytes, data.length);
    assert.equal(meta.mimeType, "image/jpeg");
  });

  // 5
  it("savePhoto handles filename collisions with suffix", () => {
    const data = Buffer.from("a");
    const first = savePhoto(dir, "img.jpg", data);
    // Ensure collision by writing a second photo within the same second
    const second = savePhoto(dir, "img.jpg", data);

    assert.notEqual(first.filename, second.filename);
    assert.match(second.filename, /-1\.jpg$/);
  });

  // 6
  it("savePhoto uses .jpg default when no extension", () => {
    const data = Buffer.from("no-ext");
    const meta = savePhoto(dir, "image", data);

    assert.ok(meta.filename.endsWith(".jpg"));
    assert.equal(meta.mimeType, "image/jpeg");
  });

  // 7
  it("listPhotos returns sorted by newest first", async () => {
    const data = Buffer.from("x");
    savePhoto(dir, "a.png", data);
    // Small delay so mtime differs
    await new Promise((r) => setTimeout(r, 50));
    const second = savePhoto(dir, "b.png", data);

    const list = listPhotos(dir);
    assert.equal(list.length, 2);
    assert.equal(list[0].filename, second.filename);
  });

  // 8
  it("listPhotos filters non-image files", () => {
    fs.writeFileSync(path.join(dir, "notes.txt"), "hello");
    savePhoto(dir, "pic.jpg", Buffer.from("img"));

    const list = listPhotos(dir);
    assert.equal(list.length, 1);
    assert.ok(list[0].filename.endsWith(".jpg"));
  });

  // 9
  it("listPhotos returns empty for non-existent dir", () => {
    const missing = path.join(dir, "nope");
    const list = listPhotos(missing);
    assert.deepEqual(list, []);
  });

  // 10
  it("getLatestPhoto returns newest", async () => {
    const data = Buffer.from("x");
    savePhoto(dir, "old.png", data);
    await new Promise((r) => setTimeout(r, 50));
    const newer = savePhoto(dir, "new.png", data);

    const latest = getLatestPhoto(dir);
    assert.ok(latest);
    assert.equal(latest.filename, newer.filename);
  });

  // 11
  it("getLatestPhoto returns null when empty", () => {
    const result = getLatestPhoto(dir);
    assert.equal(result, null);
  });

  // 12
  it("getPhotoByFilename returns correct photo", () => {
    const data = Buffer.from("hello-photo");
    const saved = savePhoto(dir, "cam.png", data);

    const found = getPhotoByFilename(dir, saved.filename);
    assert.ok(found);
    assert.equal(found.filename, saved.filename);
    assert.equal(found.sizeBytes, data.length);
    assert.equal(found.mimeType, "image/png");
  });

  // 13
  it("getPhotoByFilename returns null for non-existent file", () => {
    const result = getPhotoByFilename(dir, "does-not-exist.jpg");
    assert.equal(result, null);
  });

  // 14
  it("getPhotoByFilename rejects non-image extensions", () => {
    fs.writeFileSync(path.join(dir, "data.txt"), "not an image");
    const result = getPhotoByFilename(dir, "data.txt");
    assert.equal(result, null);
  });
});
