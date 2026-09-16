FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /application

# La sonde n'a aucune dependance : seul le code source est necessaire.
COPY package.json ./
COPY src ./src

USER node

CMD ["node", "src/sonde.js"]
