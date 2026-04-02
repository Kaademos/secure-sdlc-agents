import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import { printBanner } from "../utils/banner.js";

/**
 * Prints a ready-to-paste prompt for dev-lead / MCP PR review.
 * Does not call an LLM — use this to drive Claude Code or Cursor manually.
 */
export default async function review(target, options) {
  const projectRoot = resolve(options.path || process.cwd());
  const type = options.type || "code";

  printBanner();
  console.log(chalk.bold("Security review — copy the block below into Claude Code or Cursor\n"));

  let codeBlock = "";
  if (target) {
    const abs = resolve(projectRoot, target);
    if (existsSync(abs)) {
      codeBlock = readFileSync(abs, "utf-8");
    } else {
      console.log(chalk.yellow(`File not found: ${abs}\n`));
    }
  }

  const stack = options.stack || "(describe your stack)";

  console.log(chalk.dim("─── Paste from here ───\n"));
  console.log(
    [
      `Run a ${type} security review for this project.`,
      "",
      stack ? `Stack: ${stack}` : "",
      target ? `Scope: file ${target}` : "Scope: recent changes / describe what to review",
      "",
      codeBlock
        ? "Code:\n```\n" + codeBlock.slice(0, 12000) + (codeBlock.length > 12000 ? "\n... (truncated)" : "") + "\n```"
        : "(Attach diff or paste code.)",
      "",
      "Reference docs/security-requirements.md if it exists.",
      "",
      "Claude Code:",
      '  claude --agent dev-lead "Review the above for secure coding issues and dependency risks"',
      "",
      "Cursor (MCP):",
      "  sdlc_review_pr({ pr_description: \"...\", code_diff: \"...\", language_stack: \"...\" })",
    ]
      .filter(Boolean)
      .join("\n")
  );
  console.log(chalk.dim("\n─── End ───\n"));
}
