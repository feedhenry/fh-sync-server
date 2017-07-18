#!/usr/bin/env bash

REDIS_VERSION=${REDIS_VERSION:-2.6}
MONGODB_VERSION=${MONGODB_VERSION:-3.2}

echo "Starting Redis-$REDIS_VERSION"
docker pull redis:$REDIS_VERSION
docker rm -f $(docker ps -a -q  --filter name=redis-fh-sync-server)
docker run -d -p 127.0.0.1:6379:6379 --name redis-fh-sync-server redis:$REDIS_VERSION

echo "Starting Mongodb-$MONGODB_VERSION"
docker pull mongo:$MONGODB_VERSION
docker rm -f $(docker ps -a -q  --filter name=mongodb-fh-sync-server)
docker run -d -p 127.0.0.1:27017:27017 --name mongodb-fh-sync-server mongo:$MONGODB_VERSION mongod --smallfiles
#give it some time to complete starting
sleep 5s
