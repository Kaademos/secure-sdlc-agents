// Agent guards: every sub-agent file must have valid frontmatter, and the
// roster advertised in the README / CLAUDE.md must actually exist on disk.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const agentsDir = join(ROOT, ".claude", "agents");

const EXPECTED_AGENTS = [
  "product-manager",
  "grc-analyst",
  "appsec-engineer",
  "cloud-platform-engineer",
  "dev-lead",
  "release-manager",
  "security-champion",
  "ai-security-engineer",
];

function frontmatter(body) {
  const m = body.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  // name: is a simple scalar; description: may be block scalar — we only need presence.
  const nameMatch = m[1].match(/^name:\s*(.+)$/m);
  if (nameMatch) fm.name = nameMatch[1].trim();
  fm.hasDescription = /^description:/m.test(m[1]);
  return fm;
}

test("all 8 roster agents exist as files", () => {
  const present = readdirSync(agentsDir).filter((f) => f.endsWith(".md")).map((f) => basename(f, ".md"));
  for (const a of EXPECTED_AGENTS) {
    assert.ok(present.includes(a), `agent file .claude/agents/${a}.md is missing`);
  }
  assert.equal(present.length, EXPECTED_AGENTS.length, "unexpected number of agent files");
});

test("each agent has valid frontmatter with matching name and a description", () => {
  for (const f of readdirSync(agentsDir).filter((f) => f.endsWith(".md"))) {
    const fm = frontmatter(readFileSync(join(agentsDir, f), "utf-8"));
    assert.ok(fm, `${f} is missing YAML frontmatter`);
    assert.ok(fm.name, `${f} frontmatter is missing 'name'`);
    assert.equal(fm.name, basename(f, ".md"), `${f} frontmatter name must match filename`);
    assert.ok(fm.hasDescription, `${f} frontmatter is missing 'description'`);
  }
});
