#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_REPO="${REDBOX_PUBLIC_REPO:-Jamailar/RedBox}"
WORK_DIR="${REDBOX_PUBLIC_SYNC_DIR:-$ROOT_DIR/.tmp/public-repo}"

if ! command -v gh >/dev/null 2>&1; then
  echo "[sync] gh CLI not found"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "[sync] gh not authenticated. Run: gh auth login"
  exit 1
fi

mkdir -p "$(dirname "$WORK_DIR")"
rm -rf "$WORK_DIR"

gh repo clone "$PUBLIC_REPO" "$WORK_DIR" -- --depth 1

sync_dir() {
  local src="$1"
  local dst="$2"
  if [ -d "$src" ]; then
    mkdir -p "$dst"
    rsync -av --delete "$src"/ "$dst"/
  else
    echo "[sync] Source missing: $src, removing target: $dst"
    rm -rf "$dst"
  fi
}

cp "$ROOT_DIR/README.md" "$WORK_DIR/"
cp "$ROOT_DIR/LICENSE" "$WORK_DIR/"

sync_dir "$ROOT_DIR/desktop" "$WORK_DIR/desktop"
sync_dir "$ROOT_DIR/scripts" "$WORK_DIR/scripts"
sync_dir "$ROOT_DIR/images" "$WORK_DIR/images"

rm -rf "$WORK_DIR/Plugin"

cd "$WORK_DIR"
git config user.name "Jam Sync Bot"
git config user.email "jam-sync-bot@users.noreply.github.com"

git add -A
if git diff --staged --quiet; then
  echo "[sync] No changes to push"
  exit 0
fi

git commit -m "chore: sync open-source mirror"
git push

echo "[sync] Mirror sync completed: $PUBLIC_REPO"
