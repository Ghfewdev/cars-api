FROM node:21-bullseye-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD [ "npm", "start" ]