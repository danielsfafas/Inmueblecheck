FROM node:20-alpine

# Instalar ffmpeg para generación de videos
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 4311

# Script de inicio que corre migraciones y luego inicia el servidor
CMD npx prisma migrate deploy && npm run dev
