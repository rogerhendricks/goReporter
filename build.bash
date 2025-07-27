#!/bin/bash

echo "Building React frontend..."
cd frontend
npm run build

echo "Building Go backend..."
cd ..
go build -o bin/server cmd/api/main.go

echo "Build complete!"