FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY node_modules ./node_modules
COPY dist ./dist
COPY src ./src
EXPOSE 3001
CMD ["node", "dist/server.js"]
