# 1) Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Pour certaines libs natives (souvent utile)
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci

# 2) Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma (si présent)
# (si Prisma n'est pas dans ton projet, cette ligne ne gênera pas)
RUN npx prisma generate || true

# Build Next.js
RUN npm run build

# 3) Run
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Utilisateur non-root (bonne pratique)
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copier le build
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

EXPOSE 3000
USER nextjs

CMD ["npm", "start"]
