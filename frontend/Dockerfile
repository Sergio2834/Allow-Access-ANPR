# STADIO 1: Compilazione con Node.js
FROM node:20-alpine AS build
WORKDIR /app

# Copia i file delle dipendenze e installa
COPY package*.json ./
RUN npm install

# Copia il resto del codice e compila per la produzione
COPY . .
RUN npm run build

# STADIO 2: Server Nginx per la produzione
FROM nginx:alpine

# Copia la cartella 'dist' dallo stadio 1 alla cartella pubblica di Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Istruisce Nginx a gestire correttamente le rotte di React Router
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]