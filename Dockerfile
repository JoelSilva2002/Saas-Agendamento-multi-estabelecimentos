FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 3000
# `prisma` is now a runtime dependency (see package.json), so the CLI exists in this image without
# a network fetch. `migrate deploy` runs on every boot — a no-op in under a second when nothing's
# pending, and applying anything else here is exactly what makes a fresh database usable. `exec`
# matters: it replaces the shell with node so node becomes PID 1 and receives signals directly
# instead of the shell swallowing them.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/main"]
