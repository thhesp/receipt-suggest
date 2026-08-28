# Build stage - Compile Angular application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Angular application
RUN npm run build:prod

# Runtime stage - Serve with nginx
FROM nginx:alpine AS base

# Configure nginx for SPA
RUN echo 'server { \
  listen 80; \
  location / { \
    root /usr/share/nginx/html; \
    try_files $uri $uri/ /index.html; \
  } \
  location /public/data { \
    alias /usr/share/nginx/html/public/data; \
  } \
}' > /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /app/dist/receipt-suggest /usr/share/nginx/html

# Copy data folder
COPY public/data /usr/share/nginx/html/public/data

FROM base AS image-compressed
ENV MAGICK_HOME=/usr
RUN apk update 
RUN apk add --no-cache --no-interactive imagemagick && \
apk add --no-cache --no-interactive imagemagick-dev

ADD ./config/docker_imagemagic_policy.xml /etc/ImageMagick-6/policy.xml

RUN find /usr/share/nginx/html/public/data -type f -name '*.jpg' -exec convert {} -resize 1024x -quality 50% {} \;

RUN find /usr/share/nginx/html/public/data -type f -name '*.png' -exec convert {} -resize 1024x -quality 50% {} \;

RUN find /usr/share/nginx/html/public/data -type f -name '*.jpeg' -exec convert {} -resize 1024x -quality 50% {} \;