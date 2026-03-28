import { resolve } from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import { printBanner, printPhase } from "../utils/banner.js";
import { detectStack } from "../utils/stack-detect.js";

/**
 * Interactive feature kickoff wizard.
 *
 * Guides the developer through the information needed to kick off a new
 * feature with full Secure SDLC coverage, then generates the exact
 * claude --agent commands (or MCP calls) to execute each phase.
 */
export default async function kickoff(options) {
  const projectRoot = resolve(options.path || process.cwd());

  printBanner();
  console.log(chalk.bold("Feature Security Kickoff Wizard\n"));
  console.log(chalk.dim("Answer a few questions to generate your Secure SDLC plan.\n"));

  const stack = detectStack(projectRoot);

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "featureName",
      message: "Feature name:",
      validate: (v) => v.trim().length > 2 || "Please enter a feature name",
    },
    {
      type: "input",
      name: "featureDescription",
      message: "What does this feature do? (be specific about actors, data, integrations):",
      validate: (v) => v.trim().length > 10 || "Please describe the feature",
    },
    {
      type: "input",
      name: "stack",
      message: "Technology stack:",
      default: stack.display !== "Unknown" ? stack.display : undefined,
    },
    {
      type: "list",
      name: "asvsLevel",
      message: "OWASP ASVS assurance level:",
      choices: [
        { name: "L1 — Basic (low-risk internal tools)", value: "L1" },
        { name: "L2 — Standard (most applications)  ← recommended", value: "L2" },
        { name: "L3 — High-assurance (regulated, high-risk)", value: "L3" },
      ],
      default: "L2",
    },
    {
      type: "checkbox",
      name: "complianceFrameworks",
      message: "Compliance frameworks in scope (select all that apply):",
      choices: [
        { name: "SOC 2 Type II", value: "SOC2" },
        { name: "ISO 27001:2022", value: "ISO27001" },
        { name: "GDPR / UK GDPR", value: "GDPR" },
        { name: "PCI DSS v4.0", value: "PCI-DSS" },
        { name: "HIPAA", value: "HIPAA" },
        { name: "NIST CSF 2.0", value: "NIST_CSF" },
        { name: "DORA", value: "DORA" },
        { name: "FedRAMP", value: "FedRAMP" },
        { name: "None / Not sure", value: "none" },
      ],
    },
    {
      type: "checkbox",
      name: "dataTypes",
      message: "What data does this feature handle?",
      choices: [
        { name: "User credentials (passwords, tokens)", value: "credentials" },
        { name: "Personal Identifiable Information (PII)", value: "pii" },
        { name: "Payment / financial data", value: "payment" },
        { name: "Health / medical data (PHI)", value: "phi" },
        { name: "File uploads", value: "files" },
        { name: "Third-party API integrations", value: "integrations" },
        { name: "AI / LLM model calls", value: "ai" },
        { name: "No sensitive data", value: "none" },
      ],
    },
    {
      type: "confirm",
      name: "hasInfra",
      message: "Does this feature include infrastructure changes (Terraform, K8s, AWS config, etc.)?",
      default: false,
    },
    {
      type: "list",
      name: "toolPreference",
      message: "How do you invoke agents?",
      choices: [
        { name: "Claude Code (claude --agent ...)", value: "claude-code" },
        { name: "Cursor MCP (sdlc_* tools)", value: "cursor-mcp" },
        { name: "Both", value: "both" },
      ],
    },
  ]);

  // Generate the plan
  const frameworks = answers.complianceFrameworks.filter((f) => f !== "none");
  const hasPii = answers.dataTypes.includes("pii") || answers.dataTypes.includes("phi");
  const hasAI = answers.dataTypes.includes("ai");
  const hasFiles = answers.dataTypes.includes("files");

  console.log("\n");
  console.log(chalk.bold.green("═".repeat(60)));
  console.log(chalk.bold.green(`  Secure SDLC Plan: ${answers.featureName}`));
  console.log(chalk.bold.green("═".repeat(60)));

  // ── PLAN ──────────────────────────────────────────────────────
  printPhase("PLAN", "Define secure requirements and risk register");

  if (answers.toolPreference !== "cursor-mcp") {
    console.log(chalk.bold("1. Product Manager — Security Requirements:"));
    console.log(chalk.cyan(`
  claude --agent product-manager \\
    "Define security requirements for: ${answers.featureDescription}. \\
     Stack: ${answers.stack}. ASVS ${answers.asvsLevel}.${
       frameworks.length ? ` Compliance: ${frameworks.join(", ")}.` : ""
     }"
`));

    console.log(chalk.bold("2. GRC Analyst — Risk Register:"));
    console.log(chalk.cyan(`
  claude --agent grc-analyst \\
    "Initialise risk register for ${answers.featureName}.${
      frameworks.length ? ` Map to ${frameworks.join(", ")}.` : ""
    }"
`));
  }

  if (answers.toolPreference !== "claude-code") {
    console.log(chalk.bold("MCP equivalent:"));
    console.log(chalk.dim(`
  sdlc_plan_feature({
    feature_description: "${answers.featureDescription}",
    stack: "${answers.stack}",
    asvs_level: "${answers.asvsLevel}",
    ${frameworks.length ? `compliance_frameworks: [${frameworks.map((f) => `"${f}"`).join(", ")}],` : ""}
    project_root: "${projectRoot}"
  })
`));
  }

  // ── DESIGN ────────────────────────────────────────────────────
  printPhase("DESIGN", "Threat model and infrastructure review");
  console.log(chalk.dim("(Run after requirements are written and architecture is defined)\n"));

  if (answers.toolPreference !== "cursor-mcp") {
    console.log(chalk.bold("3. AppSec Engineer — Threat Model:"));
    console.log(chalk.cyan(`
  claude --agent appsec-engineer \\
    "Threat model ${answers.featureName} using STRIDE.${hasPii ? " Also run LINDDUN — PII in scope." : ""} \\
     Architecture: [describe your components and data flows]"
`));

    if (answers.hasInfra) {
      console.log(chalk.bold("4. Cloud/Platform Engineer — Infra Review:"));
      console.log(chalk.cyan(`
  claude --agent cloud-platform-engineer \\
    "Review infrastructure changes for ${answers.featureName}: [describe IaC changes]"
`));
    }
  }

  if (answers.toolPreference !== "claude-code") {
    console.log(chalk.bold("MCP equivalent:"));
    console.log(chalk.dim(`
  sdlc_threat_model({
    architecture_description: "[describe architecture]",
    pii_in_scope: ${hasPii},
    project_root: "${projectRoot}"
  })
`));
  }

  // ── BUILD ─────────────────────────────────────────────────────
  printPhase("BUILD", "Secure code review on every PR");

  if (answers.toolPreference !== "cursor-mcp") {
    console.log(chalk.bold("5. Dev Lead — PR Review (run on every PR):"));
    console.log(chalk.cyan(`
  claude --agent dev-lead "Review PR #[N] — [brief PR description]"
  claude --agent appsec-engineer "Triage any SAST findings for PR #[N]"
`));
  }

  if (answers.toolPreference !== "claude-code") {
    console.log(chalk.bold("MCP equivalent:"));
    console.log(chalk.dim(`
  sdlc_review_pr({
    pr_description: "[what the PR does]",
    code_diff: "[paste diff or key code sections]",
    language_stack: "${answers.stack}"
  })
`));
  }

  // Special cases
  if (hasFiles) {
    console.log(chalk.yellow(`\n  ⚠  File upload detected — ensure:`));
    console.log(chalk.dim(`     • Content-type validated by magic bytes, not client MIME`));
    console.log(chalk.dim(`     • Original filenames never used as storage keys`));
    console.log(chalk.dim(`     • SVG explicitly blocked (it's XML, can contain scripts)`));
    console.log(chalk.dim(`     • Malware scan before files become accessible to others\n`));
  }

  if (hasAI) {
    console.log(chalk.yellow(`\n  ⚠  AI/LLM features detected — also run:`));
    console.log(chalk.cyan(`
  claude --agent ai-security-engineer \\
    "Security review the AI feature: [describe model usage, inputs, tools/functions it can call]"
  # OR: sdlc_ai_security_review({ ai_feature_description: "..." })
`));
  }

  // ── TEST ──────────────────────────────────────────────────────
  printPhase("TEST", "DAST, penetration testing, and audit evidence");

  if (answers.toolPreference !== "cursor-mcp") {
    console.log(chalk.bold("6. AppSec Engineer — DAST Findings:"));
    console.log(chalk.cyan(`
  claude --agent appsec-engineer \\
    "Interpret these DAST findings for ${answers.featureName}: [paste ZAP/Burp output]"
`));
  }

  // ── RELEASE ───────────────────────────────────────────────────
  printPhase("RELEASE", "Go/no-go security gate");

  if (answers.toolPreference !== "cursor-mcp") {
    console.log(chalk.bold("7. Release Manager — Security Gate:"));
    console.log(chalk.cyan(`
  claude --agent release-manager \\
    "Run pre-release security checklist for v[X.Y.Z] — ${answers.featureName}"
`));
  }

  if (answers.toolPreference !== "claude-code") {
    console.log(chalk.bold("MCP equivalent:"));
    console.log(chalk.dim(`
  sdlc_release_gate({
    version: "v1.0.0",
    docs_path: "${projectRoot}/docs"
  })
`));
  }

  // ── SEVERITY REMINDERS ────────────────────────────────────────
  console.log("\n" + chalk.bold("Severity gates:\n"));
  console.log(chalk.red("  CRITICAL → blocks all gates, no exceptions"));
  console.log(chalk.yellow("  HIGH     → blocks Build→Test and Test→Release without documented accepted risk"));
  console.log(chalk.blue("  MEDIUM   → requires remediation plan or accepted risk before release"));
  console.log(chalk.dim("  LOW      → tracked in risk register, does not block\n"));

  console.log(chalk.bold("Track progress:\n"));
  console.log(chalk.dim("  secure-sdlc status   # Check which artefacts are complete\n"));
}
