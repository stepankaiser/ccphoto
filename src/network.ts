import os from "node:os";

const PREFERRED_INTERFACES = ["en0", "wlan0", "Wi-Fi"];

export function getLocalIPv4(): string | null {
  const interfaces = os.networkInterfaces();

  let fallback: string | null = null;

  for (const name of PREFERRED_INTERFACES) {
    const addrs = interfaces[name];
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }

  for (const [, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        fallback = addr.address;
        break;
      }
    }
    if (fallback) break;
  }

  return fallback;
}
