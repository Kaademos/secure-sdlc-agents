![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Claude Code](https://img.shields.io/badge/Claude_Code-Sub--Agents-blueviolet)
![OWASP ASVS](https://img.shields.io/badge/OWASP-ASVS%20L2-orange)
![PRs Welcome](https://img.shields.io/shields.io/badge/PRs-welcome-brightgreen.svg)

# Secure SDLC Agents for Claude Code

A team of specialised Claude Code sub-agents that enforce security at every phase of the
Software Development Lifecycle — from requirements through to release.

Inspired by the multi-agent Claude Code pattern popularised by Garry Tan, but purpose-built
for security engineering teams. Where that setup gives you a CEO, Eng Manager and QA
Engineer, this gives you an AppSec Engineer, Product Manager (with ASVS), GRC Analyst,
Cloud/Platform Engineer, Dev Lead and Release Manager — all wired into a full Secure SDLC.

---

## A note on what these agents are — and aren't

These agents produce **guidance, not guarantees**.

They will help a team ask the right questions earlier, produce consistent artefacts,
and catch common mistakes that would otherwise slip through. They will not replace a
skilled AppSec engineer, a qualified GRC practitioner, or a thorough penetration test.

Every output the agents produce should be reviewed by a human with relevant expertise
before it is acted on or used as audit evidence. The threat model is a starting point for
a conversation, not a final document. The SAST triage is informed opinion, not a verdict.
The compliance attestation is only as good as the evidence it references.

Security practitioners are rightly sceptical of anything that claims to automate security
away. This project does not make that claim. It makes security practices easier to start,
easier to maintain, and harder to skip — which is most of the battle in most teams.

If you find guidance in an agent file that is wrong or dangerously out of date, please
[open an issue](../../issues/new?template=guidance-correction.md). That kind of correction
is the most valuable contribution this project can receive.

---

## Why this exists

Security is consistently bolted on at the end of development cycles. Threat models happen
too late (if at all). ASVS requirements are never written. Compliance evidence is scrambled
together before audits. This project encodes the right behaviours into the agents that sit
alongside your developers every day.

**What you get:**
- Security requirements gathered via OWASP ASVS *before* design starts
- Structured threat modelling (STRIDE/LINDDUN) at architecture review
- SAST triage with developer-friendly remediation, not just CVE dumps
- GRC control mapping to SOC 2, ISO 27001, NIST CSF, PCI DSS and GDPR
- IaC and CSPM-style review for your cloud and platform configurations
- A hard go/no-go release gate backed by documented evidence

---

## Agents

| Agent | Role | Key phases |
|---|---|---|
| [`product-manager`](.claude/agents/product-manager.md) | ASVS-mapped secure requirements | Plan |
| [`appsec-engineer`](.claude/agents/appsec-engineer.md) | Threat modelling, SAST/DAST, vuln triage | Design, Build, Test |
| [`grc-analyst`](.claude/agents/grc-analyst.md) | Compliance mapping, risk register, audit evidence | Plan → Release |
| [`cloud-platform-engineer`](.claude/agents/cloud-platform-engineer.md) | IaC security, CSPM, secrets, hardening | Design, Build, Release |
| [`dev-lead`](.claude/agents/dev-lead.md) | Secure coding, PR review, SCA | Build, Test |
| [`release-manager`](.claude/agents/release-manager.md) | Security sign-off, go/no-go gate | Release |

---

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed
- A Claude account with access to Claude Code
- Familiarity with the Claude Code sub-agents feature

---

## Quick start

### 1. Add the agents to your project

Copy the `.claude/` directory and `CLAUDE.md` into your project root:

```bash
# Clone this repo
git clone https://github.com/Kaademos/secure-sdlc-agents.git

# Copy into your project
cp -r secure-sdlc-agents/.claude /your/project/
cp secure-sdlc-agents/CLAUDE.md /your/project/
```

Or use it as a reference and adapt the agent files to your stack and standards.

### 2. Initialise your docs directory

Copy the document templates for the current feature or sprint:

```bash
mkdir -p docs/audit-evidence
cp secure-sdlc-agents/docs/templates/* docs/
```

### 3. Start with secure requirements (Plan phase)

```bash
cd /your/project
claude --agent product-manager \
  "Define security requirements for our new user authentication feature using ASVS L2"
```

### 4. Run a threat model (Design phase)

```bash
claude --agent appsec-engineer \
  "Threat model the proposed authentication architecture in docs/architecture.md using STRIDE"
```

### 5. Review a pull request (Build phase)

```bash
claude --agent dev-lead "Review PR #42 for secure coding issues and dependency risks"
claude --agent appsec-engineer "Triage any SAST findings for PR #42"
```

### 6. Release gate (Release phase)

```bash
claude --agent release-manager "Run pre-release security checklist for v1.2.0"
```

---

## The lifecycle

```
PLAN        → product-manager (ASVS requirements) + grc-analyst (risk register)
                    ↓
DESIGN      → appsec-engineer (threat model) + cloud-platform-engineer (IaC review)
             + grc-analyst (compliance gate)
                    ↓
BUILD       → dev-lead (PR review, SCA) + appsec-engineer (SAST triage)
             + cloud-platform-engineer (secrets, pipeline)
                    ↓
TEST        → appsec-engineer (DAST, pentest) + dev-lead (regression)
             + grc-analyst (evidence collection)
                    ↓
RELEASE     → release-manager (go/no-go) + grc-analyst (attestation)
             + cloud-platform-engineer (production hardening)
```

Severity gates block progression:
- **CRITICAL or HIGH** unmitigated findings block Build→Test and Test→Release
- **MEDIUM** findings require accepted risk or remediation plan before release
- **LOW** findings are tracked in the risk register

---

## Document templates

Pre-formatted templates for every artefact the agents produce are in [`docs/templates/`](docs/templates/).
Copy them into your `docs/` folder at the start of each feature or release.

| Template | Produced by | Phase |
|---|---|---|
| [`security-requirements.md`](docs/templates/security-requirements.md) | product-manager | Plan |
| [`risk-register.md`](docs/templates/risk-register.md) | grc-analyst | Plan → ongoing |
| [`threat-model.md`](docs/templates/threat-model.md) | appsec-engineer | Design |
| [`infra-security-review.md`](docs/templates/infra-security-review.md) | cloud-platform-engineer | Design |
| [`sast-findings.md`](docs/templates/sast-findings.md) | appsec-engineer + dev-lead | Build |
| [`test-security-report.md`](docs/templates/test-security-report.md) | appsec-engineer | Test |
| [`release-sign-off.md`](docs/templates/release-sign-off.md) | release-manager | Release |
| [`compliance-attestation.md`](docs/templates/compliance-attestation.md) | grc-analyst | Release |

All 8 templates are fully populated and immediately usable.

---

## Examples

See [`examples/`](examples/) for complete worked walkthroughs showing the full agent
collaboration for real feature types:

- [01 — Login feature](examples/01-login-feature/): Greenfield auth flow, ASVS L2
- [02 — REST API endpoint](examples/02-api-endpoint/): Public endpoint with IDOR risk and rate limiting
- [03 — File upload](examples/03-file-upload/): File handling, SVG XSS, malware scanning, S3 hardening

---

## Adapting to your stack

The agents are intentionally framework-agnostic. Common customisations:

**Change the ASVS level** — edit the product-manager agent's default level from L2 to L1 or L3.

**Add your compliance frameworks** — the grc-analyst agent lists SOC 2, ISO 27001, NIST CSF,
PCI DSS and GDPR by default. Remove irrelevant ones and add any framework specific to your
industry (HIPAA, DORA, FedRAMP, etc.).

**Add your toolchain** — reference your specific SAST tool (Semgrep, Checkmarx, Snyk Code),
DAST tool (OWASP ZAP, Burp Suite) and IaC scanner (Checkov, tfsec, Trivy) in the relevant
agent files so the agents produce output in your tool's format.

**Add a security champion agent** — for larger engineering orgs, consider a
`security-champion` agent that sits between dev-lead and appsec-engineer, handling first-line
security triage within squads.

---

## Contributing

Contributions are very welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Ideas for contributions:
- Additional compliance frameworks (HIPAA, FedRAMP, DORA)
- Language/framework-specific secure coding guidance in the dev-lead agent
- More worked examples (OAuth flows, payment processing, microservices)
- Integration guidance for specific SAST/DAST tools
- Translations of the agent prompts

---

## Licence

MIT — see [LICENSE](LICENSE).

---

## Related

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Secure Software Development Framework (SSDF)](https://csrc.nist.gov/projects/ssdf)
- [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code)
