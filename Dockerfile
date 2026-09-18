# syntax=docker/dockerfile:1

# ---- build stage: install production dependencies ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime stage: minimal image ----
FROM node:22-alpine
ENV NODE_ENV=production
ENV MCP_HOST=0.0.0.0
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]