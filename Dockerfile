FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY index.js ./
COPY src ./src

CMD ["npm", "start"]
