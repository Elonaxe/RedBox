#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <tag>"
  exit 1
fi

TAG="$1"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
REPO="${REDBOX_PUBLIC_REPO:-Jamailar/RedBox}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Please install gh and run 'gh auth login'."
  exit 1
fi

if ! gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  echo "[release] Release not found, create: $TAG"
  gh release create "$TAG" --repo "$REPO" --title "$TAG" --notes ""
fi

shopt -s nullglob
FILES=(
  "$ROOT_DIR/desktop/release/"*.dmg
  "$ROOT_DIR/desktop/release/"*.zip
  "$ROOT_DIR/desktop/release/"latest*.yml
  "$ROOT_DIR/artifacts/win-remote/"*.exe
  "$ROOT_DIR/artifacts/win-remote/"*.blockmap
  "$ROOT_DIR/artifacts/win-remote/"latest*.yml
)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "[release] ERROR: no artifacts found to upload"
  exit 1
fi

echo "[release] Uploading ${#FILES[@]} files to $REPO@$TAG"
gh release upload "$TAG" "${FILES[@]}" --repo "$REPO" --clobber

echo "[release] Upload completed."
