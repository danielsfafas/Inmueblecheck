FROM node:20-slim

# Instalar ffmpeg y openssl para Prisma y generación de videos
RUN apt-get update && apt-get install -y \
    ffmpeg \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 4311

# Script de inicio que corre migraciones y luego inicia el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
