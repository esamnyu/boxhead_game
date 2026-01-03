FROM node:20-alpine

# Force rebuild - Jan 2, 2026 8:50 PM - With debugging
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy server package files
COPY server/package*.json ./

# Install dependencies (no cache) and clean up
RUN npm ci --production && npm cache clean --force

# Copy server source
COPY server/ ./

# Set production environment
ENV NODE_ENV=production

# Railway sets PORT env var dynamically
EXPOSE 8080

# Docker health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Start the server
CMD ["node", "index.js"]
