FROM node:26-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN DATABASE_URL="postgresql://mesures:mesures_dev@db:5432/demandes_mesures?schema=public" \
    npx prisma generate --config prisma7.config.ts

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]