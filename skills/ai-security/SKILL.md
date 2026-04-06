---
name: ai-security
description: >
  Use when building any feature that calls an LLM API, processes user input sent to
  a model, uses RAG or embeddings, deploys an AI agent with tool access, or makes
  AI-generated output visible to users or downstream systems.
---

# AI Security

## Overview

This skill applies structured security analysis to AI and LLM-powered features.
The threat categories here — prompt injection, excessive agency, output misuse,
supply chain — did not exist before 2023 and are still being misunderstood by
most developers shipping AI features today.

**Working assumption: every model is a trust boundary, not a trusted component.**
Model outputs must be treated as untrusted user input to every downstream system.

**Reference framework:** OWASP Top 10 for LLMs 2025 (LLM01–LLM10).

## When to Use

- Any code that calls an LLM API (OpenAI, Anthropic, Google, Mistral, self-hosted)
- Any feature that sends user-supplied content to a model
- RAG systems, embeddings, vector databases, or retrieval pipelines
- AI agents with tool access (file system, HTTP requests, database writes, email)
- Features where model output is rendered in UI, executed as code, or used in queries
- Selecting or integrating a third-party model, fine-tune, or embedding

## Process

### Step 1 — Map the attack surface

Before finding vulnerabilities, enumerate:

| Question | Why it matters |
|---|---|
| Who sends input to the model? | Determines direct injection risk |
| What external sources feed the prompt context? | Determines indirect injection risk |
| What tools / functions can the model invoke? | Determines excessive agency blast radius |
| What happens to the model's output? | Determines output handling risk |
| Is user PII sent to a third-party API? | Determines data leakage and legal risk |
| Where does the model or its weights come from? | Determines supply chain risk |

### Step 2 — Assess prompt injection risk (LLM01, LLM07)

**Input trust classification:**

| Input Source | Trust Level | Injection Risk |
|---|---|---|
| Authenticated user (UI) | LOW | Direct prompt injection |
| Public / unauthenticated user | UNTRUSTED | Direct + jailbreak attempts |
| Retrieved document (RAG) | UNTRUSTED | Indirect prompt injection |
| Tool / function call result | MEDIUM | Injection via external API response |
| Database query result | MEDIUM | Injection via poisoned records |
| Web scraping / search | UNTRUSTED | Indirect injection |

**Mitigations to verify:**
- [ ] User input is structurally separated from system instructions (not just concatenated)
- [ ] Retrieved content is sanitised before injection into prompt context
- [ ] Known injection patterns are filtered (defence in depth — not a complete defence alone)
- [ ] System prompt does not contain secrets — assume a motivated attacker can extract it
- [ ] The model cannot override its own instructions via the user turn

### Step 3 — Assess excessive agency (LLM06)

Excessive agency is the most dangerous risk for agentic systems. A model tricked via
prompt injection into misusing its tool access can exfiltrate data, delete records,
or send external requests — all without the user's knowledge.

**Review checklist:**
- [ ] What write operations can the model trigger? Can it be tricked into deleting or exfiltrating?
- [ ] Can the model send external HTTP requests, emails, or webhooks? Via injected instructions?
- [ ] Does the model have access to credentials or secrets? Can they be extracted in output?
- [ ] Are tool call parameters validated before execution — or does raw model output go to the function?
- [ ] Is there a human-in-the-loop approval step for high-impact or irreversible operations?
- [ ] Does the model have access to only what it needs for this specific task (least privilege)?

**Key principle:** model outputs are untrusted input. Validate before acting. Require explicit
human confirmation for destructive or high-value operations.

### Step 4 — Assess output handling (LLM05)

| Model output used as… | Risk | Required mitigation |
|---|---|---|
| Rendered in HTML / DOM | Stored XSS | DOMPurify, output encoding |
| Executed as code | Remote code execution | Never execute model output directly |
| Inserted into SQL queries | SQL injection | Parameterise all queries; validate schema |
| Used in HTTP requests | SSRF | Validate and allowlist URLs from model output |
| Passed to shell commands | Command injection | Never pass model output to shell |
| Used as a file path | Path traversal | Validate against allowlist of permitted paths |
| Used for access control decisions | Privilege escalation | Never use model output for authorisation alone |

### Step 5 — Assess supply chain (LLM03) and data leakage

**Supply chain:**
- [ ] Model sourced from a known, reputable provider
- [ ] Fine-tuning inputs (if any) were sanitised and reviewed before use
- [ ] Embedding model is standard and well-audited — not a third-party unknown
- [ ] Update policy defined: how will you know if a model you depend on has a security issue?

**Data leakage:**
- [ ] PII minimised before sending to external model APIs
- [ ] Legal basis confirmed for sending user data to the model provider
- [ ] Data residency requirements checked against the model API's guarantees
- [ ] Model API calls (prompts + outputs) are logged for audit — but raw PII is not in logs

### Step 6 — Produce the output document

```markdown
## AI Security Review: [Feature Name]

### Attack Surface Summary
[Inputs, model access, tools available, output usage]

### Threat Findings

| ID | OWASP LLM Category | Severity | Description | Mitigation |
|----|--------------------|----------|-------------|------------|
| AI-001 | LLM01: Prompt Injection | HIGH | [Description] | [Concrete fix] |

### Mitigations Required Before Release
[Priority list with owners and references]

### Accepted Risks
[Any risks accepted with justification and approver]
```

## Common Rationalizations

| Excuse | Counter |
|---|---|
| "The model won't do harmful things — it's aligned" | Alignment is not a security boundary. Prompt injection bypasses alignment systematically. |
| "Our users are trusted — no injection risk" | Indirect injection comes from retrieved documents, not users. Malicious content in your RAG source is an injection vector. |
| "We validate the model output in the UI" | XSS prevention in the UI is correct but insufficient. Validate at every trust boundary, not just display. |
| "It's a read-only agent — no write tools" | Is it truly read-only? Check every tool definition. HTTP GET requests can trigger side effects in external systems. |
| "We use a well-known model — supply chain is fine" | Supply chain risk includes fine-tunes, LoRA adapters, embedding models, and model API intermediaries — not just the base model. |
| "We'll add rate limiting later" | LLM cost exhaustion attacks (LLM10) are cheaper than traditional DoS. Rate limit before you ship. |

## Red Flags

- User-supplied text concatenated directly into the system prompt with no structural separation
- Retrieved document content injected into the prompt without sanitisation
- A model that can trigger HTTP requests, file writes, or external service calls without a human approval step for high-impact actions
- Model output rendered in the DOM without sanitisation
- Model output used in a SQL query, shell command, or file path without validation
- API keys or secrets present in the system prompt
- No per-user rate limiting on endpoints that trigger model calls
- A third-party embedding model or fine-tune with no documented provenance

## Verification

Do not close this review until:

- [ ] All LLM01–LLM10 categories have been explicitly assessed
- [ ] Every HIGH/CRITICAL finding has a concrete mitigation with an owner
- [ ] Model output handling is validated at every downstream trust boundary
- [ ] Tool access follows least-privilege — model has only what it needs for this task
- [ ] Rate limiting and cost controls are in place
- [ ] AI security findings are reflected in the main threat model (`docs/threat-model.md`)
- [ ] Any data leakage findings are reviewed by `grc-analyst` for GDPR/compliance implications
