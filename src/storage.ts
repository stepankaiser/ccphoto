import fs from "node:fs";
import path from "node:path";
import type { PhotoMeta } from "./types.js";

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
]);

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

function mimeFromExt(ext: string): string {
  return MIME_TYPES[ext.toLowerCase()] ?? "application/octet-stream";
}

function formatTimestamp(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${d}-${h}${mi}${s}`;
}

export function ensureOutputDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function savePhoto(
  dir: string,
  originalName: string,
  data: Buffer,
): PhotoMeta {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const timestamp = new Date();
  const base = `photo-${formatTimestamp(timestamp)}`;

  let filename = `${base}${ext}`;
  let absolutePath = path.join(dir, filename);
  let suffix = 0;

  while (fs.existsSync(absolutePath)) {
    suffix++;
    filename = `${base}-${suffix}${ext}`;
    absolutePath = path.join(dir, filename);
  }

  fs.writeFileSync(absolutePath, data);

  return {
    filename,
    absolutePath,
    timestamp,
    sizeBytes: data.length,
    mimeType: mimeFromExt(ext),
  };
}

export function listPhotos(dir: string): PhotoMeta[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir);
  const photos: PhotoMeta[] = [];

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;

    const absolutePath = path.join(dir, entry);
    const stat = fs.statSync(absolutePath);

    if (!stat.isFile()) continue;

    photos.push({
      filename: entry,
      absolutePath,
      timestamp: stat.mtime,
      sizeBytes: stat.size,
      mimeType: mimeFromExt(ext),
    });
  }

  photos.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return photos;
}

export function getLatestPhoto(dir: string): PhotoMeta | null {
  const photos = listPhotos(dir);
  return photos.length > 0 ? photos[0] : null;
}

export function getPhotoByFilename(dir: string, filename: string): PhotoMeta | null {
  const absolutePath = path.join(dir, filename);
  if (!fs.existsSync(absolutePath)) return null;

  const ext = path.extname(filename).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return null;

  const stat = fs.statSync(absolutePath);
  if (!stat.isFile()) return null;

  return {
    filename,
    absolutePath,
    timestamp: stat.mtime,
    sizeBytes: stat.size,
    mimeType: mimeFromExt(ext),
  };
}
