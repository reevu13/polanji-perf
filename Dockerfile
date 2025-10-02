# syntax=docker/dockerfile:1
FROM node:22-bullseye

ENV DEBIAN_FRONTEND=noninteractive

# Install k6
RUN apt-get update && \
    apt-get install -y gnupg2 ca-certificates && \
    curl -fsSL https://dl.k6.io/key.gpg | gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" > /etc/apt/sources.list.d/k6.list && \
    apt-get update && apt-get install -y k6 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
# Use npm install because the CI runners do not keep package-lock.json in the workspace
RUN npm install --omit=dev

COPY . .
RUN chmod +x scripts/*.sh

CMD ["scripts/run-full-suite.sh"]
