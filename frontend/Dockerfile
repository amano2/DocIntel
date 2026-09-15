# ==============================================================================
# DocIntel React Frontend - Multi-Stage Production Dockerfile
# Stage 1: Optimized Build Environment with Node.js 20
# Stage 2: Ultra-lightweight Alpine Nginx Production Server
# ==============================================================================

# --- Stage 1: Build Application Bundle ---
FROM node:20-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . .

# Compile TypeScript and bundle with Vite
RUN npm run build

# --- Stage 2: Production Web Server ---
FROM nginx:1.27-alpine

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom reverse proxy & SPA Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Container health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
