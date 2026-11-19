#!/usr/bin/env bash
set -e

KEY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/LightsailDefaultKey-ap-south-1.pem"
REMOTE_HOST="35.154.36.24"
REMOTE_USER="ubuntu"

if [ ! -f "$KEY_PATH" ]; then
  echo "Error: Key not found at $KEY_PATH"
  exit 1
fi

chmod 600 "$KEY_PATH"

echo "==> Deploying updates to production ($REMOTE_HOST)..."

ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" 'bash -s' << 'EOF'
  set -e
  cd ~/music-player/music-player
  echo "--> Pulling latest code..."
  git pull origin main

  echo "--> Installing dependencies if needed..."
  pnpm install

  echo "--> Building packages sequentially (memory-safe)..."
  pnpm --workspace-concurrency=1 build

  echo "--> Restarting services with PM2..."
  pm2 restart ecosystem.config.cjs

  echo "--> Production status:"
  pm2 status
EOF

echo "==> Deployment complete! Live at https://35.154.36.24.nip.io"
