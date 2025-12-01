#!/bin/bash

echo "🔍 Checking port conflicts..."

echo ""
echo "=== Port 1444 ==="
sudo lsof -i :1444
sudo netstat -tulpn | grep 1444

echo ""
echo "=== Port 1445 ==="
sudo lsof -i :1445
sudo netstat -tulpn | grep 1445

echo ""
echo "=== Docker containers ==="
docker ps -a

echo ""
echo "=== Docker networks ==="
docker network ls

echo ""
echo "=== Node.js processes ==="
ps aux | grep node | grep -v grep

echo ""
echo "=== Docker processes using ports ==="
sudo lsof -i -P -n | grep docker

