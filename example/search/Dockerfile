FROM node:10.16.0

WORKDIR /opt/lzproxy
COPY lzproxy .

WORKDIR /opt/search
COPY example/search/package.json example/search/package-lock.json ./
RUN npm install

COPY example/search .

USER node

CMD ["npm", "start"]
