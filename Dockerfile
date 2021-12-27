FROM node:12.11.1

# Copy the frontend
WORKDIR /smart-home
COPY /frontend-dist /smart-home/frontend-dist


# Install and run the backend
WORKDIR /smart-home/smart-home-platform
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
EXPOSE 3000
RUN npm install -g nodemon
CMD [ "nodemon", "index.js" ]