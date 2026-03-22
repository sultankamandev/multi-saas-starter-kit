FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY backend/go-api/go.mod backend/go-api/go.sum ./
RUN go mod download
COPY backend/go-api/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

FROM alpine:3.20
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /server .
COPY backend/go-api/locales/ ./locales/
COPY backend/go-api/templates/ ./templates/
EXPOSE 8080
CMD ["./server"]
