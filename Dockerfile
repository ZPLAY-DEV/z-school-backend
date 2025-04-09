# https://www.tomray.dev/nestjs-docker-production
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY *.account-key.json ./

# Install app dependencies
# RUN apk add --update --no-cache python3 build-base gcc && ln -sf /usr/bin/python3 /usr/bin/python
# add libraries; sudo so non-root user added downstream can get sudo
RUN apk add --no-cache \
  sudo \
  curl \
  build-base \
  g++ \
  libpng \
  libpng-dev \
  jpeg-dev \
  pango-dev \
  cairo-dev \
  giflib-dev \
  python3 \
  && ln -sf /usr/bin/python3 /usr/bin/python \
  ;
RUN npm install

# Bundle app source
COPY . .
COPY .env.production .env

# Creates a "dist" folder with the production build
RUN npm run build

# ENV NODE_ENV production

# Start the server using the production build
CMD [ "node", "dist/main.js" ]
