# --- Etape de compilation -----------------------------------------------------
FROM node:24-alpine AS compilation

WORKDIR /application

COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig.json tsconfig.app.json ./
COPY public ./public
COPY src ./src
RUN npx ng build

# --- Image finale -------------------------------------------------------------
FROM nginx:1.27-alpine AS execution

COPY --from=compilation /application/dist/web/browser /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY docker/configuration.json.modele /modeles/configuration.json.modele
COPY docker/ecrire-configuration.sh /docker-entrypoint.d/40-ecrire-configuration.sh
RUN chmod +x /docker-entrypoint.d/40-ecrire-configuration.sh

EXPOSE 80
