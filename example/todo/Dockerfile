FROM node:12.6

WORKDIR /opt/todo
COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

USER node

CMD ["npm", "start"]
