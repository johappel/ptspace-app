# Zero-Dependency: nur Node >= 18, kein npm install.
FROM node:22-alpine
WORKDIR /app
COPY adapter.mjs package.json ./
ENV PORT=3110 \
    ADAPTER_HOST=0.0.0.0
EXPOSE 3110
# DSH selbst wird per DSH_BIN eingebunden (Volume oder Build-Arg im Betrieb),
# da @deepseek-ai/dsh die Modell-Credential hält und nicht ins Image gehört.
CMD ["node", "adapter.mjs"]
