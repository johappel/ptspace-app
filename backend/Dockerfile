FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY backend/package.json backend/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages packages
COPY backend backend
RUN pnpm --filter @ptspace/shared build && pnpm --filter @ptspace/backend build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache git && corepack enable
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
EXPOSE 5174
CMD ["node", "backend/dist/app.js"]