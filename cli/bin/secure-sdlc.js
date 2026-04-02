#!/usr/bin/env node
import { program } from "commander";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// package.json lives at repository / npm package root (two levels above cli/bin)
const { version } = require(join(__dirname, "../../package.json"));

// Lazy-load commands to keep startup fast
async function loadCommand(name) {
  const mod = await import(`../src/commands/${name}.js`);
  return mod.default;
}

program
  .name("secure-sdlc")
  .description(
    "Secure SDLC agent team — bring security specialists into any AI-assisted workflow"
  )
  .version(version);

program
  .command("init")
  .description("Scaffold the Secure SDLC structure in your project")
  .option("-p, --path <path>", "Project root path (defaults to current directory)", process.cwd())
  .option("-s, --stack <stack>", "Technology stack (e.g. 'nextjs', 'django', 'fastapi')")
  .option("--skip-hooks", "Skip installing git hooks")
  .option("--skip-ci", "Skip generating GitHub Actions workflow")
  .option("--cursor", "Generate Cursor MCP config and rules")
  .action(async (options) => {
    const run = await loadCommand("init");
    await run(options);
  });

program
  .command("kickoff")
  .description("Interactive wizard to start a new feature with full Secure SDLC coverage")
  .option("-p, --path <path>", "Project root path", process.cwd())
  .action(async (options) => {
    const run = await loadCommand("kickoff");
    await run(options);
  });

program
  .command("review")
  .description("Run a security review on a file, diff, or PR")
  .argument("[target]", "File path, diff file, or PR number to review")
  .option("--type <type>", "Review type: code|infra|deps|sast", "code")
  .option("-p, --path <path>", "Project root path", process.cwd())
  .option("-s, --stack <stack>", "Technology stack (e.g. Next.js + TypeScript)")
  .action(async (target, options) => {
    const run = await loadCommand("review");
    await run(target, options);
  });

program
  .command("gate")
  .description("Run the pre-release security gate (go/no-go)")
  .argument("<version>", "Release version (e.g. v1.2.0)")
  .option("-p, --path <path>", "Project root / docs path", process.cwd())
  .action(async (version, options) => {
    const run = await loadCommand("gate");
    await run(version, options);
  });

program
  .command("status")
  .description("Show current SDLC phase and which artefacts are present/missing")
  .option("-p, --path <path>", "Project root path", process.cwd())
  .action(async (options) => {
    const run = await loadCommand("status");
    await run(options);
  });

program
  .command("install-mcp")
  .description("Install the Secure SDLC MCP server for your AI tool")
  .option("--tool <tool>", "Target tool: cursor|claude-code|windsurf|all", "all")
  .action(async (options) => {
    const run = await loadCommand("install-mcp");
    await run(options);
  });

program
  .command("paths")
  .description("Print package root and MCP server path (for Cursor / MCP config after global install)")
  .action(async () => {
    const run = await loadCommand("paths");
    await run();
  });

program.parse();
