FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
ARG PUBLIC_BACKEND_URL=http://localhost:5174
ENV PUBLIC_BACKEND_URL=$PUBLIC_BACKEND_URL
COPY packages packages
COPY frontend frontend
RUN pnpm --filter @ptspace/shared build && pnpm --filter @ptspace/frontend build

FROM node:22-alpine
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5173
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=build /app/frontend/build ./frontend/build
COPY --from=build /app/frontend/package.json ./frontend/package.json
WORKDIR /app/frontend
EXPOSE 5173
CMD ["node", "build/index.js"]