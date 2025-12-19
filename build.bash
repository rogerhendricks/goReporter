#!/bin/bash

# Set production environment
export APP_ENV=production

echo "Building React frontend..."
cd frontend
npm run build

echo "Building Go backend..."
cd ..
# go build -o bin/server cmd/api/main.go
GOOS=windows GOARCH=amd64 go build -o bin/server.exe cmd/api/main.go
# GOOS=linux GOARCH=amd64 go build -o bin/server cmd/api/main.go
# GOOS=darwin GOARCH=amd64 go build -o bin/server cmd/api/main.go
echo "Build complete!"
# Run database migrations
echo "Running migrations..."
psql $DATABASE_URL -f migrations/001_add_encryption.sql

# Start the application
echo "Starting application..."
./bin/server.exe