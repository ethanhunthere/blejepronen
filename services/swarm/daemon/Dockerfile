# ============================================================================
# BLEJE PRONËN — AUTONOMOUS SWARM DOCKERFILE (PHASE 4)
# File: services/swarm/daemon/Dockerfile
#
# Production multi-stage Docker build for 24/7 swarm execution on VPS/Cloud.
# ============================================================================

FROM node:26-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY services/ ./services/
COPY supabase/ ./supabase/

# Verify TypeScript compilation during build
RUN npx tsc --noEmit

FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV SWARM_ENVIRONMENT=production

RUN apk add --no-cache git ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D swarmuser

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/services ./services
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN mkdir -p var/logs && chown -R swarmuser:nodejs /app

USER swarmuser

ENTRYPOINT ["node", "--import", "tsx", "services/swarm/index.ts"]
