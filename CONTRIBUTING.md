# Contributing to Secure SDLC Agents

Thank you for helping improve this project. Contributions that make the agents more
accurate, more useful, or applicable to more teams are very welcome.

---

## Development setup (CLI + MCP)

The **npm package** is defined at the **repository root** (`package.json`), not under `cli/`.

```bash
git clone https://github.com/Kaademos/secure-sdlc-agents.git
cd secure-sdlc-agents
npm install                 # installs CLI + MCP SDK dependencies
npm run sdlc -- --version   # should print the version from package.json
npm run sdlc -- paths       # shows resolved paths on your machine
```

Do not commit `node_modules/`, `cli/node_modules/`, or `mcp/node_modules/`. The nested `mcp/package.json` is **private** and is not published separately; the published tarball includes only `mcp/src` and `mcp/package.json`.

---

## What makes a good contribution

**High value:**
- Corrections to security guidance that is inaccurate or out of date
- Additional compliance framework mappings (HIPAA, FedRAMP, DORA, NIS2, etc.)
- Language or framework-specific secure coding guidance for the dev-lead agent
- New worked examples covering common feature types
- Improvements to the document templates based on real usage

**Also welcome:**
- Typo fixes and clarity improvements
- Better ASVS control references
- Additional elicitation questions in the product-manager agent
- Tool-specific output formats (e.g. Semgrep, Checkmarx, tfsec output templates)

---

## How to contribute

1. **Fork** the repository and create a branch from `main`.
2. Make your changes. Keep each pull request focused on one thing.
3. If you are adding or changing security guidance, briefly note your reasoning in the
   PR description (a sentence or two is enough — we're not asking for essays).
4. Open a pull request. The template will guide you through the description.

---

## Agent file guidelines

When editing agent files in `.claude/agents/`:

- Keep the `name` and `description` frontmatter accurate — the `description` field is what
  Claude Code uses to decide when to invoke the agent automatically.
- Use plain, direct language. Agents are prompts — clarity beats formality.
- Reference authoritative standards (OWASP, NIST, CIS) rather than paraphrasing them where
  a direct reference is more useful.
- Do not bloat agents with exhaustive checklists that will never be followed. Prefer
  focused, actionable guidance over completeness theatre.

For structure, frontmatter, MCP wiring, and how to add a new agent, see **[docs/agent-anatomy.md](docs/agent-anatomy.md)**.

To validate and distribute the Claude Code plugin (including Anthropic’s official submission forms), see **[docs/claude-code-marketplace-submission.md](docs/claude-code-marketplace-submission.md)**.

For GitHub Discussions, issues, and labels (e.g. good first issue), see **[docs/community.md](docs/community.md)**.

---

## Document template guidelines

Templates in `docs/templates/` should:

- Be immediately usable — a practitioner should be able to fill them in without reading
  additional documentation.
- Use clear placeholder text in the format `[PLACEHOLDER]` so it is obvious what needs
  to be replaced.
- Reflect what a real document would look like, not an aspirational ideal.

---

## Code of conduct

Be respectful. Security is a serious discipline and this project is intended to help teams
do it better. Disagreements about security guidance should be constructive and evidence-based.
By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Running the tests

The project ships a dependency-free test suite (Node's built-in runner). Before opening a PR:

```bash
npm install   # or: npm ci
npm run ci    # runs `npm test` + `npm run test:pack` — the same two steps CircleCI runs
```

Use `npm run ci` rather than `npm test` alone: CircleCI also verifies the published package
contents, so a change that ships a file without listing it in `package.json` `files` passes
`npm test` locally and still fails CI.

The suite guards version sync across manifests, agent frontmatter, and the
stack-detection ↔ `stacks/*.md` profile mapping. It runs on Node 18, 20, and 22 —
`engines.node` is `>=18`, so avoid syntax newer than that.

Every pull request, including one opened from a fork, is checked automatically by
[`.github/workflows/pr-checks.yml`](.github/workflows/pr-checks.yml) on the same Node
matrix. CircleCI (`.circleci/config.yml`) covers pushes to `main` and release tags.
If your PR is red, run `npm run ci` locally to reproduce it before pushing a fix.

[`.github/workflows/dependency-audit.yml`](.github/workflows/dependency-audit.yml) runs
`npm audit` on each PR and weekly, failing on high or critical advisories. Reproduce it
with `npm audit --audit-level=high`. Prefer an `overrides` entry for a transitive
dependency over adding a direct one the code does not import.

Maintainers: see [RELEASING.md](RELEASING.md) for how to cut a release.

---

## Reporting security issues in this project

This repository contains documentation, prompt files, and Node.js tooling (CLI + MCP).
If you find guidance in the agent files that is actively harmful or dangerously wrong,
please open an issue rather than a pull request so it can be reviewed quickly.
