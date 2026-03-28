#!/bin/bash
# AI Eye — Plug-and-play launcher for CCPhoto + Android phone
#
# Usage: ./ai-eye.sh
#
# What it does:
# 1. Checks for connected Android device (USB)
# 2. Sets up ADB reverse port forwarding (phone → laptop over USB)
# 3. Starts CCPhoto server
# 4. Auto-launches Chrome on the phone with the CCPhoto URL
#
# The phone just needs to be plugged in. That's it.

set -e

PORT=3847
HTTPS_PORT=3848

echo ""
echo "╔══════════════════════════════════════╗"
echo "║          AI Eye — Starting           ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Step 1: Check ADB device
echo "[1/4] Checking for connected phone..."
DEVICE=$(adb devices | grep -w "device" | head -1 | cut -f1)
if [ -z "$DEVICE" ]; then
  echo "  ✗ No phone connected. Plug in the AI Eye device via USB."
  echo "  Make sure USB debugging is enabled."
  exit 1
fi
PHONE_MODEL=$(adb shell getprop ro.product.model 2>/dev/null | tr -d '\r')
echo "  ✓ Found: $PHONE_MODEL ($DEVICE)"

# Step 2: Set up ADB reverse port forwarding
echo ""
echo "[2/4] Setting up USB tunnel..."
adb reverse tcp:$PORT tcp:$PORT 2>/dev/null
adb reverse tcp:$HTTPS_PORT tcp:$HTTPS_PORT 2>/dev/null
echo "  ✓ Port $PORT (HTTP) → phone localhost"
echo "  ✓ Port $HTTPS_PORT (HTTPS) → phone localhost"

# Step 3: Start CCPhoto MCP server in background
echo ""
echo "[3/4] Starting CCPhoto server..."
echo "  (Running as MCP server on port $PORT)"

# Step 4: Launch Chrome on the phone
echo ""
echo "[4/4] Launching AI Eye on phone..."

# Wait a moment for the server to start, then launch Chrome
(
  sleep 3
  # The token will be in the QR output — for now launch the base URL
  # The phone will show the page once the server is ready
  adb shell am start -a android.intent.action.VIEW \
    -d "http://localhost:$PORT" \
    -n com.android.chrome/com.google.android.apps.chrome.Main 2>/dev/null

  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║        AI Eye is READY               ║"
  echo "║                                      ║"
  echo "║  Phone: $PHONE_MODEL"
  echo "║  Connection: USB (localhost:$PORT)    ║"
  echo "║                                      ║"
  echo "║  Say 'take a photo' in Claude Code   ║"
  echo "╚══════════════════════════════════════╝"
  echo ""
) &

# Run CCPhoto MCP server (this blocks — Claude Code connects to stdin/stdout)
exec node "$(dirname "$0")/dist/index.js" --mcp
