import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { generate } from "selfsigned";
import type { CertPems } from "./types.js";

const CERTS_DIR = path.join(os.homedir(), ".ccphoto", "certs");

function ensureCertsDir(): void {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}

function certPaths(): { keyPath: string; certPath: string } {
  return {
    keyPath: path.join(CERTS_DIR, "server.key"),
    certPath: path.join(CERTS_DIR, "server.crt"),
  };
}

export function certsExist(): boolean {
  const { keyPath, certPath } = certPaths();
  return fs.existsSync(keyPath) && fs.existsSync(certPath);
}

export function areCertsValid(host: string): boolean {
  if (!certsExist()) return false;
  try {
    const { certPath } = certPaths();
    const pem = fs.readFileSync(certPath, "utf-8");
    const cert = new crypto.X509Certificate(pem);
    // Check not expired
    if (new Date(cert.validTo) < new Date()) return false;
    // Check IP matches (SAN contains the host)
    const san = cert.subjectAltName ?? "";
    if (!san.includes(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function loadCerts(): CertPems {
  const { keyPath, certPath } = certPaths();
  return {
    key: fs.readFileSync(keyPath, "utf-8"),
    cert: fs.readFileSync(certPath, "utf-8"),
  };
}

export async function generateCerts(host: string): Promise<CertPems> {
  ensureCertsDir();
  const attrs = [{ name: "commonName", value: "CCPhoto" }];
  const notAfterDate = new Date();
  notAfterDate.setFullYear(notAfterDate.getFullYear() + 1);
  const pems = await generate(attrs, {
    keySize: 2048,
    notAfterDate,
    extensions: [
      { name: "subjectAltName", altNames: [{ type: 7, ip: host }] },
    ],
  });
  const { keyPath, certPath } = certPaths();
  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);
  return { key: pems.private, cert: pems.cert };
}

export async function ensureCerts(host: string): Promise<CertPems> {
  if (areCertsValid(host)) {
    return loadCerts();
  }
  return generateCerts(host);
}
