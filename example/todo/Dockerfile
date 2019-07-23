FROM node:12.6

WORKDIR /opt/lzproxy
COPY lzproxy .

WORKDIR /opt/storage
COPY example/storage .

WORKDIR /opt/todo
COPY example/todo/package.json example/todo/package-lock.json ./
RUN npm install

COPY example/todo .

RUN npm run build

USER node

CMD ["npm", "start"]
