// Metadata guards: the version must be identical across every manifest that
// declares it, and every JSON file we ship must parse. A version drift between
// package.json and the plugin manifests is a common, silent release bug.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJSON = (rel) => JSON.parse(readFileSync(join(ROOT, rel), "utf-8"));

test("version is identical across package.json and plugin manifests", () => {
  const pkg = readJSON("package.json");
  const plugin = readJSON(".claude-plugin/plugin.json");
  const market = readJSON(".claude-plugin/marketplace.json");

  assert.match(pkg.version, /^\d+\.\d+\.\d+$/, "package.json version must be semver");
  assert.equal(plugin.version, pkg.version, "plugin.json version must match package.json");
  assert.equal(
    market.metadata.version,
    pkg.version,
    "marketplace.json metadata.version must match package.json"
  );
  assert.equal(
    market.plugins[0].version,
    pkg.version,
    "marketplace.json plugins[0].version must match package.json"
  );
});

test("every shipped JSON manifest parses", () => {
  const jsonFiles = [
    "package.json",
    "package-lock.json",
    ".claude-plugin/plugin.json",
    ".claude-plugin/marketplace.json",
    "mcp/package.json",
  ];
  for (const rel of jsonFiles) {
    if (!existsSync(join(ROOT, rel))) continue; // lockfile may be absent in some checkouts
    assert.doesNotThrow(() => readJSON(rel), `${rel} must be valid JSON`);
  }
});

test("package.json declares the files needed to ship the agents and profiles", () => {
  const pkg = readJSON("package.json");
  for (const required of [".claude/agents", "stacks", "cli/bin", "cli/src"]) {
    assert.ok(
      pkg.files.includes(required),
      `package.json "files" must include ${required} so npm publishes it`
    );
  }
});
