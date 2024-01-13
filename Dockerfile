FROM nginx:alpine
COPY html /usr/share/nginx/html
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY data /usr/share/nginx/html/data


ENV MAGICK_HOME=/usr
RUN apk update 
RUN apk add --no-cache --no-interactive imagemagick && \
apk add --no-cache --no-interactive imagemagick-dev

ADD ./config/docker_imagemagic_policy.xml /etc/ImageMagick-6/policy.xml

RUN find /usr/share/nginx/html/data -type f -name '*.jpg' -exec convert {} -resize 1024x -quality 50% {} \;