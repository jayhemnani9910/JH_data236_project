# Notification Service - copy shared module from host
FROM node:18-slim

WORKDIR /app

# Copy package files and install only production dependencies FIRST
COPY apps/notification-svc/package*.json ./
RUN npm install --production

# Remove symlink if npm created one, then copy actual shared module
RUN rm -rf node_modules/@kayak/shared
RUN mkdir -p node_modules/@kayak/shared
COPY shared/dist ./node_modules/@kayak/shared
# Create package.json pointing to index.js (not dist/index.js)
RUN echo '{"name":"@kayak/shared","version":"1.0.0","main":"index.js"}' > node_modules/@kayak/shared/package.json

# Copy pre-built dist folder
COPY apps/notification-svc/dist ./dist

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8009
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8009/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
