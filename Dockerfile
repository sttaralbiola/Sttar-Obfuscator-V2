FROM node:18-bullseye-slim

# Prometheus obfuscator runs on Lua 5.1
RUN apt-get update && \
    apt-get install -y --no-install-recommends lua5.1 git ca-certificates && \
    ln -s /usr/bin/lua5.1 /usr/local/bin/lua && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts
RUN npm install --omit=dev

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
