# Multi-stage build for NestJS with pnpm and Node 20
FROM node:20-alpine AS base

# Install pnpm and sentry-cli globally
RUN npm install -g pnpm @sentry/cli

# Build stage
FROM base AS builder

# Set Sentry environment variables
ARG SENTRY_ORG
ENV SENTRY_ORG=${SENTRY_ORG}
ARG SENTRY_PROJECT
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
# IPv4만 사용하도록 설정 (fetch 가 cdn 주소못찾고 오류발생)
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
ENV NODE_OPTIONS="${NODE_OPTIONS} --max-old-space-size=4096"

WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY *.account-key.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM base AS production

# Install curl to run health check
RUN apk add --no-cache curl

# Create app directory
WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S chuck -u 1001 -G nodejs

# Copy built application and static files from builder stage
COPY --from=builder --chown=chuck:nodejs /usr/src/app/dist ./dist
COPY --from=builder --chown=chuck:nodejs /usr/src/app/static ./static

# Copy package files for production dependencies
COPY --from=builder --chown=chuck:nodejs /usr/src/app/package.json ./
COPY --from=builder --chown=chuck:nodejs /usr/src/app/pnpm-lock.yaml ./
COPY --from=builder --chown=chuck:nodejs /usr/src/app/*.account-key.json ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile && \
    pnpm prune --prod && \
    pnpm store prune

# Change ownership of the app directory
RUN chown -R chuck:nodejs /usr/src/app

# Switch to non-root user
USER chuck

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]