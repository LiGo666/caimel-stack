FROM node:18-alpine

# Install required packages
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy package files
COPY docker/clamav/worker/package.json ./

# Install dependencies using npm install instead of npm ci
# This will generate a proper package-lock.json and install dependencies
RUN npm install --only=production

# Copy application code
COPY docker/clamav/worker/ ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S worker -u 1001 -G nodejs

# Change ownership
RUN chown -R worker:nodejs /app
USER worker

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "index.js"]
