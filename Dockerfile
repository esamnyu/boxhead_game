FROM node:20-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm install --production

# Copy server source
COPY server/ ./

# Expose port (Railway sets PORT env var)
EXPOSE 3001

# Start the server
CMD ["node", "index.js"]
