#!/bin/sh
set -eu

cd /workspace

if [ ! -f .env.local ] && [ -f .env.example ]; then
  cp .env.example .env.local
fi

export BROWSER="${BROWSER:-none}"

npm install --ignore-scripts --package-lock=false
node scripts/sync-mediapipe.mjs
node scripts/sync-whisper-cli.mjs
npx tsx server/agent-runs/generate-tool-catalog.mts --check

exec node scripts/dev-profile.mjs --host 0.0.0.0 --port 5199 --open false
