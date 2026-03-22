FROM node:22-alpine AS builder
WORKDIR /app
COPY frontend/next-web/package*.json ./
RUN npm ci
COPY frontend/next-web/ .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
EXPOSE 3000
CMD ["npm", "start"]
