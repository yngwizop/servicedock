# Multi-Stage Build für optimiertes Production Image

# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

# Dependencies installieren (inkl. dev-dependencies für Build)
COPY package*.json ./

# Erst package-lock.json aktualisieren, dann clean install
RUN npm install --package-lock-only && npm ci

# Application Code kopieren und bauen
COPY . .
RUN npm run build

# Stage 2: Production mit Nginx
FROM nginx:alpine

# Static files vom Builder kopieren
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx Config für SPA
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

# Non-root user (nginx:alpine nutzt bereits nginx user)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
