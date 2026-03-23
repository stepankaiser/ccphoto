import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderMobilePage } from "./mobile-page.js";

describe("renderMobilePage", () => {
  const token = "test-token-abc123";
  const html = renderMobilePage(token);

  it("returns valid HTML", () => {
    assert.ok(html.startsWith("<!DOCTYPE html>"));
    assert.ok(html.includes("</html>"));
  });

  it("embeds token correctly", () => {
    assert.ok(html.includes(JSON.stringify(token)));
  });

  it("derives URLs from window.location.origin", () => {
    assert.ok(html.includes("window.location.origin"));
    assert.ok(html.includes("origin + '/upload'"));
    assert.ok(html.includes("origin + '/frame'"));
    assert.ok(html.includes("origin + '/events'"));
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

  // ---- Mode Toggle --------------------------------------------------------

  it("contains mode toggle pill", () => {
    assert.ok(html.includes("mode-toggle"));
    assert.ok(html.includes("mode-photo-btn"));
    assert.ok(html.includes("mode-live-btn"));
  });

  it("contains photo view and live view sections", () => {
    assert.ok(html.includes('id="photo-view"'));
    assert.ok(html.includes('id="live-view"'));
  });

  // ---- Toast System -------------------------------------------------------

  it("contains toast container", () => {
    assert.ok(html.includes("toast-container"));
  });

  it("contains content-push SSE event listener", () => {
    assert.ok(html.includes("content-push"));
  });

  it("contains renderBasicMarkdown function", () => {
    assert.ok(html.includes("renderBasicMarkdown"));
  });

  // ---- History Panel ------------------------------------------------------

  it("contains history button", () => {
    assert.ok(html.includes("history-btn"));
  });

  it("contains history panel logic", () => {
    assert.ok(html.includes("history-panel"));
    assert.ok(html.includes("messageHistory"));
  });

  // ---- Annotations -------------------------------------------------------

  it("contains annotation screen styles", () => {
    assert.ok(html.includes("annotation-screen"));
  });

  it("contains annotation toolbar", () => {
    assert.ok(html.includes("annotation-toolbar"));
  });

  it("contains drawing color options", () => {
    assert.ok(html.includes("#ff0000"));
  });

  it("contains send and cancel buttons", () => {
    assert.ok(html.includes("Send"));
    assert.ok(html.includes("Cancel"));
  });

  it("contains annotate and resend button", () => {
    assert.ok(html.includes("annotate-resend-btn"));
    assert.ok(html.includes("Annotate"));
  });

  // ---- Live Mode -----------------------------------------------------------

  it("contains video element for live mode", () => {
    assert.ok(html.includes('id="live-video"'));
  });

  it("contains frame canvas", () => {
    assert.ok(html.includes('id="frame-canvas"'));
  });

  it("includes getUserMedia call", () => {
    assert.ok(html.includes("getUserMedia"));
  });

  it("includes LIVE badge", () => {
    assert.ok(html.includes("LIVE"));
    assert.ok(html.includes("live-badge"));
    assert.ok(html.includes("live-dot"));
  });

  it("includes streaming indicator with animated dots", () => {
    assert.ok(html.includes("streaming-indicator"));
    assert.ok(html.includes("streaming-dots"));
  });

  it("includes stop button", () => {
    assert.ok(html.includes("stop-btn"));
    assert.ok(html.includes("Stop Streaming"));
  });

  // ---- SSE Events ----------------------------------------------------------

  it("handles photo-requested event", () => {
    assert.ok(html.includes("photo-requested"));
  });

  it("handles switch-to-live event", () => {
    assert.ok(html.includes("switch-to-live"));
  });

  it("contains clearRequestState function", () => {
    assert.ok(html.includes("clearRequestState"));
  });

  // ---- Voice ---------------------------------------------------------------

  it("contains voice button", () => {
    assert.ok(html.includes("voice-btn"));
    assert.ok(html.includes('aria-label="Voice message"'));
  });

  it("contains SpeechRecognition feature detection", () => {
    assert.ok(html.includes("webkitSpeechRecognition"));
  });

  it("contains voice status element", () => {
    assert.ok(html.includes("voice-status"));
  });

  it("posts voice_message to mode-switch", () => {
    assert.ok(html.includes("voice_message"));
  });

  it("contains speechSynthesis for TTS", () => {
    assert.ok(html.includes("speechSynthesis"));
    assert.ok(html.includes("SpeechSynthesisUtterance"));
  });

  it("hides voice button when unsupported", () => {
    assert.ok(html.includes('class="voice-btn hidden"'));
  });

  it("contains voice pulse animation", () => {
    assert.ok(html.includes("voicePulse"));
  });

  it("contains microphone SVG icon", () => {
    assert.ok(html.includes("<svg"));
    assert.ok(html.includes("M12 1a3 3"));
  });

  // ---- JSON Render UI -------------------------------------------------------

  it("contains render panel", () => {
    assert.ok(html.includes('id="render-panel"'));
    assert.ok(html.includes('id="render-content"'));
    assert.ok(html.includes('id="render-close"'));
  });

  it("contains COMPONENT_RENDERERS with all 12 types", () => {
    assert.ok(html.includes("COMPONENT_RENDERERS"));
    const types = ["Card", "Text", "Image", "Metric", "MetricGrid", "Checklist", "StepByStep", "Alert", "Table", "Timer", "Badge", "Divider"];
    for (const t of types) {
      assert.ok(html.includes(t + ":"), `Missing component: ${t}`);
    }
  });

  it("contains renderUISpec function", () => {
    assert.ok(html.includes("renderUISpec"));
  });

  it("contains emitUIAction function", () => {
    assert.ok(html.includes("emitUIAction"));
  });

  it("routes uiSpec to renderer in content-push handler", () => {
    assert.ok(html.includes("data.uiSpec"));
    assert.ok(html.includes("renderUISpec(data.uiSpec)"));
  });

  it("contains timer with start/pause/done states", () => {
    assert.ok(html.includes("jr-timer"));
    assert.ok(html.includes("timer_complete"));
  });

  it("contains checklist with toggle interaction", () => {
    assert.ok(html.includes("jr-checklist"));
    assert.ok(html.includes("checklist_toggle"));
  });
});
