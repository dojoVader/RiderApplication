# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install
COPY . .
RUN npm run build  # Compiles to /app/dist

# Production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=development
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install
COPY --from=builder /app/dist ./dist
#CMD ["node", "dist/main.js"]
CMD ["npm", "run", "start:debug"]
EXPOSE 3000