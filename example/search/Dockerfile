FROM node:10.16.0

WORKDIR /opt/lzproxy
COPY . .
RUN npm install

WORKDIR /opt/lzproxy/example/search
RUN npm install

USER node

CMD ["npm", "start"]
