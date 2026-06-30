FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Cloud Run sẽ set biến PORT (mặc định 8080), app.js đã đọc process.env.PORT
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "server.js"]
