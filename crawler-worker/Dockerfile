FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production TZ=Asia/Ho_Chi_Minh

# Worker không có dependency khi chạy (Node 24 chạy TypeScript trực tiếp).
COPY package.json ./
COPY src ./src

USER node
EXPOSE 8790
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8790/health || exit 1

CMD ["node", "src/server.ts"]
