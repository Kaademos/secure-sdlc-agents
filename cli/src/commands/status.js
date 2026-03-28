import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import chalk from "chalk";
import { printBanner } from "../utils/banner.js";
import { detectStack } from "../utils/stack-detect.js";

const PHASES = ["PLAN", "DESIGN", "BUILD", "TEST", "RELEASE"];

const PHASE_ARTEFACTS = {
  PLAN:    ["docs/security-requirements.md", "docs/risk-register.md"],
  DESIGN:  ["docs/threat-model.md", "docs/infra-security-review.md"],
  BUILD:   ["docs/sast-findings.md"],
  TEST:    ["docs/test-security-report.md"],
  RELEASE: ["docs/release-security-sign-off.md"],
};

const PHASE_AGENTS = {
  PLAN:    ["product-manager", "grc-analyst"],
  DESIGN:  ["appsec-engineer", "cloud-platform-engineer"],
  BUILD:   ["dev-lead", "appsec-engineer"],
  TEST:    ["appsec-engineer", "dev-lead", "grc-analyst"],
  RELEASE: ["release-manager", "grc-analyst", "cloud-platform-engineer"],
};

const PHASE_COLORS = {
  PLAN:    chalk.blue,
  DESIGN:  chalk.magenta,
  BUILD:   chalk.yellow,
  TEST:    chalk.cyan,
  RELEASE: chalk.green,
};

function isTemplate(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    return (
      content.includes("[Feature Name]") ||
      content.includes("[YYYY-MM-DD]") ||
      content.includes("[Brief description") ||
      content.includes("## Feature: [")
    );
  } catch {
    return false;
  }
}

export default async function status(options) {
  const projectRoot = resolve(options.path || process.cwd());

  printBanner();

  const stack = detectStack(projectRoot);
  console.log(chalk.bold(`Project: ${projectRoot}`));
  if (stack.name !== "unknown") {
    console.log(chalk.dim(`Stack: ${stack.display}\n`));
  }

  let currentPhase = null;
  let phaseComplete = {};

  console.log(chalk.bold("SDLC Phase Status\n"));

  for (const phase of PHASES) {
    const artefacts = PHASE_ARTEFACTS[phase];
    const colorFn = PHASE_COLORS[phase];
    let allPresent = true;
    let results = [];

    for (const rel of artefacts) {
      const abs = join(projectRoot, rel);
      const exists = existsSync(abs);
      const template = exists && isTemplate(abs);

      results.push({ rel, exists, template });
      if (!exists || template) allPresent = false;
    }

    phaseComplete[phase] = allPresent;
    if (!currentPhase && !allPresent) currentPhase = phase;

    const phaseLabel = colorFn(` ${phase} `);
    const status = allPresent
      ? chalk.green("✓ COMPLETE")
      : results.some((r) => r.exists && !r.template)
        ? chalk.yellow("◑ IN PROGRESS")
        : chalk.dim("○ NOT STARTED");

    console.log(`  ${phaseLabel} ${status}`);

    for (const r of results) {
      const icon = r.exists && !r.template ? chalk.green("✓") : r.exists && r.template ? chalk.yellow("~") : chalk.dim("○");
      const label = r.exists && r.template ? chalk.dim(`${r.rel} (template — not filled)`) : chalk.dim(r.rel);
      console.log(`      ${icon} ${label}`);
    }
    console.log();
  }

  // Current phase recommendation
  if (currentPhase) {
    console.log(chalk.bold(`Current phase: ${PHASE_COLORS[currentPhase](currentPhase)}\n`));
    console.log(chalk.bold("Agents to invoke:"));
    PHASE_AGENTS[currentPhase].forEach((a) => {
      console.log(chalk.dim(`  • ${a}`));
    });
    console.log();
    console.log(chalk.bold("Quick start:"));
    console.log(chalk.dim(`  secure-sdlc kickoff    # Interactive wizard`));
    console.log(chalk.dim(`  secure-sdlc review     # Security review current changes`));

    if (currentPhase === "RELEASE") {
      console.log(chalk.dim(`  secure-sdlc gate v1.0.0  # Run pre-release security gate`));
    }
  } else {
    console.log(chalk.bold.green("All phases complete. Project is release-gated.\n"));
  }

  // Check for config
  const configPath = join(projectRoot, "secure-sdlc.yaml");
  if (!existsSync(configPath)) {
    console.log(chalk.yellow("\n⚠  No secure-sdlc.yaml found. Run: secure-sdlc init\n"));
  }
}
