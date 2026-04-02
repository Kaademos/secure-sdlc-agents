# Secure SDLC — Multi-Agent Orchestration

This project uses a team of specialised sub-agents to enforce security throughout the entire
Software Development Lifecycle (SDLC). Each agent has a defined role, phase, and set of
responsibilities. The orchestrator (you, the main Claude Code session) coordinates them.

---

## Agent Roster

| Agent file | Role | Primary phases |
|---|---|---|
| `product-manager` | Secure requirements via ASVS | Plan |
| `grc-analyst` | Compliance, risk register, audit evidence | Plan → Release |
| `appsec-engineer` | Threat modelling, SAST/DAST, vuln triage | Design → Test |
| `cloud-platform-engineer` | IaC security, CSPM, secrets, hardening | Design → Release |
| `dev-lead` | Secure coding patterns, PR review, dependency review | Build → Test |
| `release-manager` | Security sign-off, go/no-go gate | Release |
| `security-champion` | First-line security Q&A and lightweight review | All phases |
| `ai-security-engineer` | AI/LLM feature security, prompt injection, agentic risks | Design → Test |

---

## Lifecycle Phases & Handoffs

### 1. PLAN
- Invoke `product-manager` to elicit and document security requirements mapped to ASVS levels.
- Invoke `grc-analyst` to produce the initial risk register and identify applicable compliance
  frameworks (SOC 2, ISO 27001, NIST CSF, PCI-DSS, etc.).
- Output: `docs/security-requirements.md`, `docs/risk-register.md`

### 2. DESIGN
- Invoke `appsec-engineer` to run a structured threat model (STRIDE or LINDDUN) against the
  proposed architecture.
- Invoke `cloud-platform-engineer` to review infrastructure design for misconfigurations,
  privilege escalation paths, and secrets handling.
- Invoke `grc-analyst` to map architecture decisions to compliance controls.
- Output: `docs/threat-model.md`, `docs/infra-security-review.md`

### 3. BUILD
- Invoke `dev-lead` on every pull request or significant code change to enforce secure coding
  standards and review dependencies (SCA).
- Invoke `appsec-engineer` to triage any SAST findings and provide remediation guidance.
- Invoke `cloud-platform-engineer` to validate IaC changes (Terraform, Helm, etc.) and
  check for exposed secrets.
- Output: inline PR comments, `docs/sast-findings.md`

### 4. TEST
- Invoke `appsec-engineer` to coordinate DAST, fuzz testing, and interpret penetration test
  findings.
- Invoke `dev-lead` to implement fixes for confirmed vulnerabilities and run security
  regression tests.
- Invoke `grc-analyst` to collect test evidence for audit artefacts.
- Output: `docs/test-security-report.md`, `docs/audit-evidence/`

### 5. RELEASE
- Invoke `release-manager` to execute the pre-release security checklist and issue a
  go/no-go decision.
- Invoke `grc-analyst` for final compliance attestation.
- Invoke `cloud-platform-engineer` to confirm production hardening (WAF, SIEM alerts,
  runtime protection) is in place.
- Output: `docs/release-security-sign-off.md`

---

## Orchestration Rules

1. **Never skip a phase gate.** Each phase produces artefacts that the next phase depends on.
 If a required artefact is missing, halt and request it before proceeding.

2. **Severity thresholds block progression:**
 - CRITICAL or HIGH unmitigated findings block the Build → Test and Test → Release gates.
 - MEDIUM findings must have an accepted risk or remediation plan before release.
 - LOW findings are tracked in the risk register.

3. **All findings are traceable.** Every vulnerability or risk identified by any agent must
 be recorded in `docs/risk-register.md` with an owner, severity, and status.

4. **ASVS is the requirements anchor.** The product-manager agent maps every security
 requirement to an ASVS control reference. All other agents reference these when providing
 guidance.

5. **Agents collaborate, not compete.** If two agents produce conflicting guidance (e.g.
 appsec-engineer and cloud-platform-engineer disagree on an approach), escalate to the
 orchestrator for resolution and document the decision.

6. **AI features require the ai-security-engineer.** Any feature that calls an LLM API,
 processes user input sent to a model, or uses agentic patterns MUST be reviewed by
 `ai-security-engineer` in addition to the standard AppSec review. Prompt injection,
 indirect prompt injection, and excessive agency are SDLC risks, not afterthoughts.

7. **Check `secure-sdlc.yaml` for project configuration.** If `secure-sdlc.yaml` exists
 in the project root, use it to determine the ASVS level, applicable compliance frameworks,
 and which CI gates are configured. If it doesn't exist, prompt the user to run
 `secure-sdlc init` or create it manually.

8. **Phase detection.** Before starting work, check which SDLC artefacts exist in `docs/`:
 - No artefacts → start with PLAN phase
 - Requirements + risk register exist → proceed to DESIGN
 - Threat model exists → proceed to BUILD
 - SAST findings documented → proceed to TEST
 - Test report exists → ready for RELEASE gate
 The command `secure-sdlc status` provides a visual summary.

---

## Quick-start Commands

```bash
# ── Zero-friction setup ────────────────────────────────────────────────────
# Install Secure SDLC in your project (docs, hooks, CI, config)
secure-sdlc init --cursor          # + Cursor MCP integration

# Interactive feature kickoff wizard
secure-sdlc kickoff

# Check current SDLC phase
secure-sdlc status

# ── Per-phase agent commands ───────────────────────────────────────────────
# PLAN: Start a new feature with secure requirements
claude --agent product-manager "Define security requirements for [feature] using ASVS L2"
claude --agent grc-analyst "Initialise risk register for [feature]. Map to [SOC2/GDPR/etc]"

# DESIGN: Threat model + infrastructure review
claude --agent appsec-engineer "Threat model [architecture] using STRIDE"
claude --agent cloud-platform-engineer "Review IaC for [feature]: [describe changes]"

# DESIGN (AI features): Additional AI security review
claude --agent ai-security-engineer "Security review AI feature: [describe model usage, inputs, tools]"

# BUILD: PR review
claude --agent dev-lead "Review PR #[N] for secure coding issues and dependency risks"
claude --agent appsec-engineer "Triage SAST findings for PR #[N]"

# Quick security questions (any phase)
claude --agent security-champion "Is [pattern/library/approach] safe? Context: [what you're building]"

# RELEASE: Pre-release security gate
secure-sdlc gate v[X.Y.Z]
claude --agent release-manager "Run pre-release security checklist for v[X.Y.Z]"

# ── MCP tool equivalents (for Cursor, Windsurf, and other MCP hosts) ──────
# sdlc_plan_feature, sdlc_threat_model, sdlc_review_pr, sdlc_review_infra,
# sdlc_triage_sast, sdlc_release_gate, sdlc_check_compliance,
# sdlc_security_champion, sdlc_ai_security_review
```

---

## Artefact Directory Layout

```
docs/
  security-requirements.md     # ASVS-mapped requirements (PM agent)
  risk-register.md             # Live risk tracking (GRC agent)
  threat-model.md              # STRIDE/threat model (AppSec agent)
  infra-security-review.md     # IaC & cloud review (Cloud/Platform agent)
  sast-findings.md             # Static analysis findings (AppSec + Dev Lead)
  test-security-report.md      # DAST, pentest summary (AppSec agent)
  release-security-sign-off.md # Final gate (Release Manager)
  audit-evidence/              # Compliance artefacts (GRC agent)

secure-sdlc.yaml               # Project security configuration
```

## Stack-Specific Guidance

If the project uses one of these stacks, reference the relevant profile in `stacks/`:

| Stack | Profile |
|---|---|
| Next.js (App Router) | `stacks/nextjs.md` |
| FastAPI | `stacks/fastapi.md` |
| Django | `stacks/django.md` |
| Express.js | `stacks/express.md` |
| Ruby on Rails | `stacks/rails.md` |

Stack profiles contain framework-specific vulnerability patterns, secure coding examples,
and recommended libraries. Reference them when the dev-lead or appsec-engineer agents
provide stack-specific guidance.

## Multi-Tool Integration

This agent team is available through multiple integration points:

| Tool | Integration |
|---|---|
| Claude Code | `.claude/agents/` sub-agents (this repository) |
| Cursor | MCP server (`mcp/`) + Cursor rules (`.cursor/rules/`) |
| Windsurf / Zed / Continue | MCP server (`mcp/`) |
| Any terminal | CLI (`cli/`) — `secure-sdlc init|kickoff|review|gate|status` |
| Warp terminal | Workflows (`warp-workflows/`) |
| GitHub Actions | CI workflow (`.github/workflows/secure-sdlc-gate.yml`) |
| Git | Hooks (`hooks/pre-commit`, `hooks/pre-push`) |
