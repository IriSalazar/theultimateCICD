#!/bin/bash
docker-compose -f /home/ubuntu/app/docker-compose.travis.yml down
docker stop $(docker ps -a -q)
