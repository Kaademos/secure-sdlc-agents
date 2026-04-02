![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Claude Code](https://img.shields.io/badge/Claude_Code-Sub--Agents-blueviolet)
![Cursor MCP](https://img.shields.io/badge/Cursor-MCP%20Ready-blue)
![OWASP ASVS](https://img.shields.io/badge/OWASP-ASVS%20L2-orange)
![Works With](https://img.shields.io/badge/Works%20With-Claude%20%7C%20Cursor%20%7C%20Windsurf%20%7C%20Warp-brightgreen)

# Secure SDLC Agents

A team of AI security specialists — embedded directly in your vibe coding workflow.

They cover every phase of the Software Development Lifecycle: requirements, architecture,
code review, infrastructure, compliance, and release gating. They work wherever you work:
Claude Code, Cursor, Windsurf, Warp, and any tool that supports MCP.

---

## The problem this solves

When developers use AI tools to build fast, security becomes the thing that gets bolted on
at the end — or skipped entirely. Threat models don't happen. ASVS requirements are never
written. Compliance evidence is scrambled together the night before an audit.

This project makes the security team part of the build process from day one. Not a gate
at the end, but a set of specialists you summon at the exact moment their expertise is needed.

---

## What you get

| What | Why it matters |
|---|---|
| **8 specialist agents** | AppSec, Product Manager, GRC Analyst, Cloud/Platform, Dev Lead, Release Manager, Security Champion, AI Security Engineer |
| **MCP server** | Works in Cursor, Windsurf, Zed, Continue, and any MCP-compatible tool |
| **CLI tool** (`secure-sdlc`) | Zero-friction setup, kickoff wizard, status dashboard, release gate |
| **Cursor rules** | Automatic security context in every Cursor session |
| **GitHub Actions workflow** | Artefact gate, secret scan, SAST (CodeQL), IaC scan (Checkov), dependency audit |
| **Git hooks** | Pre-commit secret detection, security anti-pattern checks |
| **Warp workflows** | Pre-built Warp automation for every SDLC phase |
| **Stack profiles** | Deep, framework-specific guidance for Next.js, FastAPI, Django, Express, Rails |
| **Document templates** | 8 fully structured templates for every phase artefact |
| **Worked examples** | 3 complete feature walkthroughs (auth, REST API, file upload) |

---

## Agents

| Agent | Role | When to invoke |
|---|---|---|
| [`product-manager`](.claude/agents/product-manager.md) | ASVS-mapped security requirements | Start of every feature |
| [`appsec-engineer`](.claude/agents/appsec-engineer.md) | Threat modelling, SAST/DAST, vuln triage | Design, Build, Test |
| [`grc-analyst`](.claude/agents/grc-analyst.md) | Compliance mapping, risk register, audit evidence | Plan through Release |
| [`cloud-platform-engineer`](.claude/agents/cloud-platform-engineer.md) | IaC security, CSPM, secrets, hardening | Design, Build, Release |
| [`dev-lead`](.claude/agents/dev-lead.md) | Secure coding, PR review, SCA | Every PR |
| [`release-manager`](.claude/agents/release-manager.md) | Security sign-off, go/no-go gate | Pre-release |
| [`security-champion`](.claude/agents/security-champion.md) | First-line security Q&A and lightweight review | Any time, any phase |
| [`ai-security-engineer`](.claude/agents/ai-security-engineer.md) | Prompt injection, agentic risks, LLM supply chain | Any feature using AI/LLMs |

---

## Quick start

### Option A — Claude Code (zero dependencies)

```bash
git clone https://github.com/Kaademos/secure-sdlc-agents.git
cp -r secure-sdlc-agents/.claude /your/project/
cp secure-sdlc-agents/CLAUDE.md /your/project/
cp -r secure-sdlc-agents/docs/templates /your/project/docs/
```

Then use agents directly:

```bash
cd /your/project
claude --agent product-manager "Define security requirements for [your feature]"
```

### Option B — CLI tool (recommended for teams)

Published on npm as **`@kaademos/secure-sdlc`**. Requires **Node.js 18+**.

**Global install** (command is still `secure-sdlc`):

```bash
npm install -g @kaademos/secure-sdlc
secure-sdlc --version
secure-sdlc init
```

**No global install** (uses npx; pin a version in CI with `@1.0.0`):

```bash
npx @kaademos/secure-sdlc@latest init
```

**After install — useful commands:**

```bash
secure-sdlc paths              # print PACKAGE_ROOT and MCP server path (for Cursor MCP JSON)
secure-sdlc init --cursor      # scaffold project + .cursor/mcp.json pointing at bundled MCP
secure-sdlc install-mcp        # merge MCP server into ~/.cursor/mcp.json (and other tools)
secure-sdlc kickoff            # interactive feature wizard
secure-sdlc status
```

**Develop / run from a git clone** (no npm publish needed):

```bash
cd /path/to/secure-sdlc-agents
npm install
node cli/bin/secure-sdlc.js init
# or: npm run sdlc -- init
```

### Option C — Cursor / Windsurf / Other MCP tools

1. Get the absolute path to `mcp/src/server.js`:

- **If you installed the CLI from npm:** run `secure-sdlc paths` and copy `MCP_SERVER`.
- **If you use a git clone:** run `npm install` at the repo root (installs MCP SDK for the bundled server), then use  
  `/absolute/path/to/secure-sdlc-agents/mcp/src/server.js`.

2. Add to your MCP config:

**Cursor** (`~/.cursor/mcp.json` or `.cursor/mcp.json` in project):
```json
{
  "mcpServers": {
    "secure-sdlc": {
      "command": "node",
      "args": ["/absolute/path/from-secure-sdlc-paths/mcp/src/server.js"]
    }
  }
}
```

**Claude Code:**
```bash
claude mcp add secure-sdlc -- node /absolute/path/to/secure-sdlc-agents/mcp/src/server.js
```

**Or install for all tools at once:**
```bash
node cli/bin/secure-sdlc.js install-mcp --tool all
```

3. Copy the Cursor rules for automatic security context:
```bash
cp -r .cursor /your/project/
```

4. Use the `sdlc_*` tools in any chat:
```
Use sdlc_plan_feature to define security requirements for a new payment checkout feature.
Stack is Next.js + Stripe + PostgreSQL. ASVS L2. Compliance: PCI-DSS, SOC2.
```

---

## The lifecycle — phase by phase

```
PLAN        product-manager (ASVS requirements)
            + grc-analyst (risk register, compliance mapping)
                    ↓
DESIGN      appsec-engineer (STRIDE threat model)
            + cloud-platform-engineer (IaC review)
            + ai-security-engineer (if AI/LLM features)
            + grc-analyst (compliance gate)
                    ↓
BUILD       dev-lead (PR review, SCA) — on every PR
            + appsec-engineer (SAST triage)
            + cloud-platform-engineer (secrets, pipeline)
            + security-champion (quick questions any time)
                    ↓
TEST        appsec-engineer (DAST, pentest)
            + dev-lead (regression)
            + grc-analyst (audit evidence collection)
                    ↓
RELEASE     release-manager (go/no-go)
            + grc-analyst (compliance attestation)
            + cloud-platform-engineer (production hardening)
```

**Severity gates:**
- **CRITICAL** — blocks all gates, no exceptions
- **HIGH** — blocks Build→Test and Test→Release without documented accepted risk
- **MEDIUM** — requires remediation plan or accepted risk before release
- **LOW** — tracked in risk register, does not block

---
## Frequently Asked Questions

**Q: Where do I put my OpenAI or Anthropic API key?**
You don't need to provide an API key to `secure-sdlc`. This project does not make LLM API calls directly. Instead, it acts as an MCP server and prompt-generation engine that feeds specialized security context to your "host" AI tool (Cursor, Windsurf, Claude Code). Your API keys and billing are handled entirely by your host application.

**Q: Do I have to manually fill out the Markdown templates?**
No. While the project provides structured templates in `docs/templates/`, you do not fill them out by hand. When you invoke a tool like `sdlc_plan_feature`, the MCP server passes the blank template to your AI assistant, and the AI automatically writes the completed, project-specific markdown file directly to your `docs/` folder.

**Q: Do the AI agents run automatically in my CI/CD pipeline?**
No, the AI agents are designed to be used locally by developers during the coding process (e.g., in your IDE or terminal). The provided GitHub Actions workflow (`secure-sdlc-gate.yml`) does *not* invoke LLMs. Instead, it acts as a deterministic **gatekeeper**—it runs traditional tools (like Gitleaks, Checkov, CodeQL) and verifies that the AI-generated artifacts actually exist and are fully filled out before allowing a merge.

**Q: Will this use a lot of API tokens/credits?**
Because this tool feeds comprehensive security frameworks (like OWASP ASVS), infrastructure checklists, and full file templates into your AI's context window, it can consume a significant number of tokens. Ensure your host application (like Claude Code or your Cursor subscription) has sufficient limits for handling large context prompts.

**Q: Can I customize the templates for my own company's requirements?**
Yes. When you run `secure-sdlc init`, the default templates are copied into your local `docs/templates/` directory. You can modify these markdown files to include your own company's specific compliance headers, and the agents will use your customized versions going forward.

---

## MCP tools reference

When using the MCP server (Cursor, Windsurf, etc.), these tools are available:

| Tool | What it does |
|---|---|
| `sdlc_plan_feature` | ASVS requirements + risk register for a new feature |
| `sdlc_threat_model` | STRIDE (+ LINDDUN) threat model |
| `sdlc_review_pr` | Security review a PR — dev-lead + appsec-engineer |
| `sdlc_review_infra` | IaC security review (Terraform, Helm, K8s, etc.) |
| `sdlc_triage_sast` | Triage SAST findings from any tool |
| `sdlc_release_gate` | Pre-release go/no-go security gate |
| `sdlc_check_compliance` | Map controls to SOC 2, ISO 27001, GDPR, PCI DSS, etc. |
| `sdlc_init_project` | Scaffold Secure SDLC structure in a project |
| `sdlc_security_champion` | Quick security Q&A and lightweight code review |
| `sdlc_ai_security_review` | Security review for AI/LLM features |

---

## CLI commands reference

```bash
secure-sdlc init           # Scaffold docs, hooks, CI, config in current project
secure-sdlc init --cursor  # Also install Cursor MCP config and rules
secure-sdlc kickoff        # Interactive wizard to start a new feature
secure-sdlc status         # Show current SDLC phase and artefact status
secure-sdlc review         # Security review a file or diff
secure-sdlc gate v1.2.0    # Run pre-release security gate check
secure-sdlc install-mcp    # Install MCP server for Cursor / Claude Code / Windsurf
secure-sdlc paths          # Show package root + MCP path (after npm install -g)
```

---

## Git hooks

Included in `hooks/`:

- **`pre-commit`** — secret detection, lock file checks, security anti-pattern scan
- **`pre-push`** — artefact gate for protected branches, open finding check

Install:
```bash
bash /path/to/secure-sdlc-agents/hooks/install.sh
# OR via CLI:
secure-sdlc init  # installs hooks automatically
```

---

## GitHub Actions

`.github/workflows/secure-sdlc-gate.yml` adds:

- **Artefact gate** — blocks PRs to main/master if required security docs are missing
- **Secret scanning** (Gitleaks)
- **Dependency audit** (npm audit, pip-audit)
- **IaC scanning** (Checkov — Terraform, K8s, Docker)
- **SAST** (CodeQL — JavaScript/TypeScript, Python)
- **Release gate** — full pre-release checklist on `workflow_dispatch`

Copy to your project:
```bash
mkdir -p .github/workflows
cp /path/to/secure-sdlc-agents/.github/workflows/secure-sdlc-gate.yml .github/workflows/
```

---

## Stack profiles

Deep, framework-specific security guidance in `stacks/`:

| Stack | Profile |
|---|---|
| Next.js | [`stacks/nextjs.md`](stacks/nextjs.md) — Server Actions, API routes, CSP, CORS |
| FastAPI | [`stacks/fastapi.md`](stacks/fastapi.md) — Depends() auth, Pydantic, CORS, rate limiting |
| Django | [`stacks/django.md`](stacks/django.md) — CSRF, strong params, ORM injection, production settings |
| Express.js | [`stacks/express.md`](stacks/express.md) — helmet, rate limiting, CSRF, Zod validation |
| Ruby on Rails | [`stacks/rails.md`](stacks/rails.md) — Brakeman, Pundit, strong parameters, credentials |

---

## Warp terminal workflows

In `warp-workflows/` — import into Warp for one-click SDLC automation:

| Workflow | Trigger |
|---|---|
| Feature Kickoff | Start a new feature with requirements + risk register |
| PR Security Review | dev-lead + appsec review on a PR |
| Threat Model | STRIDE threat model on an architecture |
| Release Gate | Full pre-release security gate |
| SDLC Status | Check which phases are complete |

---

## Document templates

`docs/templates/` contains pre-formatted templates for every artefact:

| Template | Produced by | Phase |
|---|---|---|
| `security-requirements.md` | product-manager | Plan |
| `risk-register.md` | grc-analyst | Plan → ongoing |
| `threat-model.md` | appsec-engineer | Design |
| `infra-security-review.md` | cloud-platform-engineer | Design |
| `sast-findings.md` | appsec-engineer + dev-lead | Build |
| `test-security-report.md` | appsec-engineer | Test |
| `release-sign-off.md` | release-manager | Release |
| `compliance-attestation.md` | grc-analyst | Release |

---

## Worked examples

| Example | Feature type | Key security lessons |
|---|---|---|
| [`01-login-feature/`](examples/01-login-feature/) | Auth flow (bcrypt, MFA, sessions) | JWT alg:none, hardcoded secrets, cost factor |
| [`02-api-endpoint/`](examples/02-api-endpoint/) | Public REST API | IDOR via UUID path param, IAM over-privilege |
| [`03-file-upload/`](examples/03-file-upload/) | File upload to S3 | SVG XSS, magic byte validation, public bucket |

---

## Project configuration

Create `secure-sdlc.yaml` in your project root:

```yaml
project:
  name: "my-app"
  stack: "Next.js + PostgreSQL"

security:
  asvs_level: L2
  frameworks: [SOC2, GDPR]
  gates:
    build_to_test:
      block_on: [CRITICAL, HIGH]
    test_to_release:
      block_on: [CRITICAL, HIGH]
```

Generate one automatically: `secure-sdlc init`

---

## A note on what these agents are — and aren't

These agents produce **guidance, not guarantees**.

They will help a team ask the right questions earlier, produce consistent artefacts,
and catch common mistakes that would otherwise slip through. They will not replace a
skilled AppSec engineer, a qualified GRC practitioner, or a thorough penetration test.

Every output should be reviewed by a human with relevant expertise before it is acted on
or used as audit evidence. The threat model is a starting point, not a final document.

Security practitioners are right to be sceptical of anything that claims to automate
security away. This project does not make that claim. It makes security practices easier
to start, easier to maintain, and harder to skip — which is most of the battle.

If you find guidance in an agent file that is wrong or dangerously out of date,
please [open an issue](.github/ISSUE_TEMPLATE/guidance-correction.md).

---

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) for sub-agent usage
- Node.js 18+ for the CLI and MCP server
- Optional: `npm install -g @kaademos/secure-sdlc` for the `secure-sdlc` command on your PATH
- Any MCP-compatible AI tool for the `sdlc_*` tools

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). High-value contributions:

- Additional compliance frameworks (HIPAA, FedRAMP, NIS2)
- Stack profiles for Go (Gin/Echo), .NET, Java Spring Boot
- More worked examples (OAuth flows, payment processing, AI features)
- Integration guides for specific SAST/DAST tools
- Translations of agent prompts

---

## Related

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Top 10 for LLMs 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST SSDF](https://csrc.nist.gov/projects/ssdf)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code)

---

## Licence

MIT — see [LICENSE](LICENSE).
