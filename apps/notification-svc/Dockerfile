# Multi-stage build for Notification Service
FROM node:18-alpine AS builder

WORKDIR /build

# Build shared package first
COPY shared/ ./shared/
WORKDIR /build/shared
RUN npm install && npm run build

# Build notification-svc
WORKDIR /build/apps/notification-svc
COPY apps/notification-svc/package*.json ./
RUN npm install

COPY apps/notification-svc/tsconfig.json ./
COPY apps/notification-svc/src ./src

# Replace stub with real shared package
RUN rm -f node_modules/@kayak/shared
RUN mkdir -p node_modules/@kayak/shared
RUN cp /build/shared/package.json node_modules/@kayak/shared/
RUN cp -r /build/shared/dist/* node_modules/@kayak/shared/

RUN npm run build

FROM node:18-alpine
WORKDIR /app

COPY --from=builder /build/apps/notification-svc/package*.json ./
RUN npm install --production

COPY --from=builder /build/apps/notification-svc/dist ./dist

# Copy shared package to runtime
RUN rm -f node_modules/@kayak/shared
RUN mkdir -p node_modules/@kayak/shared
COPY --from=builder /build/shared/package.json node_modules/@kayak/shared/
COPY --from=builder /build/shared/dist node_modules/@kayak/shared/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 8009
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8009/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
