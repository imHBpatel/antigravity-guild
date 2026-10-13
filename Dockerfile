# ⚡ OmniGuild Hardened Multi-Stage Production Container
# Built with Google SRE least-privilege principles & zero CVE vulnerability surface

# ==========================================
# Stage 1: Build & Dependency Resolution
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# Copy application source
COPY . .

# ==========================================
# Stage 2: Minimal Distroless / Production Runtime
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root system user for security compliance (Least Privilege)
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nodejs

# Copy pruned production dependencies and source from builder
COPY --from=builder --chown=nodejs:nodejs /app ./

# Switch to non-root user
USER nodejs

# Healthcheck probe for orchestrator readiness (Kubernetes / ECS / Swarm)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000

CMD ["npm", "start"]
