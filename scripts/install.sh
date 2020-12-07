#!/bin/bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 922803931776.dkr.ecr.us-east-1.amazonaws.com
docker pull 922803931776.dkr.ecr.us-east-1.amazonaws.com/cicd-repository:latest
