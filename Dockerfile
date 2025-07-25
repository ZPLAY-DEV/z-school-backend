# Multi-stage build for NestJS with pnpm and Node 20
FROM --platform=linux/amd64 node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Build stage
FROM base AS builder

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

# Copy package files and install production dependencies only
COPY package.json pnpm-lock.yaml* ./
COPY *.account-key.json ./
RUN pnpm install --prod --frozen-lockfile && \
    pnpm prune --prod && \
    pnpm store prune

# Copy built application and static files from builder stage
COPY --from=builder --chown=chuck:nodejs /usr/src/app/dist ./dist
COPY --from=builder --chown=chuck:nodejs /usr/src/app/static ./static

# Change ownership of the app directory
RUN chown -R chuck:nodejs /usr/src/app

# Switch to non-root user
USER chuck

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]