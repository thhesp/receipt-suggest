docker stop receipt-suggest-test
docker rm receipt-suggest-test
Get-Content Dockerfile | docker build -t receipt-suggest:v1 .
docker run --name receipt-suggest-test -d -p 8088:80 receipt-suggest:v1