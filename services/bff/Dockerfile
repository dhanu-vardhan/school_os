FROM node:22-alpine
WORKDIR /app
COPY services/bff/package.json ./
COPY services/bff/src ./src
COPY apps/web/dist ./web-dist
ENV HOST=0.0.0.0 PORT=8080 WEB_DIST=/app/web-dist SCHOOLOS_PROFILE=demo
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s --retries=20 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/index.js"]
