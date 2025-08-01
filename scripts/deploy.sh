#!/bin/bash

cd ~/Code/api

echo "👉 Pulling latest code..."
git reset --hard
git pull origin main

echo "👉 Installing deps..."
pnpm install --frozen-lockfile

echo "👉 Building app..."
pnpm build

export PORT=3001

# AWS 환경 변수 설정 (실제 AWS 환경에서는 IAM 역할 사용)
export AWS_ENDPOINT=""  # 실제 AWS 환경에서는 endpoint 비우기
export AWS_SQS_ENDPOINT=""  # 실제 AWS 환경에서는 endpoint 비우기
export NODE_ENV=production

echo "👉 Restarting server via PM2..."
pm2 restart ecosystem.config.js --env production --update-env

echo "✅ Complete"
