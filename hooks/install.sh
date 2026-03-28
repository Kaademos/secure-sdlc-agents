#!/usr/bin/env bash
# Install Secure SDLC git hooks into the current git repository.
# Run from your project root: bash /path/to/secure-sdlc-agents/hooks/install.sh

set -euo pipefail

HOOKS_DIR="$(git rev-parse --git-dir 2>/dev/null)/hooks"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "Error: Not a git repository. Run from your project root."
  exit 1
fi

for hook in pre-commit pre-push; do
  src="$SCRIPT_DIR/$hook"
  dest="$HOOKS_DIR/$hook"
  
  if [ ! -f "$src" ]; then
    echo "Warning: $src not found — skipping"
    continue
  fi
  
  if [ -f "$dest" ] && ! grep -q "Secure SDLC" "$dest" 2>/dev/null; then
    echo "Existing $hook hook found (not from Secure SDLC). Backing up to $dest.bak"
    cp "$dest" "$dest.bak"
  fi
  
  cp "$src" "$dest"
  chmod +x "$dest"
  echo "✓ Installed $hook hook"
done

echo ""
echo "Secure SDLC hooks installed successfully."
echo "To verify: ls -la $(git rev-parse --git-dir)/hooks/"
echo "To remove: rm $(git rev-parse --git-dir)/hooks/pre-commit $(git rev-parse --git-dir)/hooks/pre-push"
