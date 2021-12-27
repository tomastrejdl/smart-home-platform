FROM node:12.11.1
WORKDIR /smart-home-platform
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
EXPOSE 3000
RUN npm install -g nodemon
CMD [ "nodemon", "index.js" ]