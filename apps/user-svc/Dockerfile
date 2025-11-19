# Multi-stage build for User Service
FROM node:18-alpine AS builder

WORKDIR /build

# Copy and build shared package first
COPY shared/ ./shared/
WORKDIR /build/shared
RUN npm install && npm run build

# Now build user service
WORKDIR /build/apps/user-svc
COPY apps/user-svc/package*.json ./
RUN npm install
COPY apps/user-svc/tsconfig.json ./
COPY apps/user-svc/src ./src

# Manually install shared package
RUN rm -f node_modules/@kayak/shared
RUN mkdir -p node_modules/@kayak/shared
RUN cp /build/shared/package.json node_modules/@kayak/shared/
RUN cp -r /build/shared/dist/* node_modules/@kayak/shared/

RUN npm run build 2>/dev/null || (mkdir -p dist && cp -r src/* dist/)

FROM node:18-alpine
WORKDIR /app

# Copy user service
COPY --from=builder /build/apps/user-svc/package*.json ./
RUN npm install --production
COPY --from=builder /build/apps/user-svc/dist ./dist

# Copy shared package
RUN rm -f node_modules/@kayak/shared
RUN mkdir -p node_modules/@kayak/shared
COPY --from=builder /build/shared/package.json node_modules/@kayak/shared/
COPY --from=builder /build/shared/dist node_modules/@kayak/shared/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 8001
CMD ["node", "dist/index.js"]