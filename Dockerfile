FROM centos/nodejs-6-centos7

EXPOSE 3000

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV
COPY package.json .
RUN scl enable rh-nodejs6 'npm install && npm cache clean --force'
COPY . .

CMD [ "npm", "start" ]

