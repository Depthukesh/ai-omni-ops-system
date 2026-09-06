FROM node:24-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends git unzip \
 && rm -rf /var/lib/apt/lists/*

COPY docker/openchatcut-start.sh /usr/local/bin/openchatcut-start
RUN chmod +x /usr/local/bin/openchatcut-start

WORKDIR /workspace

ENTRYPOINT ["openchatcut-start"]
