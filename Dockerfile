# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Allow injecting the agent URL at build time
ARG VITE_AGENT_URL
ENV VITE_AGENT_URL=${VITE_AGENT_URL}

# Install deps and build
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM nginx:stable-alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx conf (optional proxy for /agent)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run expects the server to listen on $PORT (default 8080)
ENV PORT 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
