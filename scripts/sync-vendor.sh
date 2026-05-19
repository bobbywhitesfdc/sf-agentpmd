#!/usr/bin/env bash
# Resync vendored @agentscript packages from the local agentscript workspace
# clone. Run after pulling upstream agentscript changes.
#
# Assumes /Users/bobbywhite/projects/agentscript is a checkout with built
# dist/ directories (run `pnpm -w build` there first if not).

set -euo pipefail

UPSTREAM="${AGENTSCRIPT_REPO:-$HOME/projects/agentscript}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$UPSTREAM/packages/parser-javascript/dist" ]; then
  echo "error: $UPSTREAM/packages/parser-javascript/dist not found; run pnpm build in agentscript first" >&2
  exit 1
fi

rm -rf "$HERE/vendor/agentscript-types/dist" "$HERE/vendor/agentscript-parser-javascript/dist"
cp -R "$UPSTREAM/packages/types/dist" "$HERE/vendor/agentscript-types/dist"
cp -R "$UPSTREAM/packages/parser-javascript/dist" "$HERE/vendor/agentscript-parser-javascript/dist"

echo "vendored:"
echo "  @agentscript/types         ← $UPSTREAM/packages/types"
echo "  @agentscript/parser-javascript ← $UPSTREAM/packages/parser-javascript"
