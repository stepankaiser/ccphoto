import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateToken, validateToken } from "./token.js";

describe("generateToken", () => {
  it("returns a 32-char hex string", () => {
    const token = generateToken();
    assert.equal(token.length, 32);
    assert.match(token, /^[0-9a-f]{32}$/);
  });

  it("produces unique values on successive calls", () => {
    const a = generateToken();
    const b = generateToken();
    assert.notEqual(a, b);
  });
});

describe("validateToken", () => {
  it("accepts correct token", () => {
    const token = generateToken();
    assert.equal(validateToken(token, token), true);
  });

  it("rejects wrong token", () => {
    const a = generateToken();
    const b = generateToken();
    assert.equal(validateToken(a, b), false);
  });

  it("rejects empty string vs valid token", () => {
    const token = generateToken();
    assert.equal(validateToken("", token), false);
  });

  it("rejects different-length string", () => {
    const token = generateToken();
    assert.equal(validateToken("short", token), false);
  });

  it("rejects equal-length but wrong token", () => {
    const token = generateToken();
    const wrong = "a".repeat(token.length);
    assert.equal(validateToken(wrong, token), false);
  });
});
