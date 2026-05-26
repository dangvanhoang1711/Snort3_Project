FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY backend-api/package*.json ./
RUN npm install --production --no-audit --progress=false

# Copy app
COPY backend-api/ .

ENV NODE_ENV=production
ENV DB_PATH=/data/alerts.db

# Ensure runtime dirs exist
RUN mkdir -p /data /app/logs && chown -R node:node /data /app/logs

EXPOSE 4000

CMD ["npm", "start"]
