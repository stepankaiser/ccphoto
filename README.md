# CCPhoto

[![npm version](https://img.shields.io/npm/v/ccphoto)](https://www.npmjs.com/package/ccphoto)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

**Bridge your phone camera to Claude Code over the local network.**

CCPhoto is an MCP server that lets you take photos on your phone and send them
directly to Claude Code. Point your phone at a circuit board, a whiteboard, a
label -- anything -- and Claude sees it instantly. No app install required; your
phone's browser camera does all the work.

```
 +----------+        WiFi        +-----------+       MCP        +-------------+
 |  Phone   |  photos, voice,   |  CCPhoto  |   image/text     |  Claude     |
 |  Camera  |  mode switches    |  Server   |   data            |  Code       |
 |  + Mic   | <--------------- |  (local)  | <--------------- |             |
 +----------+   TTS, guidance   +-----------+   send_to_phone  +-------------+
```

## Quick Start

```bash
npx ccphoto --setup        # One-time: register CCPhoto as an MCP server
```

Then in Claude Code, just say **"take a photo"** -- Claude handles the rest.

## How It Works

1. Claude calls the `capture_photo` MCP tool.
2. A QR code appears in your terminal.
3. Scan it with your phone -- a camera page opens in your browser.
4. Take a photo -- Claude receives the image directly.

No app install needed. The phone's native camera is accessed through the
`<input capture>` HTML attribute.

### Always-On Mode

The server starts on the first `capture_photo` call and stays running for the
entire session. Your phone stays connected -- there is no need to re-scan the
QR code. Take as many photos as you like, and retrieve any of them by asking
Claude.

### Photo Request Notifications

When your phone is already connected and Claude calls `capture_photo` again, the
phone receives an SSE push notification. The capture button pulses to let you
know Claude is waiting for a new photo. Just tap and shoot.

### Bidirectional Messaging

Claude can send content to your phone using the `send_to_phone` tool. Text, markdown,
and images appear in a collapsible panel on the phone. This turns your phone into a
reference screen -- Claude can display wiring instructions, pinout diagrams, or code
snippets while you work with both hands.

### Photo Annotations

After taking a photo, an annotation screen appears where you can draw on the image
before sending it. Use colored pens (red, blue, green, white) to circle components,
draw arrows, or highlight areas of interest. Tap "Send" to upload the annotated
image, or "Skip" to send the original photo without annotations.

### Live Video Assistant

Start a semi-real-time video stream from your phone camera. Claude watches the
live feed (one frame every 3 seconds) and provides guidance in real-time -- point
the camera where Claude asks, and receive instructions on your phone screen.

Requires HTTPS (for camera access). On Android Chrome, accept the certificate
warning once. Currently Android/Chrome only; iOS support planned.

### Voice Interaction

Tap the microphone button on your phone to speak to Claude. Speech is
transcribed using the browser's built-in Speech Recognition API and sent as
text. Claude can respond with spoken audio using `send_to_phone` with
`speak: true` -- the phone speaks the response aloud via Text-to-Speech.

This enables hands-free workflows: ask a question while holding a soldering
iron, and hear the answer without looking at a screen. The mic button
appears only on browsers that support Speech Recognition (Android Chrome).

## Installation

### npx (recommended, no install)

```bash
npx ccphoto --setup
```

### Global install

```bash
npm install -g ccphoto
ccphoto --setup
```

### From source

```bash
git clone https://github.com/stepankaiser/ccphoto.git
cd ccphoto
npm install
npm run build
node dist/index.js --setup
```

If you prefer to register the MCP server manually instead of using `--setup`:

```bash
claude mcp add ccphoto -- npx ccphoto --mcp
```

## MCP Tools Reference

| Tool | Description | Parameters |
|------|-------------|------------|
| `capture_photo` | Start the server and display a QR code. If a phone is already connected, it receives a push notification instead. | -- |
| `wait_for_photo` | Block until a photo is uploaded or the timeout expires. Call this immediately after `capture_photo`. | `timeout_seconds` (optional, default: 120) |
| `get_latest_photo` | Return the most recent photo, or a specific photo by filename. | `filename` (optional) |
| `list_photos` | List all captured photos with filenames, timestamps, and sizes. | -- |
| `send_to_phone` | Send text (markdown) or images to the phone display. The phone becomes a reference screen for instructions, diagrams, or pinouts. | `text` (optional), `image_base64` (optional), `image_mime_type` (optional), `speak` (optional, boolean) |
| `start_livestream` | Start a live video stream from the phone camera. Generates HTTPS certificate and returns QR code. | -- |
| `get_live_frame` | Get the latest frame from the live camera stream with freshness timestamp. | -- |

## Standalone CLI Mode

CCPhoto can also run independently, without Claude Code:

```bash
npx ccphoto                                  # Start with defaults
npx ccphoto --port 4000 --output-dir ./photos  # Custom port and directory
```

A QR code is printed to the terminal. Scan it, take photos, and they are saved
to disk. The server stays running for multiple captures.

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--setup` | Register CCPhoto as an MCP server in Claude Code | -- |
| `--mcp` | Run as an MCP server (used internally by Claude Code) | -- |
| `--port <number>` | HTTP server port | `3847` |
| `--output-dir <path>` | Directory where photos are saved | `~/.ccphoto/captures/` |
| `--help` | Show help | -- |

## Configuration

| Environment Variable | Description | Default |
|----------------------|-------------|---------|
| `CCPHOTO_DIR` | Override the default photo storage directory | `~/.ccphoto/captures/` |

## Security

- **Session token** -- A cryptographically random 32-character hex token is
  generated for each server session. Every request must include the token.
- **Timing-safe comparison** -- Token validation uses `crypto.timingSafeEqual`
  to prevent timing attacks.
- **Local network only** -- The server binds to your local network IP. No data
  leaves your network.
- **No external services** -- Photos are transferred directly between your phone
  and the server over HTTP on your LAN. Nothing is uploaded to the cloud.

## Troubleshooting

### Could not detect local network IP

Make sure your computer is connected to WiFi (not just Ethernet in some
configurations). CCPhoto needs a LAN IP address that your phone can reach.

### QR code does not scan

Try increasing your terminal font size or reducing the terminal width so the QR
code renders at a scannable resolution. You can also copy the URL printed below
the QR code and type it into your phone's browser manually.

### Phone camera does not open

The camera capture feature requires HTTPS on some browsers, but most mobile
browsers allow it on plain HTTP for local network addresses. If your browser
blocks camera access, try using Safari (iOS) or Chrome (Android).

### Upload fails

Verify that your phone and computer are on the same WiFi network. Corporate
networks with client isolation may block device-to-device traffic. Try a
personal hotspot or home network instead.

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Watch mode (recompile on change)
npm test             # Run the test suite (87 tests)
```

Tests use the Node.js built-in test runner and require the `tsx` dev dependency
for TypeScript execution.

Project structure:

```
src/
  index.ts        CLI entry point and arg parsing
  mcp.ts          MCP server with tool definitions
  server.ts       HTTP server, SSE, upload handling
  mobile-page.ts  Self-contained HTML for the phone camera page
  storage.ts      Photo file management
  network.ts      Local IP detection
  token.ts        Session token generation and validation
  types.ts        Shared TypeScript interfaces
```

## Roadmap

- **Real domain + Let's Encrypt certs** -- Use a registered domain with valid
  certificates for zero browser warnings on any device, including iOS Safari.
- **iOS live video support** -- Live video streaming currently works on
  Android/Chrome. iOS Safari support requires trusted certificates.
- **AR overlays on camera feed** -- Draw annotations directly on the live
  camera view in real-time.
- **Multi-camera support** -- Connect multiple phones simultaneously for
  different viewing angles.
- **WebRTC streaming** -- Replace HTTP frame polling with WebRTC when Claude's
  vision processing latency improves.

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch (`git checkout -b my-feature`)
3. Make your changes
4. Run `npm test` to verify nothing is broken
5. Commit your changes (`git commit -m "Add my feature"`)
6. Push to your branch (`git push origin my-feature`)
7. Open a pull request

When reporting a bug, please include your Node.js version, OS, and the steps to
reproduce the issue.

## License

[MIT](LICENSE)
