# --- Etape de compilation -----------------------------------------------------
FROM node:24-alpine AS compilation

WORKDIR /application

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Les dependances de developpement ne partent pas en production.
RUN npm ci --omit=dev

# --- Image finale -------------------------------------------------------------
FROM node:24-alpine AS execution

ENV NODE_ENV=production
WORKDIR /application

COPY --from=compilation /application/node_modules ./node_modules
COPY --from=compilation /application/dist ./dist
COPY package.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/sante').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
