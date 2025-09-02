#!/bin/bash

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