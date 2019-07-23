FROM node:12.6

WORKDIR /opt/lzproxy
COPY lzproxy .

WORKDIR /opt/storage
COPY example/storage .

WORKDIR /opt/search
COPY example/search/package.json example/search/package-lock.json ./
RUN npm install

COPY example/search .

USER node

CMD ["npm", "start"]
