# Multi-stage build for Cars Service
FROM node:18-alpine AS builder

WORKDIR /build

# Build shared package first
COPY shared/ ./shared/
WORKDIR /build/shared
RUN npm install && npm run build

# Build cars-svc
WORKDIR /build/apps/cars-svc
COPY apps/cars-svc/package*.json ./
RUN npm install

COPY apps/cars-svc/tsconfig.json ./
COPY apps/cars-svc/src ./src

# Replace stub with real shared package
RUN rm -f node_modules/@kayak/shared
RUN mkdir -p node_modules/@kayak/shared
RUN cp /build/shared/package.json node_modules/@kayak/shared/
RUN cp -r /build/shared/dist/* node_modules/@kayak/shared/

RUN npm run build

FROM node:18-alpine
WORKDIR /app

COPY --from=builder /build/apps/cars-svc/package*.json ./
RUN npm install --production

COPY --from=builder /build/apps/cars-svc/dist ./dist

# Copy shared package to runtime
RUN rm -f node_modules/@kayak/shared
RUN mkdir -p node_modules/@kayak/shared
COPY --from=builder /build/shared/package.json node_modules/@kayak/shared/
COPY --from=builder /build/shared/dist node_modules/@kayak/shared/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 8004
CMD ["node", "dist/index.js"]