import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import chalk from "chalk";
import { printBanner } from "../utils/banner.js";

const REQUIRED_ARTEFACTS = [
  { path: "docs/security-requirements.md", agent: "product-manager", phase: "PLAN", required: true },
  { path: "docs/risk-register.md",          agent: "grc-analyst",       phase: "PLAN", required: true },
  { path: "docs/threat-model.md",           agent: "appsec-engineer",   phase: "DESIGN", required: true },
  { path: "docs/infra-security-review.md",  agent: "cloud-platform-engineer", phase: "DESIGN", required: false },
  { path: "docs/sast-findings.md",          agent: "appsec-engineer",   phase: "BUILD", required: true },
  { path: "docs/test-security-report.md",   agent: "appsec-engineer",   phase: "TEST",  required: true },
];

function isTemplate(content) {
  return (
    content.includes("[Feature Name]") ||
    content.includes("[YYYY-MM-DD]") ||
    (content.includes("[Brief description") && content.length < 2000)
  );
}

export default async function gate(version, options) {
  const projectRoot = resolve(options.path || process.cwd());

  printBanner();
  console.log(chalk.bold(`Pre-Release Security Gate — ${version}\n`));
  console.log(chalk.dim(`Project: ${projectRoot}\n`));

  let blockers = [];
  let warnings = [];
  let passed = [];

  // 1. Check artefacts
  console.log(chalk.bold("Artefact Check\n"));

  for (const artefact of REQUIRED_ARTEFACTS) {
    const abs = join(projectRoot, artefact.path);
    const exists = existsSync(abs);

    if (!exists) {
      const msg = `MISSING: ${artefact.path} (${artefact.agent} — ${artefact.phase} phase)`;
      if (artefact.required) {
        blockers.push(msg);
        console.log(chalk.red(`  ✗ ${msg}`));
      } else {
        warnings.push(msg);
        console.log(chalk.yellow(`  ~ ${msg} [optional]`));
      }
    } else {
      const content = readFileSync(abs, "utf-8");
      if (isTemplate(content)) {
        const msg = `TEMPLATE UNFILLED: ${artefact.path} — appears to be the blank template`;
        blockers.push(msg);
        console.log(chalk.red(`  ✗ ${msg}`));
      } else {
        passed.push(artefact.path);
        console.log(chalk.green(`  ✓ ${artefact.path}`));
      }
    }
  }

  // 2. Check for CRITICAL/HIGH patterns in artefacts (heuristic)
  console.log(chalk.bold("\nFinding Severity Scan (heuristic)\n"));

  const findingsPath = join(projectRoot, "docs/sast-findings.md");
  const testReportPath = join(projectRoot, "docs/test-security-report.md");

  let findingIssues = [];

  for (const docPath of [findingsPath, testReportPath]) {
    if (existsSync(docPath)) {
      const content = readFileSync(docPath, "utf-8");
      const lines = content.split("\n");

      // Look for open CRITICAL or HIGH findings
      const openCritical = lines.filter(
        (l) =>
          l.match(/CRITICAL/i) &&
          !l.match(/resolved|mitigated|closed|false positive/i)
      );
      const openHigh = lines.filter(
        (l) =>
          l.match(/\bHIGH\b/i) &&
          !l.match(/resolved|mitigated|closed|false positive/i)
      );

      const docName = docPath.split("/").pop();
      if (openCritical.length) {
        const msg = `Possible open CRITICAL finding in ${docName} — confirm status`;
        blockers.push(msg);
        console.log(chalk.red(`  ✗ ${msg}`));
      }
      if (openHigh.length > 0 && openCritical.length === 0) {
        const msg = `Possible open HIGH finding in ${docName} — confirm status or document accepted risk`;
        warnings.push(msg);
        console.log(chalk.yellow(`  ~ ${msg}`));
      }
      if (!openCritical.length && !openHigh.length) {
        console.log(chalk.green(`  ✓ No obvious open CRITICAL/HIGH in ${docName}`));
      }
    }
  }

  // 3. Decision
  console.log(chalk.bold("\nGate Decision\n"));

  if (blockers.length === 0) {
    console.log(chalk.bold.green("✅ GO — all gate criteria met\n"));
    if (warnings.length) {
      console.log(chalk.yellow("Warnings (review before deploying):"));
      warnings.forEach((w) => console.log(chalk.dim(`  • ${w}`)));
    }
    console.log(chalk.dim("\nGenerate formal sign-off:"));
    console.log(chalk.dim(`  claude --agent release-manager "Run pre-release security checklist for ${version}"`));
    console.log(chalk.dim(`  # OR: sdlc_release_gate({ version: "${version}", docs_path: "${projectRoot}/docs" })`));
  } else {
    console.log(chalk.bold.red("🚫 NO-GO — the following must be resolved:\n"));
    blockers.forEach((b, i) => {
      console.log(chalk.red(`  ${i + 1}. ${b}`));
    });
    if (warnings.length) {
      console.log(chalk.yellow("\nAdditional warnings:"));
      warnings.forEach((w) => console.log(chalk.dim(`  • ${w}`)));
    }
    console.log(chalk.dim("\nFor each blocker: resolve the finding, then re-run: secure-sdlc gate " + version));
    process.exit(1);
  }
}
