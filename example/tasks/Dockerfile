FROM node:12.6

WORKDIR /opt/lzproxy
COPY lzproxy .

WORKDIR /opt/storage
COPY example/storage .

WORKDIR /opt/tasks
COPY example/tasks/package.json example/tasks/package-lock.json ./
RUN npm install

COPY example/tasks .

USER node

CMD ["npm", "start"]
