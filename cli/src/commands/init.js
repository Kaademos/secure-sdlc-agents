import { mkdirSync, copyFileSync, writeFileSync, existsSync, readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";
import chalk from "chalk";
import ora from "ora";
import { detectStack } from "../utils/stack-detect.js";
import { printBanner, printSuccess, printWarn, printError, printInfo } from "../utils/banner.js";
import { getPackageRoot } from "../utils/package-root.js";

const REPO_ROOT = getPackageRoot();

export default async function init(options) {
  const projectRoot = resolve(options.path || process.cwd());

  printBanner();
  console.log(chalk.bold(`Initialising Secure SDLC in: ${projectRoot}\n`));

  // Detect stack
  const stack = detectStack(projectRoot);
  if (stack.name !== "unknown") {
    printSuccess(`Detected stack: ${chalk.bold(stack.display)} (${stack.language})`);
  } else {
    printWarn("Could not detect stack — using generic security guidance");
  }

  // 1. Create docs directory structure
  const spinner = ora("Creating docs directory structure").start();
  try {
    mkdirSync(join(projectRoot, "docs", "audit-evidence"), { recursive: true });
    spinner.succeed("Docs directory created");
  } catch (err) {
    spinner.fail(`Failed to create docs directory: ${err.message}`);
    process.exit(1);
  }

  // 2. Copy templates
  const templatesDir = join(REPO_ROOT, "docs", "templates");
  const docsDir = join(projectRoot, "docs");

  if (existsSync(templatesDir)) {
    const spinner2 = ora("Copying document templates").start();
    let copied = 0;
    for (const file of readdirSync(templatesDir)) {
      const dest = join(docsDir, file);
      if (!existsSync(dest)) {
        copyFileSync(join(templatesDir, file), dest);
        copied++;
      }
    }
    spinner2.succeed(`${copied} templates copied to docs/`);
  }

  // 3. Create secure-sdlc.yaml config
  const configPath = join(projectRoot, "secure-sdlc.yaml");
  if (!existsSync(configPath)) {
    const spinner3 = ora("Creating secure-sdlc.yaml config").start();
    const config = generateConfig(projectRoot, stack);
    writeFileSync(configPath, config);
    spinner3.succeed("secure-sdlc.yaml created");
  } else {
    printInfo("secure-sdlc.yaml already exists — skipping");
  }

  // 4. Install git hooks
  if (!options.skipHooks) {
    const hooksDir = join(projectRoot, ".git", "hooks");
    if (existsSync(join(projectRoot, ".git"))) {
      const spinner4 = ora("Installing git hooks").start();
      try {
        mkdirSync(hooksDir, { recursive: true });
        const srcHooks = join(REPO_ROOT, "hooks");
        for (const hookFile of ["pre-commit", "pre-push"]) {
          const src = join(srcHooks, hookFile);
          const dest = join(hooksDir, hookFile);
          if (existsSync(src)) {
            copyFileSync(src, dest);
            // Make executable
            const { chmodSync } = await import("fs");
            chmodSync(dest, 0o755);
          }
        }
        spinner4.succeed("Git hooks installed (pre-commit, pre-push)");
      } catch (err) {
        spinner4.warn(`Could not install git hooks: ${err.message}`);
      }
    } else {
      printWarn("Not a git repo — skipping hook installation");
    }
  }

  // 5. Generate GitHub Actions workflow
  if (!options.skipCi) {
    const workflowsDir = join(projectRoot, ".github", "workflows");
    const workflowPath = join(workflowsDir, "secure-sdlc-gate.yml");

    if (!existsSync(workflowPath)) {
      const spinner5 = ora("Generating GitHub Actions workflow").start();
      try {
        mkdirSync(workflowsDir, { recursive: true });
        const srcWorkflow = join(REPO_ROOT, ".github", "workflows", "secure-sdlc-gate.yml");
        if (existsSync(srcWorkflow)) {
          copyFileSync(srcWorkflow, workflowPath);
          spinner5.succeed("GitHub Actions workflow created (.github/workflows/secure-sdlc-gate.yml)");
        } else {
          spinner5.warn("GitHub Actions template not found — skipping");
        }
      } catch (err) {
        spinner5.warn(`Could not create workflow: ${err.message}`);
      }
    } else {
      printInfo("GitHub Actions workflow already exists — skipping");
    }
  }

  // 6. Cursor MCP setup
  if (options.cursor) {
    const spinner6 = ora("Configuring Cursor MCP integration").start();
    try {
      const cursorDir = join(projectRoot, ".cursor");
      mkdirSync(cursorDir, { recursive: true });

      const mcpConfig = {
        mcpServers: {
          "secure-sdlc": {
            command: "node",
            args: [join(REPO_ROOT, "mcp", "src", "server.js")],
          },
        },
      };
      writeFileSync(
        join(cursorDir, "mcp.json"),
        JSON.stringify(mcpConfig, null, 2)
      );

      // Copy Cursor rules
      const rulesDir = join(REPO_ROOT, ".cursor", "rules");
      const destRulesDir = join(cursorDir, "rules");
      if (existsSync(rulesDir)) {
        mkdirSync(destRulesDir, { recursive: true });
        for (const file of readdirSync(rulesDir)) {
          copyFileSync(join(rulesDir, file), join(destRulesDir, file));
        }
      }

      spinner6.succeed("Cursor MCP config and rules created (.cursor/)");
    } catch (err) {
      spinner6.warn(`Cursor setup failed: ${err.message}`);
    }
  }

  // Print summary
  console.log("\n" + chalk.bold.green("✓ Secure SDLC initialised successfully\n"));
  console.log(chalk.bold("Next steps:\n"));
  console.log(`  ${chalk.cyan("1.")} Start the Plan phase:\n`);
  console.log(
    chalk.dim(`     claude --agent product-manager "Define security requirements for [your feature]"\n`)
  );
  console.log(
    chalk.dim(`     # OR if using MCP: sdlc_plan_feature({ feature_description: "..." })\n`)
  );
  console.log(`  ${chalk.cyan("2.")} Check your current status:\n`);
  console.log(chalk.dim(`     secure-sdlc status\n`));
  console.log(`  ${chalk.cyan("3.")} Run the feature kickoff wizard:\n`);
  console.log(chalk.dim(`     secure-sdlc kickoff\n`));

  if (stack.name !== "unknown") {
    const { getStackSecurityNotes } = await import("../utils/stack-detect.js");
    const notes = getStackSecurityNotes(stack.name);
    if (notes.length) {
      console.log(chalk.bold(`\n${stack.display} security notes for your team:\n`));
      notes.slice(0, 3).forEach((n) => console.log(chalk.dim(`  • ${n}`)));
      console.log(chalk.dim(`  (see stacks/${stack.name}.md for full guidance)\n`));
    }
  }
}

function generateConfig(projectRoot, stack) {
  return `# Secure SDLC Configuration
# Generated by: secure-sdlc init
# Documentation: https://github.com/Kaademos/secure-sdlc-agents

project:
  name: "${projectRoot.split("/").pop()}"
  stack: "${stack.display}"

security:
  asvs_level: L2          # L1 (basic), L2 (standard), L3 (high-assurance)
  
  # Compliance frameworks applicable to this project
  # Options: SOC2, ISO27001, NIST_CSF, PCI_DSS, GDPR, HIPAA, DORA, FedRAMP, NIS2
  frameworks: []

  # Severity thresholds that block CI/CD gates
  gates:
    build_to_test:
      block_on: [CRITICAL, HIGH]
    test_to_release:
      block_on: [CRITICAL, HIGH]
    release:
      block_on: [CRITICAL]
      warn_on: [HIGH, MEDIUM]

  # Agents to invoke automatically in CI
  ci:
    on_pr: [dev-lead, appsec-engineer]
    on_merge_to_main: [appsec-engineer, cloud-platform-engineer]
    on_release: [release-manager, grc-analyst]

# Paths to key artefacts (relative to project root)
artefacts:
  security_requirements: docs/security-requirements.md
  risk_register: docs/risk-register.md
  threat_model: docs/threat-model.md
  infra_review: docs/infra-security-review.md
  sast_findings: docs/sast-findings.md
  test_report: docs/test-security-report.md
  release_sign_off: docs/release-security-sign-off.md
  audit_evidence: docs/audit-evidence/
`;
}
