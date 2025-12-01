#!/bin/bash

echo "🔧 Fixing port conflicts..."

# Stop all containers
echo "1. Stopping all containers..."
docker-compose down --remove-orphans 2>/dev/null

# Remove all containers
echo "2. Removing all containers..."
docker rm -f $(docker ps -aq) 2>/dev/null

# Kill Node.js processes that might be using ports
echo "3. Killing Node.js processes..."
pkill -f "node.*server.js" 2>/dev/null
pkill -f "node.*1444" 2>/dev/null
pkill -f "node.*1445" 2>/dev/null

# Kill docker-proxy processes
echo "4. Killing docker-proxy processes..."
sudo pkill -f "docker-proxy.*1444" 2>/dev/null
sudo pkill -f "docker-proxy.*1445" 2>/dev/null

# Check and kill processes on ports
echo "5. Checking and killing processes on ports..."
for port in 1444 1445; do
    PIDS=$(sudo lsof -ti :$port 2>/dev/null)
    if [ ! -z "$PIDS" ]; then
        echo "   Killing processes on port $port: $PIDS"
        sudo kill -9 $PIDS 2>/dev/null
    fi
done

# Clean up Docker networks
echo "6. Cleaning up Docker networks..."
docker network prune -f

# Wait a bit
sleep 2

# Verify ports are free
echo ""
echo "✅ Verification:"
echo "Port 1444:"
sudo lsof -i :1444 || echo "   Free"
echo "Port 1445:"
sudo lsof -i :1445 || echo "   Free"

echo ""
echo "✅ Ready to start docker-compose"

