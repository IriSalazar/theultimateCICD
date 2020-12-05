#!/bin/bash
docker-compose -f /home/travis/build/dlcartagena/ChatApp/docker-compose.travis.yml build
docker-compose up -d
docker-compose -f /home/travis/build/dlcartagena/ChatApp/docker-compose.travis.yml exec app npm test
docker-compose -f /home/travis/build/dlcartagena/ChatApp/docker-compose.travis.yml down