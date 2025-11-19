# Billing Service - copy shared module from host
FROM node:18-slim

# --- Build Shared Module ---
WORKDIR /app
COPY shared/package*.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src/
WORKDIR /app/shared
RUN npm install
RUN npm run build

# --- Build Billing Service ---
WORKDIR /app
COPY apps/billing-svc/package*.json ./
COPY apps/billing-svc/tsconfig.json ./
COPY apps/billing-svc/src ./src

# Install dependencies
RUN npm install

# Link shared module manually for TSC
RUN mkdir -p node_modules/@kayak
RUN ln -s /app/shared node_modules/@kayak/shared

# Build the project
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8005
CMD ["node", "dist/index.js"]
