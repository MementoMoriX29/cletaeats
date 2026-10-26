# Imagen de producción del backend.
# Se construye desde la raíz del repo para incluir los scripts SQL de db/:
#   docker build -f backend/Dockerfile -t cletaeats-api .

FROM node:22-alpine AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/
COPY backend/src ./backend/src
COPY backend/scripts ./backend/scripts
COPY db ./db

WORKDIR /app/backend
# Sin privilegios de root dentro del contenedor
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health > /dev/null || exit 1
CMD ["node", "src/server.js"]
