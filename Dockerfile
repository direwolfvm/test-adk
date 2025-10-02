# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Allow injecting the agent URL at build time
ARG VITE_AGENT_URL
ENV VITE_AGENT_URL=${VITE_AGENT_URL}

COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copy source and build
COPY . .
RUN npm run build

# Runtime image
FROM node:20-alpine
WORKDIR /app

# Copy built static assets and server files
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/server.js"]
