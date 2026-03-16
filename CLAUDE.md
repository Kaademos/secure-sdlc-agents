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

---

## Quick-start Commands

```bash
# Start a new feature with secure requirements
claude --agent product-manager "Define security requirements for [feature] using ASVS L2"

# Run a threat model on a new architecture
claude --agent appsec-engineer "Threat model the proposed [architecture] using STRIDE"

# Review a pull request
claude --agent dev-lead "Review PR #[N] for secure coding issues and dependency risks"
claude --agent appsec-engineer "Triage SAST findings for PR #[N]"

# Pre-release security gate
claude --agent release-manager "Run pre-release security checklist for v[X.Y.Z]"
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
```
