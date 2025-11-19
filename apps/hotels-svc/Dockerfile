# Multi-stage build for Hotels Service
FROM node:18-alpine AS builder

WORKDIR /build

# Build shared package first
COPY shared/ ./shared/
WORKDIR /build/shared
RUN npm install && npm run build

# Build hotels-svc
WORKDIR /build/apps/hotels-svc
COPY apps/hotels-svc/package*.json ./
RUN npm install

COPY apps/hotels-svc/tsconfig.json ./
COPY apps/hotels-svc/src ./src

# Replace stub with real shared package
RUN rm -f node_modules/@kayak/shared
RUN mkdir -p node_modules/@kayak/shared
RUN cp /build/shared/package.json node_modules/@kayak/shared/
RUN cp -r /build/shared/dist/* node_modules/@kayak/shared/

RUN npm run build

FROM node:18-alpine
WORKDIR /app

COPY --from=builder /build/apps/hotels-svc/package*.json ./
RUN npm install --production

COPY --from=builder /build/apps/hotels-svc/dist ./dist

# Copy shared package to runtime
RUN rm -f node_modules/@kayak/shared
RUN mkdir -p node_modules/@kayak/shared
COPY --from=builder /build/shared/package.json node_modules/@kayak/shared/
COPY --from=builder /build/shared/dist node_modules/@kayak/shared/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 8003
CMD ["node", "dist/index.js"]