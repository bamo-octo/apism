FROM node:24-alpine

WORKDIR /application

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY catalogue.mjs ./

USER node
EXPOSE 3001

CMD ["node", "catalogue.mjs"]
