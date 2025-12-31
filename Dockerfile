# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client and build project
RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
# Note: prisma engine is needed for generated client to work
RUN npm ci --omit=dev && npm run prisma:generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Start the application
CMD ["npm", "start"]
