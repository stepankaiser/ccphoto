import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

// We test the cert generation by calling the module functions with a custom certs dir
// Since cert.ts uses a hardcoded CERTS_DIR, we'll test the generated cert properties directly
import { ensureCerts, certsExist, areCertsValid } from "./cert.js";

describe("cert", () => {
  // Note: ensureCerts writes to ~/.ccphoto/certs/ which is shared state
  // These tests verify the cert generation works correctly

  it("ensureCerts generates valid PEM strings", async () => {
    const certs = await ensureCerts("127.0.0.1");
    assert.ok(certs.key.includes("-----BEGIN"));
    assert.ok(certs.cert.includes("-----BEGIN CERTIFICATE-----"));
  });

  it("generated cert has correct SAN", async () => {
    const certs = await ensureCerts("127.0.0.1");
    const x509 = new crypto.X509Certificate(certs.cert);
    const san = x509.subjectAltName ?? "";
    assert.ok(san.includes("127.0.0.1"));
  });

  it("certsExist returns true after generation", async () => {
    await ensureCerts("127.0.0.1");
    assert.ok(certsExist());
  });

  it("areCertsValid returns true for matching IP", async () => {
    await ensureCerts("127.0.0.1");
    assert.ok(areCertsValid("127.0.0.1"));
  });

  it("areCertsValid returns false for different IP", async () => {
    await ensureCerts("127.0.0.1");
    assert.equal(areCertsValid("10.0.0.1"), false);
  });
});
