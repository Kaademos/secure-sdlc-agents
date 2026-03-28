import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, homedir } from "path";
import chalk from "chalk";
import { printBanner, printSuccess, printWarn } from "../utils/banner.js";
import { getMcpServerPath } from "../utils/package-root.js";

const SERVER_PATH = getMcpServerPath();

const MCP_CONFIG = {
  "secure-sdlc": {
    command: "node",
    args: [SERVER_PATH],
  },
};

export default async function installMCP(options) {
  const tool = options.tool || "all";

  printBanner();
  console.log(chalk.bold("Secure SDLC MCP Server Installation\n"));
  console.log(chalk.dim(`Server path: ${SERVER_PATH}\n`));

  if (!existsSync(SERVER_PATH)) {
    console.log(chalk.red(`✗ MCP server not found at ${SERVER_PATH}`));
    console.log(chalk.dim("  Run: npm install (from the secure-sdlc package root)"));
    process.exit(1);
  }

  const installers = {
    cursor: installCursor,
    "claude-code": installClaudeCode,
    windsurf: installWindsurf,
  };

  const targets = tool === "all" ? Object.keys(installers) : [tool];

  for (const t of targets) {
    if (installers[t]) {
      await installers[t]();
    } else {
      printWarn(`Unknown tool: ${t}`);
    }
  }

  console.log(chalk.bold("\nAvailable MCP tools after installation:\n"));
  const tools = [
    "sdlc_plan_feature      — ASVS requirements + risk register",
    "sdlc_threat_model      — STRIDE/LINDDUN threat model",
    "sdlc_review_pr         — Security review pull requests",
    "sdlc_review_infra      — IaC security review",
    "sdlc_triage_sast       — Triage SAST findings",
    "sdlc_release_gate      — Pre-release go/no-go gate",
    "sdlc_check_compliance  — Compliance gap analysis",
    "sdlc_security_champion — Quick security Q&A",
    "sdlc_ai_security_review — AI/LLM feature security review",
  ];
  tools.forEach((t) => console.log(chalk.dim(`  • ${t}`)));
}

async function installCursor() {
  console.log(chalk.bold("Installing for Cursor...\n"));

  // Global Cursor MCP config
  const cursorConfigDir = join(homedir(), ".cursor");
  const configPath = join(cursorConfigDir, "mcp.json");

  mkdirSync(cursorConfigDir, { recursive: true });

  let existing = {};
  if (existsSync(configPath)) {
    try {
      existing = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      // ignore parse error
    }
  }

  const updated = {
    ...existing,
    mcpServers: {
      ...(existing.mcpServers || {}),
      ...MCP_CONFIG,
    },
  };

  writeFileSync(configPath, JSON.stringify(updated, null, 2));
  printSuccess(`Cursor global MCP config updated: ${configPath}`);
  console.log(chalk.dim("  Restart Cursor to load the new tools.\n"));
}

async function installClaudeCode() {
  console.log(chalk.bold("Installing for Claude Code...\n"));
  console.log(chalk.dim("Run this command to register the MCP server:\n"));
  console.log(chalk.cyan(`  claude mcp add secure-sdlc -- node ${SERVER_PATH}\n`));
  console.log(chalk.dim("Then verify with:\n"));
  console.log(chalk.cyan("  claude mcp list\n"));
}

async function installWindsurf() {
  console.log(chalk.bold("Installing for Windsurf / Cascade...\n"));

  const windsurfConfigDir = join(homedir(), ".codeium", "windsurf");
  const configPath = join(windsurfConfigDir, "mcp_config.json");

  if (existsSync(windsurfConfigDir)) {
    mkdirSync(windsurfConfigDir, { recursive: true });
    let existing = {};
    if (existsSync(configPath)) {
      try { existing = JSON.parse(readFileSync(configPath, "utf-8")); } catch { /* */ }
    }
    const updated = {
      ...existing,
      mcpServers: { ...(existing.mcpServers || {}), ...MCP_CONFIG },
    };
    writeFileSync(configPath, JSON.stringify(updated, null, 2));
    printSuccess(`Windsurf MCP config updated: ${configPath}`);
  } else {
    console.log(chalk.dim("Windsurf config directory not found. Add this to your Windsurf MCP config manually:\n"));
    console.log(chalk.cyan(JSON.stringify({ mcpServers: MCP_CONFIG }, null, 2)));
  }
}
