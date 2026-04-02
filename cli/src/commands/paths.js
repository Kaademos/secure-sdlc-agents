import chalk from "chalk";
import { join } from "path";
import { printBanner } from "../utils/banner.js";
import { getPackageRoot, getMcpServerPath } from "../utils/package-root.js";

/**
 * Print resolved paths after npm install -g (for MCP / Cursor configuration).
 */
export default async function pathsCmd() {
  const root = getPackageRoot();
  printBanner();
  console.log(chalk.bold("Package install paths\n"));
  console.log(`${chalk.cyan("PACKAGE_ROOT")}=${root}`);
  console.log(`${chalk.cyan("MCP_SERVER")}=${getMcpServerPath()}`);
  console.log(`${chalk.cyan("TEMPLATES")}=${join(root, "docs", "templates")}`);
  console.log(`${chalk.cyan("HOOKS")}=${join(root, "hooks")}`);
  console.log(chalk.dim("\nCursor MCP snippet (copy args path):\n"));
  console.log(
    JSON.stringify(
      {
        mcpServers: {
          "secure-sdlc": {
            command: "node",
            args: [getMcpServerPath()],
          },
        },
      },
      null,
      2
    )
  );
  console.log();
}
