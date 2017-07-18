#!/usr/bin/env bash
docker rm -f $(docker ps -a -q  --filter name=mongodb-fh-sync-server)
echo "Mongodb Stopped"
docker rm -f $(docker ps -a -q  --filter name=redis-fh-sync-server)
echo "Redis Stopped"
