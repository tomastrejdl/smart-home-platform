FROM node:12.11.1

# Build the frontend
WORKDIR /smart-home-frontend
COPY ./smart-home-frontend .
RUN npm install
RUN npm run build

# Install and run the backend
WORKDIR /smart-home-platform
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
EXPOSE 3000
RUN npm install -g nodemon
CMD [ "nodemon", "index.js" ]