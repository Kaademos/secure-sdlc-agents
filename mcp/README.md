# Secure SDLC — MCP Server

This MCP server exposes the full Secure SDLC agent team as structured tools, compatible with **any MCP-compliant AI coding tool**:

- **Cursor** (via MCP settings JSON)
- **Claude Code** (via `claude mcp add`)
- **Windsurf / Cascade**
- **Zed AI**
- **Continue.dev**
- Any other tool implementing the [Model Context Protocol](https://modelcontextprotocol.io)

---

## Available tools

| Tool | What it does |
|---|---|
| `sdlc_plan_feature` | ASVS requirements + risk register for a new feature |
| `sdlc_threat_model` | STRIDE (+ LINDDUN) threat model against your architecture |
| `sdlc_review_pr` | Security review a PR — dev-lead + appsec-engineer |
| `sdlc_review_infra` | IaC security review (Terraform, Helm, K8s, etc.) |
| `sdlc_triage_sast` | Triage SAST findings from any tool |
| `sdlc_release_gate` | Pre-release go/no-go security gate |
| `sdlc_check_compliance` | Map controls to SOC 2, ISO 27001, GDPR, PCI DSS, etc. |
| `sdlc_init_project` | Scaffold a new project with Secure SDLC structure |
| `sdlc_security_champion` | Quick security Q&A and lightweight code review |
| `sdlc_ai_security_review` | Security review for AI/LLM features |

---

## Installation

### Prerequisites

- Node.js 18+

### Dependencies

If you use the **published npm package** `@kaademos/secure-sdlc`, install it globally (or use `npx`); the Model Context Protocol SDK is installed as a dependency of that package, and the server path is shown by `secure-sdlc paths`.

If you **cloned the repository**, install from the **repo root** (not only `mcp/`):

```bash
cd /path/to/secure-sdlc-agents
npm install
```

The `mcp/` folder alone is not meant to be published; `mcp/package.json` is marked `private`.

---

## Cursor setup

Add to your Cursor MCP settings (`~/.cursor/mcp.json` or workspace `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "secure-sdlc": {
      "command": "node",
      "args": ["/absolute/path/to/secure-sdlc-agents/mcp/src/server.js"]
    }
  }
}
```

Then restart Cursor. The `sdlc_*` tools will appear in Cursor's agent tool list.

---

## Claude Code setup

```bash
claude mcp add secure-sdlc -- node /absolute/path/to/secure-sdlc-agents/mcp/src/server.js
```

---

## Windsurf / Cascade setup

Add to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "secure-sdlc": {
      "command": "node",
      "args": ["/absolute/path/to/secure-sdlc-agents/mcp/src/server.js"]
    }
  }
}
```

---

## Usage examples

### In any MCP-enabled chat/agent session:

```
Use sdlc_plan_feature to define security requirements for a user authentication 
feature with email/password + TOTP. Stack is Next.js + Supabase. ASVS L2.
```

```
Use sdlc_review_pr to security review this code diff: [paste diff]
```

```
Use sdlc_threat_model on this architecture: React SPA → API Gateway → 
Lambda functions → RDS PostgreSQL. Auth via Cognito User Pools.
```

```
Use sdlc_release_gate for v2.1.0. Docs are at ./docs/
```
