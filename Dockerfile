FROM node:20-alpine

# Force rebuild - Jan 2, 2026 8:28 PM - Cache bust
WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install dependencies (no cache)
RUN npm ci --production

# Copy server source
COPY server/ ./

# Railway sets PORT env var dynamically
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]
