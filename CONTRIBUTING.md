# Contributing to Secure SDLC Agents

Thank you for helping improve this project. Contributions that make the agents more
accurate, more useful, or applicable to more teams are very welcome.

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

---

## Reporting security issues in this project

This repository contains documentation and prompt files — there is no executable code.
If you find guidance in the agent files that is actively harmful or dangerously wrong,
please open an issue rather than a pull request so it can be reviewed quickly.
