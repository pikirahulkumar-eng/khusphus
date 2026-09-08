FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY realtime-server.js ./
COPY firebase-service-account.json* ./
COPY sunao_local.db* ./
COPY dist ./dist

EXPOSE 10000

ENV PORT=10000
ENV NODE_ENV=production

CMD ["node", "realtime-server.js"]
