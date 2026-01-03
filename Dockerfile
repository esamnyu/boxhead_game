FROM node:20-alpine

# Force rebuild - Jan 2, 2026 8:15 PM
WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm install --production

# Copy server source
COPY server/ ./

# Railway sets PORT env var dynamically
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]
