# CCPhoto

Phone camera bridge for Claude Code — MCP server + standalone CLI.

## Build & Run

```bash
npm run build        # Compile TypeScript
npm test             # Run tests (48 tests, requires tsx)
node dist/index.js   # Run standalone server
node dist/index.js --mcp   # Run as MCP server
```

## Architecture

- `src/index.ts` — CLI entry point, arg parsing
- `src/mcp.ts` — MCP server with 5 tools (capture_photo, wait_for_photo, get_latest_photo, list_photos, send_to_phone)
- `src/server.ts` — HTTP server (serves mobile page, handles uploads, SSE push)
- `src/mobile-page.ts` — Self-contained HTML for phone camera capture, annotation canvas, content display
- `src/storage.ts` — Photo file management (save, list, get latest, get by filename)
- `src/network.ts` — Local IP detection
- `src/token.ts` — Session token generation/validation
- `src/types.ts` — Shared interfaces

## Tests

Tests use Node.js built-in test runner with `tsx` for TypeScript execution.
Co-located with source: `src/*.test.ts`. Run with `npm test`.

- `token.test.ts` — Token generation, validation, timing-safe comparison
- `storage.test.ts` — File save, list, collision handling, filtering
- `network.test.ts` — IPv4 detection contract
- `mobile-page.test.ts` — HTML rendering, element presence, token embedding
- `server.test.ts` — HTTP endpoints, auth, uploads, waitForPhoto, CORS, performance

## Key Patterns

- MCP server uses stderr for terminal output (stdout is JSON-RPC)
- `waitForPhoto()` in server.ts provides Promise-based listener for MCP tool blocking
- `pendingPhoto` buffer handles race condition where photo arrives before listener registers
- Server starts lazily on first `capture_photo` call, stays running for session
- SSE endpoint (`/events`) pushes `photo-requested` events to connected phones
- `get_latest_photo` accepts optional `filename` param to retrieve specific photos
- Photos stored in `~/.ccphoto/captures/` by default (or CCPHOTO_DIR env var)
- Mobile page is a self-contained HTML string (no static files)
- `sendToPhone()` broadcasts content-push SSE events for bidirectional messaging
- Annotation canvas composites drawings onto photos client-side before upload
