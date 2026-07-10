FROM node:22-bookworm-slim

ARG OPENCODE_VERSION=1.17.13

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g opencode-ai@${OPENCODE_VERSION}

WORKDIR /workspace

ENTRYPOINT ["opencode"]
CMD ["--help"]
