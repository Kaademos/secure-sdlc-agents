# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.3.2] — 2026-07-30

### Fixed
- **`secure-sdlc install-mcp` crashed on every invocation** — `cli/src/commands/install-mcp.js` imported `homedir` from `"path"` instead of `"os"`, which Node's ESM loader rejects as an unknown named export (`SyntaxError: The requested module 'path' does not provide an export named 'homedir'`), killing the process before any `--tool` target could run. Found by driving the CLI end-to-end from a fresh clone as a new user would. Fixed the import; verified `cursor`, `claude-code`, `windsurf`, and `all` targets all complete without error, including the `homedir()`-dependent config write.
- **RELEASE-phase artefact never detected as present** — `docs/templates/release-sign-off.md` was copied verbatim by `secure-sdlc init`, but `status.js` and `phase-detect.js` (and `init`'s own generated `secure-sdlc.yaml` artefact map) all expected `docs/release-security-sign-off.md`. `secure-sdlc status` and phase detection would therefore report RELEASE as not-started forever, even after `release-manager` fully completed the sign-off doc. Renamed the template to `docs/templates/release-security-sign-off.md` to match every consumer of that path (the `release-manager` and `cloud-platform-engineer` agent instructions, `CLAUDE.md`, and the `warp-workflows/` scripts already used the `-security-` name — only the template file and the README's template table were out of step). Updated the README template table to match.
- **`secure-sdlc init` never wired up the Claude Code agents it tells you to use** — `init`'s own printed "Next steps" say to run `claude --agent product-manager "..."` immediately, but `init` only ever scaffolded `docs/`, hooks, CI, and `secure-sdlc.yaml` — never `.claude/agents/`. Claude Code does not error on an unrecognised `--agent` name; it silently falls back to a plain, non-specialist session, so a project set up only via the CLI quick-start got quietly degraded output with no indication anything was missing. `init` now copies `.claude/agents/*.md` and `CLAUDE.md` into the project by default (skips any file that already exists, same as the template copy); pass `--skip-agents` to opt out. Verified end-to-end: `claude --agent product-manager` now returns the specialised persona right after a bare `secure-sdlc init`, with no manual copy step.
- **`pre-push`'s "Security Artefact Gate" only checked that artefact files existed, not whether they'd been filled in** — pushing to `main` with six completely blank templates reported a clean "Pre-push checks passed." `secure-sdlc gate` already detects blank templates correctly and blocks; the hook did not. Added a bash `is_blank_template()` helper mirroring `gate.js`'s heuristic and applied it to both the warning-tier (any protected branch) and blocking-tier (`main`/`master`) artefact checks, so an unfilled template is now treated the same as a missing file.
- **`pre-push`'s "Open Finding Check" threw a bash arithmetic/unbound-variable error on a genuinely clean report** — found while verifying the fix above. `COUNT=$(grep -icE 'CRITICAL' "$doc" | tr -d ' ' || echo "0")` assumed `grep -c` prints nothing on zero matches, but it always prints `0` and merely exits 1 — under `pipefail` that made the `|| echo "0"` fallback *also* fire, doubling the value onto two lines (`"0\n0"`) and breaking the `$(( COUNT - RESOLVED ))` arithmetic below it. This didn't block the push, but it printed a confusing raw shell error in the middle of otherwise-clean output for the common case of a report with zero CRITICAL mentions. Fixed by neutralising grep's exit status before the pipe (`{ grep ... || true; } | tr -d ' '`) instead of after it.
- **MCP server's `serverInfo.version` was a hardcoded literal `"1.0.0"`**, independent of `mcp/package.json`'s own version field — harmless today since both happened to read `1.0.0`, but would silently drift the next time `mcp/package.json` is bumped. Now read from `mcp/package.json` at startup.

### Added
- **Regression tests** for every fix above. In `test/cli.test.js`: every `cli/src/commands/*.js` module must import cleanly (catches ESM import-time errors like the `homedir` one before they ship); `install-mcp` must complete for every `--tool` target under an isolated `HOME`; every artefact path `status.js`'s `PHASE_ARTEFACTS` checks for must actually exist after a real `init` run (catches template/artefact-path drift like the release sign-off one — `PHASE_ARTEFACTS` is now exported from `status.js` so the test asserts against the real source of truth, not a second hardcoded list that could itself drift); `init` must copy `.claude/agents/` and `CLAUDE.md` by default and skip both under `--skip-agents`; the MCP server must report the version from `mcp/package.json`. In new `test/hooks.test.js`: `hooks/pre-push` is installed into a throwaway repo and run against a real bare remote — asserts a push to `main` is rejected while required artefacts are blank templates, and succeeds with no bash errors once they're genuinely filled in.

---

## [1.3.1] — 2026-07-22

### Security
- **`fast-uri` upgraded to 3.1.4** via an `overrides` entry, clearing two HIGH advisories in the transitive `@modelcontextprotocol/sdk → ajv → fast-uri` chain:
  - [GHSA-4c8g-83qw-93j6](https://github.com/advisories/GHSA-4c8g-83qw-93j6) / CVE-2026-13676 — host confusion via failed IDN canonicalization (fixed in 3.1.3)
  - [GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) / CVE-2026-16221 — host confusion via literal backslash authority delimiter (fixed in 3.1.4)

  Reported by @anupamme in #17, which targeted 3.1.3 and so would have left the second advisory open. `overrides` is used rather than a direct dependency because nothing in this codebase imports `fast-uri`; it also keeps the floor in place across future `npm update` runs. Note that `overrides` applies to this repository's own installs (CI, clones, development) — consumers of the published package resolve `fast-uri` through ajv's `^3.0.1` range, which already yields a patched version.

### Added
- **Dependency audit CI** (`.github/workflows/dependency-audit.yml`) — `npm audit` on every PR **and on a weekly schedule**, failing on high/critical while still reporting moderates. The schedule is the part that matters: the `fast-uri` advisories landed against a dependency tree nobody had touched, so there was no PR for a check to attach to. Runs `--package-lock-only`, so no dependency is installed or executed to perform the audit

### Notes
- `@hono/node-server` (GHSA-frvp-7c67-39w9, moderate — `serve-static` path traversal on Windows) remains open and is **not reachable in this project**: the MCP server uses `StdioServerTransport` only and never imports hono or `serve-static`. Patching requires `>=2.0.5`, outside the `^1.19.9` range `@modelcontextprotocol/sdk` declares, so forcing it would risk breaking the SDK for no security benefit. Revisit when the SDK widens its range.

---

## [1.3.0] — 2026-07-22

### Added
- **Spring Boot stack profile** (`stacks/spring-boot.md`) — code-driven security guidance for Spring Boot 3.x / Spring Security 6.x on Java 17+ and Kotlin: Actuator exposure (`/heapdump`, `/env`), filter-chain matcher ordering, `@EnableMethodSecurity`, JPQL/`JdbcTemplate` injection, SpEL injection, mass assignment, Jackson polymorphic deserialisation, Thymeleaf XSS/SSTI, and `allowedOriginPatterns("*")` CORS
- **Spring Boot security notes** in `getStackSecurityNotes()`, so `secure-sdlc init` and `kickoff` no longer fall back to generic guidance on Spring projects
- **Test guard** — every shipped `stacks/*.md` must return stack-specific notes rather than the generic fallback, closing the gap that allowed a detectable stack to ship with no guidance behind it
- **Pull request CI** (`.github/workflows/pr-checks.yml`) — runs the same `npm test` + `npm run test:pack` steps as CircleCI on Node 18/20/22 for every PR **including forks**, which CircleCI skips unless "Build forked pull requests" is enabled. Least-privilege `contents: read` token, actions pinned to full commit SHAs
- **`npm run ci`** — runs the same two commands CircleCI does, so a change that passes locally passes in CI

### Fixed
- **Gradle Spring Boot projects were never detected** — `build.gradle`/`build.gradle.kts` always resolved to `java`, so Kotlin and Gradle-based Spring Boot services could not reach the Spring Boot profile. Detection now reads the Gradle build files and matches the `org.springframework.boot` plugin as well as Maven's `spring-boot-starter-*` artifacts
- **`package-lock.json` version drift** — the lockfile was left at `1.1.0` through the 1.2.0 release because the manifests were bumped by hand; it is now back in step with `package.json`

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
