# ==========================================
# ENTERPRISE MULTI-STAGE DOCKER FILE
# ==========================================

# Stage 1: Dependency Resolver & Build Compile Engine
FROM node:18-alpine AS builder
WORKDIR /app

# Inject build properties
COPY package*.json ./
RUN npm ci

# Copy full sources
COPY . .

# Run production compilers
RUN npm run build

# Stage 2: Minimalist Lightweight Production Runtime Container
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary production outputs
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Standard container ports exposure
EXPOSE 3000

# Execute server-side CommonJS bundle directly via node with process bindings
CMD ["node", "dist/server.cjs"]
