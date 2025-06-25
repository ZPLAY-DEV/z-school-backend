#!/bin/bash

cd ~/code/z-school-backend

echo "👉 Pulling latest code..."
git reset --hard
git pull origin main

echo "👉 Installing deps..."
pnpm install --frozen-lockfile

echo "👉 Building app..."
pnpm build

echo "👉 Setting up environment variable..."

TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.name == "localstack") | .public_url')
if [ -z "$TUNNEL_URL" ]; then
  echo "Failed to get localstack tunnel URL"
  exit 1
fi

sed -i '' "s|AWS_CLOUDFRONT_URL: ''|AWS_CLOUDFRONT_URL: '$TUNNEL_URL'|" ecosystem.config.js

echo "👉 Restarting server via PM2..."
pm2 restart ecosystem.config.js --env development

echo "✅ Done Staging Local Mac Server"