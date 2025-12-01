#!/bin/bash

# Script tự động thêm nginx config cho backend API

NGINX_CONFIG="/etc/nginx/sites-available/speakeasy-backend"
NGINX_ENABLED="/etc/nginx/sites-enabled/speakeasy-backend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Setting up Nginx configuration for backend API..."

# Tạo config file
sudo tee "$NGINX_CONFIG" > /dev/null << 'EOF'
# Backend API Configuration for speakeasy.nguyentrungnam.com
server {
    listen 80;
    server_name speakeasy.nguyentrungnam.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:1444/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:1444;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Tạo symlink
if [ ! -L "$NGINX_ENABLED" ]; then
    sudo ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"
    echo "✅ Created symlink"
else
    echo "⚠️  Symlink already exists"
fi

# Test nginx config
echo "🧪 Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config is valid"
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    echo "✅ Done! Backend API is now accessible via nginx"
else
    echo "❌ Nginx config has errors. Please check manually."
    exit 1
fi

