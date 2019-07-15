FROM node:10.16.0

WORKDIR /opt/todo
COPY package.json package-lock.json ./
RUN npm install

COPY . .

USER node

CMD ["npm", "start"]
