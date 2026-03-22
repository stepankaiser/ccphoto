import crypto from "node:crypto";

export function generateToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function validateToken(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) {
    return false;
  }

  const a = Buffer.from(provided, "utf-8");
  const b = Buffer.from(expected, "utf-8");

  return crypto.timingSafeEqual(a, b);
}
