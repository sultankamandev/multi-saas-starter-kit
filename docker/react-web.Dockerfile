FROM node:22-alpine AS builder
WORKDIR /app
COPY frontend/react-web/package*.json ./
RUN npm ci
COPY frontend/react-web/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
