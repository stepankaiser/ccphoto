#!/usr/bin/env node

import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import qrcode from "qrcode-terminal";
import { startServer, stopServer } from "./server.js";
import { getLocalIPv4 } from "./network.js";
import { generateToken } from "./token.js";
import { runMcpServer } from "./mcp.js";

const DEFAULT_PORT = 3847;
const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), ".ccphoto", "captures");

function printHelp(): void {
  console.log(`
CCPhoto — Bridge your phone camera to Claude Code

Usage:
  ccphoto --setup       Auto-register as MCP server in Claude Code
  ccphoto --mcp         Run as MCP server (used by Claude Code internally)
  ccphoto               Start standalone camera server with QR code

Options:
  --port <number>       Port number (default: ${DEFAULT_PORT})
  --output-dir <path>   Where to save photos (default: ~/.ccphoto/captures/)
  --help                Show this help

Setup (one time):
  npx ccphoto --setup

Then in Claude Code, say "take a photo" and Claude will handle the rest.
`);
}

function runSetup(): void {
  console.log("\nSetting up CCPhoto as MCP server for Claude Code...\n");

  try {
    execSync(
      `claude mcp add ccphoto -- npx ccphoto --mcp`,
      { stdio: "inherit" },
    );
    console.log("\nCCPhoto MCP server registered successfully!");
    console.log("\nYou can now use CCPhoto in Claude Code:");
    console.log('  Just say "take a photo" or "show me a photo from my phone"');
    console.log("  Claude will handle starting the camera server and showing the QR code.\n");
  } catch {
    console.error("\nFailed to auto-register. You can manually add the MCP server:");
    console.error("  claude mcp add ccphoto -- npx ccphoto --mcp\n");
  }
}

async function runStandalone(port: number, outputDir: string): Promise<void> {
  const host = getLocalIPv4();
  if (!host) {
    console.error("Error: Could not detect local network IP.");
    console.error("Make sure you're connected to WiFi.\n");
    process.exit(1);
  }

  const token = generateToken();
  const cfg = await startServer({ port, outputDir, token, host });
  const url = `http://${cfg.host}:${cfg.port}/?token=${cfg.token}`;

  console.log("");
  console.log("╔══════════════════════════════════════╗");
  console.log("║           CCPhoto Ready              ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("\nScan this QR code with your phone:\n");
  qrcode.generate(url, { small: true }, (code: string) => {
    console.log(code);
  });
  console.log(`\nOr open: ${url}`);
  console.log(`\nPhotos will be saved to: ${cfg.outputDir}`);
  console.log("Press Ctrl+C to stop.\n");

  const shutdown = () => {
    console.log("\nShutting down...");
    stopServer();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function parseArgs(): {
  mode: "help" | "setup" | "mcp" | "standalone";
  port: number;
  outputDir: string;
} {
  const args = process.argv.slice(2);
  let mode: "help" | "setup" | "mcp" | "standalone" = "standalone";
  let port = DEFAULT_PORT;
  let outputDir = process.env.CCPHOTO_DIR || DEFAULT_OUTPUT_DIR;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--help":
      case "-h":
        mode = "help";
        break;
      case "--setup":
        mode = "setup";
        break;
      case "--mcp":
        mode = "mcp";
        break;
      case "--port":
        port = parseInt(args[++i], 10);
        if (isNaN(port)) {
          console.error("Error: --port requires a number");
          process.exit(1);
        }
        break;
      case "--output-dir":
        outputDir = args[++i];
        if (!outputDir) {
          console.error("Error: --output-dir requires a path");
          process.exit(1);
        }
        break;
    }
  }

  return { mode, port, outputDir };
}

const { mode, port, outputDir } = parseArgs();

switch (mode) {
  case "help":
    printHelp();
    break;
  case "setup":
    runSetup();
    break;
  case "mcp":
    runMcpServer().catch((err) => {
      process.stderr.write(`[ccphoto] MCP server error: ${err.message}\n`);
      process.exit(1);
    });
    break;
  case "standalone":
    runStandalone(port, outputDir).catch((err) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
    break;
}
