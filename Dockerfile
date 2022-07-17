## go compilation
FROM golang:1.16 AS go

WORKDIR /var/www/server

COPY ./src/go ./
COPY ./go.mod ./
COPY ./go.sum ./
RUN go build -o ./dist/server

## final image
FROM node:14

WORKDIR /var/www/server

RUN yarn global add wasm-pack

# typescript compilation
COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock
RUN yarn install

COPY ./webpack.config.js ./webpack.config.js
COPY ./tsconfig.json ./tsconfig.json
COPY ./src/ts ./src/ts
RUN yarn build

# run the server
WORKDIR /var/www/server/dist
COPY --from=go /var/www/server/dist/server /var/www/server/dist/server
CMD ["./server"]
