# Agent anatomy — contributor reference

This document describes **how agent files in this repository are structured**, how Claude Code and the MCP server use them, and **how to change or add** agent guidance safely.

For general contribution flow, see [CONTRIBUTING.md](../CONTRIBUTING.md). For distributing agents via Claude Code plugins, see [claude-code-marketplace-submission.md](./claude-code-marketplace-submission.md).

---

## Location and role

| Path | Role |
|------|------|
| `.claude/agents/*.md` | **Claude Code sub-agents** — each file is one specialist persona. Referenced from `.claude-plugin/plugin.json` (`agents` array). |
| `mcp/src/server.js` | **MCP tools** — reads the same files (by agent name) to build prompts for `sdlc_*` tools; strips YAML frontmatter and uses the body. |
| `CLAUDE.md` (repo root) | **Orchestration** — when to invoke which agent, phase gates, artefact paths. |

Agents are **Markdown documents with YAML frontmatter**, not executable code. Changing behaviour means editing prose, lists, and structure — which directly affects model output.

---

## File structure

Every agent file should follow this shape:

```markdown
---
name: agent-id
description: |
  Multi-line description shown to Claude Code for routing.
  Explain when to invoke this agent. Use "Use this agent when:" bullets if helpful.
---

# Human-readable title

Body: instructions, checklists, output formats, references to OWASP ASVS, etc.
```

### Frontmatter fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | Yes | Stable identifier (e.g. `product-manager`). Should match the filename stem: `product-manager.md`. |
| `description` | Yes | **Critical for Claude Code.** The tool uses this to decide *when* to delegate to the agent. Be specific: phases, triggers, inputs. |

Optional frontmatter may appear in some ecosystems; for this repo, **stick to `name` and `description`** unless you have a documented reason to add fields (and you verify Claude Code still accepts the file).

### Body content

- **Clear H1 or title** — matches the persona (e.g. “Product Manager — Secure Requirements Agent”).
- **Primary framework or standard** — e.g. OWASP ASVS chapters for product-manager; STRIDE for appsec-engineer.
- **Concrete output shapes** — Markdown tables, headings for `docs/*.md` artefacts, acceptance criteria patterns.
- **Elicitation questions or checklists** — short, actionable bullets teams can actually answer in a session.
- **Severity / gate language** — align with `secure-sdlc.yaml` and `CLAUDE.md` (CRITICAL/HIGH/MEDIUM/LOW).

Avoid:

- Exhaustive checklists nobody will read end-to-end.
- Duplicating entire standards; **point to** OWASP/NIST/CIS and summarise what matters for this agent.
- Contradicting `CLAUDE.md` or template filenames without updating those too.

---

## How components consume agents

### Claude Code

- Uses **`description`** for automatic or suggested invocation.
- Uses the **full file** (after frontmatter) as the agent system prompt / instructions.

Keep `description` **accurate and trigger-rich**: wrong descriptions cause wrong routing.

### MCP server (`mcp/src/server.js`)

- Resolves `AGENTS_DIR` → `../../.claude/agents` relative to the server.
- `readAgentPrompt(agentName)` reads `.claude/agents/${agentName}.md`, **removes YAML frontmatter**, returns trimmed body.
- Tool handlers prepend a short prefix (“You are operating as the `product-manager` agent…”) and append task-specific instructions.

If you **rename** an agent file, you must update:

1. Filename and `name` in frontmatter.
2. `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` `agents` arrays.
3. Every `readAgentPrompt("...")` / string reference in `mcp/src/server.js`.
4. `CLAUDE.md`, README, and any examples that mention the old name.

---

## Adding a new agent

1. **Design the slice** — One clear responsibility (e.g. “secrets scanning triage” only) beats a second generic AppSec clone.
2. **Create** `.claude/agents/<agent-id>.md` with `name`, `description`, and body per above.
3. **Register** the path in:
   - `.claude-plugin/plugin.json` → `agents`
   - `.claude-plugin/marketplace.json` → same `agents` list under the plugin entry
4. **Wire MCP** — Add a tool in `mcp/src/server.js` only if this persona should be exposed as `sdlc_*` (optional; not every agent needs an MCP tool).
5. **Update orchestration** — `CLAUDE.md`, README agent table, `.cursor/rules/secure-sdlc.mdc` if behaviour should be default in Cursor.
6. **Validate** — `claude plugin validate .` from repo root; smoke-test `--agent` or plugin install.

---

## Editing guidance safely

- **Security content:** Prefer citations (ASVS id, CWE, OWASP category) over vague warnings. If you are unsure, open an issue before asserting exploitability.
- **Breaking changes:** Renaming outputs (`docs/security-requirements.md`) affects CLI `status`, hooks, and CI artefact gates — update all references in the same PR.
- **Tone:** Direct, practitioner-oriented; this repo explicitly rejects “completeness theatre” (see CONTRIBUTING.md).

---

## Related paths

| Topic | Where |
|-------|--------|
| Document templates | `docs/templates/` |
| Worked examples | `examples/` |
| Stack-specific notes | `stacks/*.md` |
| Cursor rules | `.cursor/rules/secure-sdlc.mdc` |

---

*This file is the single place for **agent file anatomy**; keep CONTRIBUTING.md as the short pointer and link here for depth.*
