# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./

RUN npm install --legacy-peer-deps --no-audit --progress=false

COPY frontend/src ./src
COPY frontend/public ./public

RUN DISABLE_ESLINT_PLUGIN=true npm run build

# Production stage
FROM nginx:stable-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/soc.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]