# One container: the built web app and the API that serves it.
# Build: docker build -t goalie-goals .
# Run locally with the mock identity (never in production):
#   docker run --rm -p 8080:8080 -e NODE_ENV=development -e GOALIE_DEV_MOCK_IDENTITY=1 \
#     -e GOALIE_ROLES='kai@example.com=keeper;sam@example.com=parent' goalie-goals

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --no-audit --no-fund
COPY server server
COPY web web
RUN npm run build

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --omit=dev --workspace server --no-audit --no-fund

FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=8080 \
    WEB_ROOT=/app/web
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY server/package.json server/
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/web/dist web
# Exercise cards, figures and credits; the API serves approved versions only.
COPY content content
USER node
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
