#!/bin/bash

cd ~/code/z-school-backend

echo "👉 Pulling latest code..."
git reset --hard
git pull origin main

echo "👉 Installing deps..."
pnpm install --frozen-lockfile

echo "👉 Building app..."
pnpm build

echo "👉 Restarting server via PM2..."
pm2 restart ecosystem.config.js --env development

echo "✅ Done Staging Local Mac Server"