docker stop receipt-suggest
docker rm receipt-suggest
docker build -t receipt-suggest-image:v1 .
docker run --name receipt-suggest -d -p 8080:80 receipt-suggest:v1