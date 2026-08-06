FROM node:22-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
# Runtime data the compiled output reads relative to dist/ (see src/i18n.ts).
COPY --from=builder /app/locales ./locales
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
