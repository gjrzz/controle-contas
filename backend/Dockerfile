FROM node:20-alpine

WORKDIR /app

# Copia apenas arquivos de dependências primeiro (cache de layers)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instala todas as dependências (precisa de devDeps para build)
RUN npm ci

# Gera Prisma Client
RUN npx prisma generate

# Copia código fonte
COPY src ./src/
COPY tsconfig.json ./

# Compila TypeScript
RUN npx tsc

# Cria pasta de uploads
RUN mkdir -p /app/uploads

EXPOSE 3001

# Roda migrations e inicia
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
