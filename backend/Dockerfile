FROM lnx2201.infores.com:8082/node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY node_modules ./node_modules
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
