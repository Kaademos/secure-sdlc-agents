# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.0] — 2026-06-26

### Added
- **Go stack profile** (`stacks/golang.md`) — dense, code-driven security guidance for Go (net/http, Gin, Echo, Fiber): `html/template` XSS, `database/sql`/GORM parameterisation, CORS, security headers, `gosec`/`govulncheck`
- **Go security notes** in `getStackSecurityNotes()` plus a `getStackProfile()` resolver so detected `gin`/`echo`/`fiber` projects map to the `golang` profile and notes
- **Worked example `04-oauth-flow`** — OAuth 2.0 / OIDC social login (authorization-code + PKCE); `redirect_uri` exact matching, `state` vs `nonce`, ID-token validation, anchored to ASVS 5.0 V10 and RFC 9700
- **Worked example `05-payment-processing`** — redirect-based hosted checkout (PCI DSS SAQ A); webhook signature verification, idempotency, server-side amount, reflecting the Jan 2025 SAQ A changes
- **HIPAA, DORA, and FedRAMP** control tables in `compliance-attestation.md` and the GRC agent's control-mapping example
- **Automated test suite** (`test/`, Node built-in runner, zero new dependencies) — guards version sync across manifests, agent frontmatter, and the stack-detection ↔ `stacks/*.md` mapping
- **CI** (`.circleci/config.yml`) — runs the suite on Node 18, 20, and 22 plus an `npm pack` content check
- **Release automation** (CircleCI) — re-tests and publishes to npm on `v*` tags (needs an `NPM_TOKEN` project env var)
- **`CODE_OF_CONDUCT.md`** (Contributor Covenant 2.1), **`.editorconfig`**, npm/CI/Node README badges, and a committed `package-lock.json`

### Changed
- **CodeQL SAST** (`secure-sdlc-gate.yml`) — matrix expanded to `ruby`, `go`, and `java-kotlin`; per-language `build-mode` with toolchain setup so compiled-language scans are reliable on enterprise repos (pure-Java uses `build-mode: none`)
- **ASVS references migrated from 4.0 to 5.0** repo-wide using the official OWASP `mapping_v4.0.3_to_v5.0.0` mapping (stack profiles, examples, agents, templates, skill, PR template)
- **`secure-sdlc init`** only prints a `stacks/<name>.md` pointer when that profile actually ships

### Fixed
- Pre-existing CSRF control mislabel in the Django, Express, Rails, and Go stack profiles (`V14.4.5`/HSTS → real CSRF control `V3.5.1`)
- Broken `stacks/<gin|echo|fiber>.md` reference — Go framework projects now resolve to `stacks/golang.md`

---

## [1.0.2]

---

## [1.1.0] — 2026-04-06

### Added
- **`.claude-plugin/plugin.json`** — Claude Code plugin marketplace manifest; agents now installable with a single `/plugin marketplace add Kaademos/secure-sdlc-agents` command (zero-dependency, no npm, no cloning)
- **`skills/` directory** — 4 SKILL.md files in the agent-skills–compatible format for cross-ecosystem discoverability:
  - `skills/security-and-hardening/` — secure coding, PR review, OWASP Top 10 prevention, severity gating
  - `skills/threat-modeling/` — STRIDE + LINDDUN structured threat model workflow
  - `skills/ai-security/` — OWASP LLM Top 10 2025, prompt injection, excessive agency, output validation
  - `skills/compliance-and-audit/` — risk register, framework mapping (SOC 2, ISO 27001, GDPR, PCI DSS), audit evidence
- **README — "Option 0"** plugin marketplace as the first and fastest install path (before git clone and npm)
- **README — "The 4-Minute Problem"** concrete breach table replacing the generic problem statement — 5 real vulnerabilities a vibe-coded file upload misses, each mapped to the catching agent
- **README — "Who Do You Call?"** ASCII decision tree covering every SDLC moment → correct agent → exact command

### Changed
- **README.md** — title tagline tightened to be specific and direct ("8 AI security specialists. Invoked at the exact phase where each vulnerability would have been caught.")
- **`package.json` `files`** — added `skills/` and `.claude-plugin/` to the npm publish manifest


### Added
- **npm package** `@kaademos/secure-sdlc` (root `package.json`) — global install via `npm install -g @kaademos/secure-sdlc`, `npx @kaademos/secure-sdlc`, semver releases;
- **`secure-sdlc paths`** — prints `PACKAGE_ROOT` and MCP server path after install
- **MCP server** (`mcp/`) — 10 `sdlc_*` tools for Cursor, Windsurf, Zed, Continue, and other MCP hosts
- **CLI** (`cli/`) — `secure-sdlc` commands: `init`, `kickoff`, `status`, `gate`, `review`, `install-mcp`, `paths`
- **Cursor rules** (`.cursor/rules/secure-sdlc.mdc`) — always-on security context and MCP tool triggers
- **GitHub Actions** (`.github/workflows/secure-sdlc-gate.yml`) — artefact gate, Gitleaks, CodeQL, Checkov, dependency audits
- **Git hooks** (`hooks/`) — `pre-commit` (secrets, anti-patterns), `pre-push` (protected-branch checks), `install.sh`
- **Warp workflows** (`warp-workflows/`) — feature kickoff, PR review, threat model, release gate, status
- **Stack profiles** (`stacks/`) — Next.js, FastAPI, Django, Express, Rails, generic Node.js
- **Agents:** `security-champion`, `ai-security-engineer` (OWASP LLM Top 10–aligned)
- `secure-sdlc.yaml` scaffold generated by `secure-sdlc init`

### Changed
- **README.md** — multi-tool setup (Claude Code, CLI, MCP), command references, integration map
- **CLAUDE.md** — extended roster, phase detection, `secure-sdlc.yaml`, stack profiles, AI-feature rule, MCP equivalents

### Fixed
- CLI `init` / `install-mcp` repository root resolution so templates, hooks, and workflows copy from the correct path

### Earlier baseline (same release train)
- Six Secure SDLC sub-agents
- CLAUDE.md orchestrator with full lifecycle phase definitions
- All 8 document templates: security-requirements, risk-register, threat-model,
  infra-security-review, sast-findings, test-security-report, release-sign-off,
  compliance-attestation
- Three worked examples: login feature, REST API endpoint, file upload
- README with honest caveat on agent limitations
- CONTRIBUTING.md, LICENSE, GitHub issue and PR templates

---

## How to read this file

- **Added** — new agents, templates, examples, or features
- **Changed** — updates to existing agent guidance or templates
- **Fixed** — corrections to inaccurate security guidance
- **Deprecated** — content that will be removed in a future version
- **Removed** — content that has been removed
