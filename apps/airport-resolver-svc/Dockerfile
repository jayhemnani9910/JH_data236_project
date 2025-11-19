FROM node:18-alpine

WORKDIR /app

# Copy shared package first
COPY shared/package*.json ./shared/
COPY shared/ ./shared/
RUN cd shared && npm install && npm run build

# Copy service package
COPY apps/airport-resolver-svc/package*.json ./
RUN npm install --production

# Copy source
COPY apps/airport-resolver-svc/src ./src
COPY apps/airport-resolver-svc/tsconfig.json ./

# Build
RUN npm run build

# Expose port
EXPOSE 8010

# Start
CMD ["npm", "start"]
