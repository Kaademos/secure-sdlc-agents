// CLI smoke tests: the binary must start, report the right version, and list
// its commands. Requires installed dependencies; skipped automatically when
// node_modules is absent (e.g. a docs-only checkout).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(ROOT, "cli", "bin", "secure-sdlc.js");
const depsInstalled = existsSync(join(ROOT, "node_modules", "commander"));

const run = (args) => execFileSync("node", [bin, ...args], { encoding: "utf-8" });

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
