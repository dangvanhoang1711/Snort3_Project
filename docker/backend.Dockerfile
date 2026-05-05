FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY backend-api/package*.json ./
RUN npm install --production --no-audit --progress=false

# Copy app
COPY backend-api/ .

ENV NODE_ENV=production
ENV DB_PATH=/data/alerts.db

# Ensure data dir exists
RUN mkdir -p /data && chown -R node:node /data

RUN npm run migrate || true

EXPOSE 4000

CMD ["npm", "start"]
