FROM node:10.16.0

WORKDIR /opt/lzproxy
COPY . .
RUN npm install

WORKDIR /opt/lzproxy/example/tasks
RUN npm install

USER node

CMD ["npm", "start"]
