FROM nginx:alpine

# Kopiere Custom Nginx Config
COPY nginx.conf /etc/nginx/nginx.conf

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider --no-check-certificate https://127.0.0.1/ || exit 1

EXPOSE 80 443
