# syntax=docker/dockerfile:1

FROM node:24-alpine AS build-base

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM build-base AS builder
RUN npm run build:prod

FROM build-base AS private-builder
COPY --from=private-data data /app/src/assets/data
RUN npm run build:prod

FROM nginx:alpine AS nginx-base
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-common.conf /etc/nginx/receipt-suggest-common.conf

FROM nginx-base AS base
COPY --from=builder /app/dist/receipt-suggest/browser /usr/share/nginx/html

FROM builder AS compressed-assets
RUN apk add --no-cache imagemagick imagemagick-jpeg
COPY config/docker_imagemagic_policy.xml /etc/ImageMagick-6/policy.xml
RUN find /app/dist/receipt-suggest/browser/assets/data -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' \) \
    -exec mogrify -strip -resize '1024x>' -quality 50 {} +

FROM private-builder AS private-compressed-assets
RUN apk add --no-cache imagemagick imagemagick-jpeg
COPY config/docker_imagemagic_policy.xml /etc/ImageMagick-6/policy.xml
RUN find /app/dist/receipt-suggest/browser/assets/data -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' \) \
    -exec mogrify -strip -resize '1024x>' -quality 50 {} +

FROM nginx-base AS image-compressed
COPY --from=compressed-assets /app/dist/receipt-suggest/browser /usr/share/nginx/html

FROM nginx-base AS user-state-runtime
COPY user-state-server.mjs /usr/local/bin/user-state-server.mjs
COPY start-user-state-image.sh /usr/local/bin/start-user-state-image.sh
COPY user-state.conf /etc/nginx/user-state.conf
RUN apk add --no-cache nodejs && chmod 755 /usr/local/bin/start-user-state-image.sh

FROM user-state-runtime AS user-state-image
COPY --from=compressed-assets /app/dist/receipt-suggest/browser /usr/share/nginx/html
COPY prod.conf /etc/nginx/conf.d/default.conf
ARG AUTH_CACHE_BUST
RUN --mount=type=secret,id=basic_auth_users \
    test -s /run/secrets/basic_auth_users && \
    cp /run/secrets/basic_auth_users /usr/share/.htpasswd && \
    chown root:nginx /usr/share/.htpasswd && \
    chmod 640 /usr/share/.htpasswd
VOLUME ["/var/lib/receipt-suggest-user-state"]
ENTRYPOINT ["/usr/local/bin/start-user-state-image.sh"]

FROM user-state-image AS private-user-state-image
ARG APP_REVISION
LABEL org.opencontainers.image.revision=$APP_REVISION
COPY --from=private-compressed-assets /app/dist/receipt-suggest/browser /usr/share/nginx/html
COPY --from=private-data prod.conf /etc/nginx/conf.d/default.conf

FROM user-state-image AS production