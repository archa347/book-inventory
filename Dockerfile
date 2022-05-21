FROM node:18-alpine as builder

RUN mkdir -p /app && chown -R node:node /app

WORKDIR /app

COPY ./package*.json ./

RUN npm install

COPY ./bin ./bin
COPY ./tsconfig.json ./
COPY ./src ./src
COPY ./test ./test

RUN npm run build

FROM node:18-alpine as dev

COPY --from=builder --chown=node:node /app /app


WORKDIR /app

USER node

CMD npm run start-dev

FROM node:18-alpine as app

RUN mkdir -p /app && chown -R node:node /app

COPY --from=builder --chown=node:node /bin ./bin
COPY --from=builder --chown=node:node /app/dist ./dist

WORKDIR /app

COPY ./package*.json ./

RUN npm install --omit=dev

COPY --from=builder --chown=node:node /app/dist ./dist

USER node

CMD npm start








