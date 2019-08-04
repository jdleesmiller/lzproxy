#
# Frontend Setup
#
FROM node:12.6 AS frontend

WORKDIR /opt/todo/frontend

COPY example/todo/frontend/package.json example/todo/frontend/package-lock.json ./
RUN npm install

RUN mkdir dist && chown node:node dist

USER node

CMD ["npm", "start"]

#
# Frontend Build
#
FROM frontend AS frontend-build

COPY example/todo/frontend .

RUN npm run build

#
# Backend for Dev / Test
#
FROM node:12.6 AS backend-dev

WORKDIR /opt/lzproxy
COPY lzproxy .

WORKDIR /opt/storage
COPY example/storage .

WORKDIR /opt/todo/backend
COPY example/todo/backend/package.json example/todo/backend/package-lock.json ./
RUN npm install

COPY example/todo/backend .

USER node

CMD ["npm", "start"]

#
# Backend for Production
#
FROM node:12.6-slim AS backend

WORKDIR /opt/todo/backend

COPY --from=backend-dev --chown=root:root /opt/todo/backend .

COPY --from=frontend-build --chown=root:root /opt/todo/frontend/dist dist

USER node

CMD ["npm", "start"]
