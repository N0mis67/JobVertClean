# 1) Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Utile pour certaines libs natives
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci

# 2) Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# 3) Run (production)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat

# Utilisateur non-root
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copier le nécessaire pour exécuter l'app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

# Prisma schema + migrations disponibles en prod
COPY --from=builder /app/prisma ./prisma

# (Optionnel) Si tu utilises des fichiers de config Next (rare si absent)
# COPY --from=builder /app/next.config.* ./

EXPOSE 3000
USER nextjs

# Ton package.json doit avoir: "start": "next start"
CMD ["npm", "start"]
