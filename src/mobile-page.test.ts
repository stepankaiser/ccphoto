import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderMobilePage } from "./mobile-page.js";

describe("renderMobilePage", () => {
  const token = "test-token-abc123";
  const uploadUrl = "http://192.168.1.5:3847/upload";
  const html = renderMobilePage(token, uploadUrl);

  it("returns valid HTML", () => {
    assert.ok(html.startsWith("<!DOCTYPE html>"));
    assert.ok(html.includes("</html>"));
  });

  it("embeds token correctly", () => {
    assert.ok(html.includes(JSON.stringify(token)));
  });

  it("embeds upload URL correctly", () => {
    assert.ok(html.includes(uploadUrl));
  });

  it("contains required UI elements", () => {
    assert.ok(html.includes("take-photo-btn"));
    assert.ok(html.includes("file-input"));
    assert.ok(html.includes("photo-count"));
  });

  it("contains file input with capture attribute", () => {
    assert.ok(html.includes('capture="environment"'));
    assert.ok(html.includes('accept="image/*"'));
  });

  it("contains photo count display logic", () => {
    assert.ok(html.includes("updateCount"));
  });

  it("contains SSE EventSource setup", () => {
    assert.ok(html.includes("EventSource"));
  });
});
