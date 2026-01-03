FROM node:20-alpine

# Force rebuild - Jan 2, 2026 8:35 PM
WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install dependencies (no cache)
RUN npm ci --production

# Copy server source
COPY server/ ./

# Railway sets PORT env var dynamically - don't hardcode it
# The server code already reads process.env.PORT
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]
