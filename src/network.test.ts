import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getLocalIPv4 } from "./network.js";

describe("getLocalIPv4", () => {
  const ip = getLocalIPv4();

  it("returns a string or null", () => {
    assert.ok(ip === null || typeof ip === "string");
  });

  it("matches valid IPv4 format if non-null", () => {
    if (ip === null) return;
    assert.match(ip, /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
  });

  it("is not the loopback address if non-null", () => {
    if (ip === null) return;
    assert.notEqual(ip, "127.0.0.1");
  });
});
