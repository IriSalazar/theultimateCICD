FROM node:12

WORKDIR /usr/src/app

RUN apt-get update

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npm", "run", "start" ]