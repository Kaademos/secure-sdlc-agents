// CLI smoke tests: the binary must start, report the right version, and list
// its commands. Requires installed dependencies; skipped automatically when
// node_modules is absent (e.g. a docs-only checkout).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(ROOT, "cli", "bin", "secure-sdlc.js");
const commandsDir = join(ROOT, "cli", "src", "commands");
const depsInstalled = existsSync(join(ROOT, "node_modules", "commander"));

const run = (args, opts = {}) => execFileSync("node", [bin, ...args], { encoding: "utf-8", ...opts });

test("CLI --version matches package.json", { skip: !depsInstalled && "deps not installed" }, () => {
  const { version } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  assert.equal(run(["--version"]).trim(), version);
});

test("CLI --help lists the core commands", { skip: !depsInstalled && "deps not installed" }, () => {
  const help = run(["--help"]);
  for (const cmd of ["init", "kickoff", "status", "gate", "review", "install-mcp", "paths"]) {
    assert.match(help, new RegExp(`\\b${cmd}\\b`), `--help should list "${cmd}"`);
  }
});

// Regression guard for the install-mcp crash (v1.3.1): a bad top-level import
// (`homedir` from "path" instead of "os") only throws once Node loads the module,
// so `--help` alone never caught it — the module is lazy-loaded by the command
// action, not at CLI startup. Every command module must import cleanly on its own.
test(
  "every command module imports without throwing",
  { skip: !depsInstalled && "deps not installed" },
  async () => {
    for (const file of readdirSync(commandsDir)) {
      if (!file.endsWith(".js")) continue;
      await assert.doesNotReject(
        () => import(join(commandsDir, file)),
        `${file} should import without throwing`
      );
    }
  }
);

// Regression guard for the install-mcp crash end-to-end: actually run each tool
// target with an isolated HOME so it can't touch the real machine's ~/.cursor
// or ~/.codeium config.
test(
  "install-mcp runs for every tool target without crashing",
  { skip: !depsInstalled && "deps not installed" },
  () => {
    const fakeHome = mkdtempSync(join(tmpdir(), "secure-sdlc-home-"));
    try {
      for (const tool of ["cursor", "claude-code", "windsurf", "all"]) {
        assert.doesNotThrow(
          () => run(["install-mcp", "--tool", tool], { env: { ...process.env, HOME: fakeHome } }),
          `install-mcp --tool ${tool} should not throw`
        );
      }
    } finally {
      rmSync(fakeHome, { recursive: true, force: true });
    }
  }
);

// Regression guard for the release-artefact filename mismatch (v1.3.1): `init`
// copies docs/templates/*.md verbatim by filename, while `status` (and the git
// hooks) check for a hardcoded set of artefact paths. If a template's filename
// ever drifts from the path status.js expects, RELEASE (or any phase) silently
// never completes even after the doc is filled in. Run a real `init` end-to-end
// and assert every artefact status.js checks for actually exists on disk.
test(
  "init scaffolds every artefact path that status checks for",
  { skip: !depsInstalled && "deps not installed" },
  async () => {
    const { PHASE_ARTEFACTS } = await import(join(commandsDir, "status.js"));
    const projectDir = mkdtempSync(join(tmpdir(), "secure-sdlc-init-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: projectDir });
      run(["init"], { cwd: projectDir });

      for (const files of Object.values(PHASE_ARTEFACTS)) {
        for (const rel of files) {
          assert.ok(
            existsSync(join(projectDir, rel)),
            `init should create ${rel} (checked by \`secure-sdlc status\`)`
          );
        }
      }
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  }
);

// Regression guard for the onboarding gap (v1.3.1): `init` printed
// `claude --agent product-manager ...` as the very next step, but never copied
// .claude/agents/ into the project. Claude Code does not error on an unknown
// --agent name — it silently runs as a generic session — so the gap was
// invisible until you actually invoked the agent and compared the output.
test(
  "init copies .claude/agents/ and CLAUDE.md by default",
  { skip: !depsInstalled && "deps not installed" },
  () => {
    const projectDir = mkdtempSync(join(tmpdir(), "secure-sdlc-init-agents-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: projectDir });
      run(["init"], { cwd: projectDir });

      const agentsDir = join(ROOT, ".claude", "agents");
      for (const file of readdirSync(agentsDir)) {
        assert.ok(
          existsSync(join(projectDir, ".claude", "agents", file)),
          `init should copy .claude/agents/${file}`
        );
      }
      assert.ok(existsSync(join(projectDir, "CLAUDE.md")), "init should copy CLAUDE.md");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  }
);

test(
  "init --skip-agents skips .claude/agents/ and CLAUDE.md",
  { skip: !depsInstalled && "deps not installed" },
  () => {
    const projectDir = mkdtempSync(join(tmpdir(), "secure-sdlc-init-skip-agents-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: projectDir });
      run(["init", "--skip-agents"], { cwd: projectDir });

      assert.ok(!existsSync(join(projectDir, ".claude")), "--skip-agents should skip .claude/");
      assert.ok(!existsSync(join(projectDir, "CLAUDE.md")), "--skip-agents should skip CLAUDE.md");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  }
);

// Regression guard for the MCP server's hardcoded serverInfo.version (v1.3.1):
// it was a literal "1.0.0" string, independent of mcp/package.json, so a future
// bump to mcp/package.json would silently drift from what the protocol reports.
test("MCP server reports the version declared in mcp/package.json", { skip: !depsInstalled && "deps not installed" }, () => {
  const { version } = JSON.parse(readFileSync(join(ROOT, "mcp", "package.json"), "utf-8"));
  const req = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } },
  });
  const out = execFileSync("node", [join(ROOT, "mcp", "src", "server.js")], {
    input: req + "\n",
    encoding: "utf-8",
  });
  const response = JSON.parse(out.trim().split("\n")[0]);
  assert.equal(response.result.serverInfo.version, version);
});
