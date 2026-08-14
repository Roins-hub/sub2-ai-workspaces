FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html chat.html styles.css app.js favicon.svg /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider --header='Host: first.sub2image.cc.cd' http://127.0.0.1/ || exit 1
