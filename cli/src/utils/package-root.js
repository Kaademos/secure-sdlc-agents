import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

/**
 * Directory where this npm package is installed (contains cli/, mcp/, docs/templates/, …).
 * Works for: git clone, npm install -g @kaademos/secure-sdlc, and npx.
 */
export function getPackageRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  // cli/src/utils/package-root.js → ../../../ = package root
  const root = join(here, "..", "..", "..");
  const marker = join(root, "cli", "bin", "secure-sdlc.js");
  if (existsSync(marker)) {
    return root;
  }
  // Fallback: walk up from cwd (e.g. unusual symlinks)
  return root;
}

export function getMcpServerPath() {
  return join(getPackageRoot(), "mcp", "src", "server.js");
}
