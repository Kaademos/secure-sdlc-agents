#!/usr/bin/env node
/**
 * Secure SDLC MCP Server
 *
 * Exposes the full Secure SDLC agent team as MCP tools, compatible with:
 * - Cursor (via MCP settings)
 * - Claude Code (via mcp__* tools)
 * - Windsurf, Zed, Continue, and any MCP-compliant host
 *
 * Each tool invokes the appropriate specialist agent with the right context
 * and returns structured, actionable guidance.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = join(__dirname, "../../.claude/agents");
const TEMPLATES_DIR = join(__dirname, "../../docs/templates");

function readAgentPrompt(agentName) {
  const path = join(AGENTS_DIR, `${agentName}.md`);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  // Strip YAML frontmatter
  return raw.replace(/^---[\s\S]*?---\n/, "").trim();
}

function readTemplate(templateName) {
  const path = join(TEMPLATES_DIR, `${templateName}.md`);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}

function ensureDocsDir(projectRoot) {
  const docsDir = join(projectRoot, "docs", "audit-evidence");
  mkdirSync(docsDir, { recursive: true });
  return join(projectRoot, "docs");
}

// ──────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ──────────────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "sdlc_plan_feature",
    description:
      "Start a new feature or project with secure requirements and compliance mapping. " +
      "Invokes the product-manager (ASVS requirements) and grc-analyst (risk register, framework mapping) agents. " +
      "Use this at the very beginning of any new feature, sprint, or project.",
    inputSchema: {
      type: "object",
      properties: {
        feature_description: {
          type: "string",
          description:
            "What you are building — be specific about actors, data handled, and integrations",
        },
        stack: {
          type: "string",
          description:
            "Technology stack (e.g. 'Next.js + PostgreSQL + Vercel', 'Python FastAPI + AWS')",
        },
        asvs_level: {
          type: "string",
          enum: ["L1", "L2", "L3"],
          default: "L2",
          description:
            "OWASP ASVS assurance level. L1=basic, L2=standard (default), L3=high-assurance/regulated",
        },
        compliance_frameworks: {
          type: "array",
          items: { type: "string" },
          description:
            "Applicable compliance frameworks (e.g. ['SOC2', 'GDPR', 'PCI-DSS', 'HIPAA'])",
        },
        project_root: {
          type: "string",
          description: "Absolute path to the project root directory",
        },
      },
      required: ["feature_description"],
    },
  },
  {
    name: "sdlc_threat_model",
    description:
      "Run a structured STRIDE (and optionally LINDDUN) threat model against a proposed architecture. " +
      "Invokes the appsec-engineer agent. Use after requirements are written, before implementation begins.",
    inputSchema: {
      type: "object",
      properties: {
        architecture_description: {
          type: "string",
          description:
            "Description of the architecture: components, data flows, trust boundaries, protocols, auth mechanisms",
        },
        pii_in_scope: {
          type: "boolean",
          default: false,
          description: "Set true to also run LINDDUN privacy threat modelling",
        },
        security_requirements_path: {
          type: "string",
          description:
            "Optional path to docs/security-requirements.md to anchor the model to requirements",
        },
        project_root: {
          type: "string",
          description: "Absolute path to the project root directory",
        },
      },
      required: ["architecture_description"],
    },
  },
  {
    name: "sdlc_review_pr",
    description:
      "Security review a pull request or code diff. Runs the dev-lead (secure coding, SCA) " +
      "and appsec-engineer (vulnerability triage) agents. Use before merging any PR.",
    inputSchema: {
      type: "object",
      properties: {
        pr_description: {
          type: "string",
          description: "What the PR does — describe the change",
        },
        code_diff: {
          type: "string",
          description:
            "The actual code diff or the most security-relevant changed files/functions",
        },
        pr_number: {
          type: "string",
          description: "PR number or identifier (e.g. '#42')",
        },
        language_stack: {
          type: "string",
          description:
            "Language and framework (e.g. 'TypeScript/Next.js', 'Python/FastAPI')",
        },
        new_dependencies: {
          type: "array",
          items: { type: "string" },
          description:
            "List of new packages added (e.g. ['express@4.18.2', 'jsonwebtoken@9.0.0'])",
        },
      },
      required: ["pr_description"],
    },
  },
  {
    name: "sdlc_review_infra",
    description:
      "Security review infrastructure-as-code (Terraform, Pulumi, CloudFormation, Helm, Kubernetes manifests). " +
      "Invokes the cloud-platform-engineer agent. Checks for misconfigurations, IAM issues, secrets, and hardening gaps.",
    inputSchema: {
      type: "object",
      properties: {
        iac_description: {
          type: "string",
          description: "What infrastructure is being provisioned or changed",
        },
        iac_content: {
          type: "string",
          description:
            "The IaC code to review (Terraform HCL, YAML manifests, etc.)",
        },
        cloud_provider: {
          type: "string",
          enum: ["AWS", "GCP", "Azure", "Multi-cloud", "On-prem", "Other"],
          description: "Cloud provider or deployment target",
        },
        environment: {
          type: "string",
          enum: ["development", "staging", "production"],
          description: "Target environment",
        },
      },
      required: ["iac_description"],
    },
  },
  {
    name: "sdlc_triage_sast",
    description:
      "Triage SAST (static analysis) findings from any tool — Semgrep, Snyk Code, CodeQL, Checkmarx, Bandit, etc. " +
      "Invokes the appsec-engineer agent to confirm, rate severity, and provide developer-friendly remediation.",
    inputSchema: {
      type: "object",
      properties: {
        findings: {
          type: "string",
          description:
            "The raw SAST output or a description of the findings to triage",
        },
        tool: {
          type: "string",
          description: "SAST tool that produced the findings (e.g. 'Semgrep', 'Snyk Code')",
        },
        language: {
          type: "string",
          description: "Language of the scanned code",
        },
      },
      required: ["findings"],
    },
  },
  {
    name: "sdlc_release_gate",
    description:
      "Run the pre-release security gate. Aggregates all phase artefacts, applies severity thresholds, " +
      "and produces a formal go/no-go decision. Invokes the release-manager agent. " +
      "Must be run before any production deployment.",
    inputSchema: {
      type: "object",
      properties: {
        version: {
          type: "string",
          description: "Release version (e.g. 'v1.2.0', 'v2024-10-sprint-3')",
        },
        docs_path: {
          type: "string",
          description: "Path to the docs/ directory containing all phase artefacts",
        },
        open_findings_summary: {
          type: "string",
          description:
            "Optional summary of any outstanding findings that require gate evaluation",
        },
      },
      required: ["version"],
    },
  },
  {
    name: "sdlc_check_compliance",
    description:
      "Map technical security controls to compliance framework requirements and identify gaps. " +
      "Invokes the grc-analyst agent. Use when preparing for audits or assessing compliance posture.",
    inputSchema: {
      type: "object",
      properties: {
        controls_implemented: {
          type: "string",
          description:
            "Description of security controls currently in place (or reference to docs/)",
        },
        frameworks: {
          type: "array",
          items: { type: "string" },
          description: "Frameworks to map against (e.g. ['SOC2', 'ISO27001', 'GDPR'])",
        },
        data_types: {
          type: "string",
          description:
            "Types of data processed (PII, PHI, PCI, IP, etc.) to scope framework applicability",
        },
      },
      required: ["controls_implemented", "frameworks"],
    },
  },
  {
    name: "sdlc_init_project",
    description:
      "Initialise a new project with the full Secure SDLC scaffold: docs directory, templates, " +
      "and a project security config. Returns setup instructions tailored to the detected stack.",
    inputSchema: {
      type: "object",
      properties: {
        project_root: {
          type: "string",
          description: "Absolute path to the project root directory",
        },
        project_name: {
          type: "string",
          description: "Name of the project or application",
        },
        stack: {
          type: "string",
          description: "Technology stack description",
        },
        team_size: {
          type: "string",
          enum: ["solo", "small (2-5)", "medium (6-20)", "large (20+)"],
          description: "Team size to calibrate process overhead",
        },
      },
      required: ["project_root", "project_name"],
    },
  },
  {
    name: "sdlc_security_champion",
    description:
      "First-line security review and developer coaching from the security champion perspective. " +
      "Lower friction than a full appsec review — use for quick security questions, " +
      "reviewing small changes, or when learning secure coding patterns.",
    inputSchema: {
      type: "object",
      properties: {
        question_or_code: {
          type: "string",
          description:
            "Security question to answer, or code/implementation to quickly review",
        },
        context: {
          type: "string",
          description:
            "What you are building and why — helps the champion give relevant advice",
        },
      },
      required: ["question_or_code"],
    },
  },
  {
    name: "sdlc_ai_security_review",
    description:
      "Security review for AI/LLM features: prompt injection, model poisoning, data leakage, " +
      "agent trust boundaries, and AI supply chain risks. Invokes the ai-security-engineer agent.",
    inputSchema: {
      type: "object",
      properties: {
        ai_feature_description: {
          type: "string",
          description:
            "Describe the AI/LLM feature: what model, what inputs it accepts, what it outputs, " +
            "what tools/functions it can call, and what data it accesses",
        },
        attack_surface: {
          type: "string",
          description:
            "Who can send input to the AI feature? (public users, authenticated users, internal services, etc.)",
        },
      },
      required: ["ai_feature_description"],
    },
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Tool handlers
// ──────────────────────────────────────────────────────────────────────────────

function buildPromptPrefix(agentName) {
  const prompt = readAgentPrompt(agentName);
  return prompt
    ? `You are operating as the ${agentName} agent in the Secure SDLC team.\n\n${prompt}\n\n---\n\n`
    : "";
}

function handlePlanFeature(args) {
  const { feature_description, stack, asvs_level = "L2", compliance_frameworks = [], project_root } = args;

  const pmPrompt = buildPromptPrefix("product-manager");
  const grcPrompt = buildPromptPrefix("grc-analyst");
  const template = readTemplate("security-requirements");

  let output = `${pmPrompt}`;
  output += `## Task: Produce Security Requirements + Risk Register\n\n`;
  output += `**Feature:** ${feature_description}\n`;
  if (stack) output += `**Stack:** ${stack}\n`;
  output += `**ASVS Target Level:** ${asvs_level}\n`;
  if (compliance_frameworks.length) {
    output += `**Compliance Frameworks:** ${compliance_frameworks.join(", ")}\n`;
  }
  output += `\n### Step 1 — Product Manager: Security Requirements\n\n`;
  output += `Using the elicitation checklist in your agent instructions, produce a complete `;
  output += `security-requirements.md for this feature. Map every requirement to ASVS ${asvs_level} controls.\n\n`;
  output += `Then, acting as the GRC Analyst:\n\n${grcPrompt}\n\n`;
  output += `### Step 2 — GRC Analyst: Risk Register + Compliance Mapping\n\n`;
  output += `Initialise the risk register for this feature. Identify the top 5-8 risks. `;
  if (compliance_frameworks.length) {
    output += `Map ASVS requirements to these frameworks: ${compliance_frameworks.join(", ")}. `;
  }
  output += `Produce the control mapping table.\n\n`;
  if (project_root) {
    output += `Save outputs to:\n- ${project_root}/docs/security-requirements.md\n- ${project_root}/docs/risk-register.md\n\n`;
  }
  if (template) {
    output += `Use this template for security-requirements.md:\n\n${template}\n`;
  }

  return {
    content: [{ type: "text", text: output }],
  };
}

function handleThreatModel(args) {
  const { architecture_description, pii_in_scope = false, security_requirements_path, project_root } = args;

  const prompt = buildPromptPrefix("appsec-engineer");
  const template = readTemplate("threat-model");

  let output = `${prompt}## Task: Threat Model\n\n`;
  output += `**Architecture:**\n${architecture_description}\n\n`;
  output += `Perform a complete STRIDE threat model. For each component and data flow:\n`;
  output += `1. Enumerate all STRIDE threats (Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation of Privilege)\n`;
  output += `2. Rate Likelihood (Low/Medium/High) and Impact (Medium/High/Critical)\n`;
  output += `3. Derive a Risk Rating (LOW/MEDIUM/HIGH/CRITICAL)\n`;
  output += `4. Specify a concrete mitigation\n\n`;
  if (pii_in_scope) {
    output += `Also perform **LINDDUN privacy threat modelling** — this feature handles personal data.\n\n`;
  }
  if (security_requirements_path) {
    output += `Reference the security requirements at: ${security_requirements_path}\n\n`;
  }
  output += `Produce a threat summary table and a prioritised list of mitigations for the dev team.\n\n`;
  if (project_root) {
    output += `Save output to: ${project_root}/docs/threat-model.md\n\n`;
  }
  if (template) {
    output += `Use this template:\n\n${template}\n`;
  }

  return { content: [{ type: "text", text: output }] };
}

function handleReviewPR(args) {
  const { pr_description, code_diff, pr_number, language_stack, new_dependencies = [] } = args;

  const devLeadPrompt = buildPromptPrefix("dev-lead");
  const appsecPrompt = buildPromptPrefix("appsec-engineer");

  let output = `${devLeadPrompt}## Task: Security Review${pr_number ? ` — PR ${pr_number}` : ""}\n\n`;
  output += `**Change description:** ${pr_description}\n`;
  if (language_stack) output += `**Stack:** ${language_stack}\n`;
  if (new_dependencies.length) {
    output += `**New dependencies:** ${new_dependencies.join(", ")}\n`;
  }
  output += `\n`;
  if (code_diff) {
    output += `**Code to review:**\n\`\`\`\n${code_diff}\n\`\`\`\n\n`;
  }
  output += `Using the PR checklist in your agent instructions, review this change for security issues.\n`;
  output += `Structure your feedback as: Critical/High (block merge) → Medium (should fix) → Low/Info → Positive observations.\n\n`;
  if (new_dependencies.length) {
    output += `${appsecPrompt}Also review the new dependencies for CVEs, maintenance status, and supply chain risk.\n\n`;
  }
  output += `Reference docs/security-requirements.md if it exists in the project.\n`;

  return { content: [{ type: "text", text: output }] };
}

function handleReviewInfra(args) {
  const { iac_description, iac_content, cloud_provider, environment } = args;

  const prompt = buildPromptPrefix("cloud-platform-engineer");
  const template = readTemplate("infra-security-review");

  let output = `${prompt}## Task: Infrastructure Security Review\n\n`;
  output += `**Change:** ${iac_description}\n`;
  if (cloud_provider) output += `**Cloud:** ${cloud_provider}\n`;
  if (environment) output += `**Environment:** ${environment}\n\n`;
  if (iac_content) {
    output += `**IaC to review:**\n\`\`\`\n${iac_content}\n\`\`\`\n\n`;
  }
  output += `Using the CSPM-style checklist in your agent instructions, review for:\n`;
  output += `- IAM over-privilege and least-privilege violations\n`;
  output += `- Hardcoded secrets, credentials, or sensitive values\n`;
  output += `- Network exposure and security group / NACL issues\n`;
  output += `- Unencrypted storage or data in transit\n`;
  output += `- Container/compute hardening gaps\n`;
  output += `- Dependency pinning (no 'latest' tags)\n\n`;
  if (environment === "production") {
    output += `This is a **PRODUCTION** change — apply heightened scrutiny.\n\n`;
  }
  if (template) {
    output += `Produce output using this template:\n\n${template}\n`;
  }

  return { content: [{ type: "text", text: output }] };
}

function handleTriageSAST(args) {
  const { findings, tool, language } = args;

  const prompt = buildPromptPrefix("appsec-engineer");

  let output = `${prompt}## Task: SAST Triage\n\n`;
  if (tool) output += `**Tool:** ${tool}\n`;
  if (language) output += `**Language:** ${language}\n\n`;
  output += `**Findings to triage:**\n\n${findings}\n\n`;
  output += `For each finding:\n`;
  output += `1. Confirm (true positive) or dismiss (false positive) with reasoning\n`;
  output += `2. Rate severity using CVSS 3.1 + contextual adjustments\n`;
  output += `3. Map to CWE and relevant OWASP/ASVS control\n`;
  output += `4. Provide a concrete, copy-pasteable code fix — not just "use parameterised queries"\n`;
  output += `5. Note if this blocks the Build→Test gate (CRITICAL/HIGH = block)\n`;

  return { content: [{ type: "text", text: output }] };
}

function handleReleaseGate(args) {
  const { version, docs_path, open_findings_summary } = args;

  const prompt = buildPromptPrefix("release-manager");
  const template = readTemplate("release-sign-off");

  let output = `${prompt}## Task: Pre-Release Security Gate — ${version}\n\n`;
  if (docs_path) {
    output += `**Artefacts location:** ${docs_path}\n\n`;
    output += `Review artefacts at that path. For each required document, confirm it exists and is not a blank template.\n\n`;
  }
  if (open_findings_summary) {
    output += `**Open findings requiring gate evaluation:**\n${open_findings_summary}\n\n`;
  }
  output += `Run the full pre-release security checklist from your agent instructions. `;
  output += `Produce a formal go/no-go decision with documented rationale.\n\n`;
  output += `**Severity gate rules:**\n`;
  output += `- CRITICAL unmitigated → NO-GO, no exceptions\n`;
  output += `- HIGH unmitigated without documented accepted risk → NO-GO\n`;
  output += `- MEDIUM without remediation plan or accepted risk → NO-GO\n`;
  output += `- LOW → track in risk register, does not block\n\n`;
  if (template) {
    output += `Produce output using this template:\n\n${template}\n`;
  }

  return { content: [{ type: "text", text: output }] };
}

function handleCheckCompliance(args) {
  const { controls_implemented, frameworks, data_types } = args;

  const prompt = buildPromptPrefix("grc-analyst");

  let output = `${prompt}## Task: Compliance Gap Analysis\n\n`;
  output += `**Frameworks in scope:** ${frameworks.join(", ")}\n`;
  if (data_types) output += `**Data types processed:** ${data_types}\n\n`;
  output += `**Controls currently implemented:**\n${controls_implemented}\n\n`;
  output += `Produce:\n`;
  output += `1. A control mapping table: for each ASVS requirement, map to applicable controls in the requested frameworks\n`;
  output += `2. A gap analysis: which framework controls are not satisfied by current controls\n`;
  output += `3. Risk rating for each gap\n`;
  output += `4. Recommended remediation priority order\n`;

  return { content: [{ type: "text", text: output }] };
}

function handleInitProject(args) {
  const { project_root, project_name, stack, team_size = "small (2-5)" } = args;

  let output = `# Secure SDLC Initialisation — ${project_name}\n\n`;
  output += `Project: \`${project_root}\`\n`;
  if (stack) output += `Stack: ${stack}\n`;
  output += `Team size: ${team_size}\n\n`;

  output += `## What to do next\n\n`;
  output += `### 1. Create your docs directory\n\`\`\`bash\nmkdir -p ${project_root}/docs/audit-evidence\n\`\`\`\n\n`;
  output += `### 2. Copy templates\n\`\`\`bash\ncp /path/to/secure-sdlc-agents/docs/templates/* ${project_root}/docs/\n\`\`\`\n\n`;
  output += `### 3. Install git hooks\n\`\`\`bash\ncp /path/to/secure-sdlc-agents/hooks/pre-commit ${project_root}/.git/hooks/\nchmod +x ${project_root}/.git/hooks/pre-commit\n\`\`\`\n\n`;
  output += `### 4. Start the Plan phase\n`;
  output += `Use the \`sdlc_plan_feature\` tool with your first feature description.\n\n`;
  output += `### 5. Phase sequence\n`;
  output += `PLAN → DESIGN → BUILD → TEST → RELEASE\n\n`;
  output += `Each phase gate must be passed before proceeding. See CLAUDE.md for orchestration rules.\n`;

  return { content: [{ type: "text", text: output }] };
}

function handleSecurityChampion(args) {
  const { question_or_code, context } = args;

  const prompt = readAgentPrompt("security-champion");
  const champPrompt = prompt
    ? `You are a Security Champion — a developer who champions security within the team without being a blocker.\n\n${prompt}\n\n---\n\n`
    : `You are a Security Champion — a developer-friendly security advocate. Give practical, actionable security advice. `;

  let output = `${champPrompt}## Question / Review Request\n\n`;
  if (context) output += `**Context:** ${context}\n\n`;
  output += `${question_or_code}\n\n`;
  output += `Respond with:\n- A direct answer / assessment\n- Concrete recommendations with code examples where helpful\n- Links to OWASP or relevant standards if applicable\n- Severity if this is a finding (and whether it blocks or warns)\n`;

  return { content: [{ type: "text", text: output }] };
}

function handleAISecurityReview(args) {
  const { ai_feature_description, attack_surface } = args;

  const prompt = readAgentPrompt("ai-security-engineer");
  const agentPrompt = prompt
    ? `You are the AI Security Engineer agent.\n\n${prompt}\n\n---\n\n`
    : `You are an AI/LLM Security Engineer specialising in 2026-era AI application security.\n\n`;

  let output = `${agentPrompt}## Task: AI Feature Security Review\n\n`;
  output += `**Feature:** ${ai_feature_description}\n`;
  if (attack_surface) output += `**Attack surface / who can send input:** ${attack_surface}\n\n`;
  output += `Review for:\n`;
  output += `1. **Prompt injection** — can an attacker manipulate the model's behaviour via user input?\n`;
  output += `2. **Indirect prompt injection** — can retrieved documents/web content contain injected instructions?\n`;
  output += `3. **Data exfiltration** — can the model be made to leak training data or system prompts?\n`;
  output += `4. **Agentic trust boundaries** — if the AI can call tools/functions, what can it be tricked into doing?\n`;
  output += `5. **Model supply chain** — is the model from a trusted, verified source with known provenance?\n`;
  output += `6. **Output validation** — are AI outputs validated before being used in downstream systems?\n`;
  output += `7. **PII leakage** — is user data being sent to external model APIs without consent?\n`;
  output += `8. **Rate limiting and abuse** — can the AI feature be abused for SSRF, data scraping, etc.?\n\n`;
  output += `Map findings to OWASP Top 10 for LLMs 2025 where applicable.\n`;

  return { content: [{ type: "text", text: output }] };
}

// ──────────────────────────────────────────────────────────────────────────────
// Server setup
// ──────────────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "secure-sdlc", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "sdlc_plan_feature":        return handlePlanFeature(args);
    case "sdlc_threat_model":        return handleThreatModel(args);
    case "sdlc_review_pr":           return handleReviewPR(args);
    case "sdlc_review_infra":        return handleReviewInfra(args);
    case "sdlc_triage_sast":         return handleTriageSAST(args);
    case "sdlc_release_gate":        return handleReleaseGate(args);
    case "sdlc_check_compliance":    return handleCheckCompliance(args);
    case "sdlc_init_project":        return handleInitProject(args);
    case "sdlc_security_champion":   return handleSecurityChampion(args);
    case "sdlc_ai_security_review":  return handleAISecurityReview(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
