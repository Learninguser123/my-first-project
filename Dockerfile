# Multi-stage build for optimized production Docker image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install package dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application and production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/database ./database
COPY package*.json ./

# Create logs directory and set permissions
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER nodejs

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# Development image
FROM base AS development
WORKDIR /app

# Install development dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port for development
EXPOSE 3000

# Development command
CMD ["npm", "run", "dev"]

# Test image
FROM base AS testing
WORKDIR /app

# Install all dependencies including dev dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Install curl for health checks
RUN apk add --no-cache curl

# Expose port for testing
EXPOSE 3000

# Test command
CMD ["npm", "test"]