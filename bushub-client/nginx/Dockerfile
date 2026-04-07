FROM ghcr.io/gangneung/software/smartcity/external/nginx-alpine

# 빌드 인자 정의
ARG CONFIG_FILE=nginx-proxy.conf

# nginx 설정 파일 복사
COPY ${CONFIG_FILE} /etc/nginx/nginx.conf

# 로그 디렉토리 생성
RUN mkdir -p /var/log/nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 