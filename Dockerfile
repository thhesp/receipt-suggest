FROM nginx:alpine
COPY html /usr/share/nginx/html
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY testdata /usr/share/nginx/html/data