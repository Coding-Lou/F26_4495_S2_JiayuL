# syntax=docker/dockerfile:1
# One image for every environment: the bundle carries no environment values.
# Keycloak settings come from the container environment at start
# (docker/runtime-config.sh), and /api/ is reached same-origin through
# whatever routes the host (a local reverse proxy, or a Kubernetes Ingress).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=0755 docker/runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
