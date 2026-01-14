#!/bin/bash

# Set production environment
export APP_ENV=production

echo "Building React frontend..."
cd frontend
npm run build

echo "Building Go backend..."
cd ..
# go build -o bin/server cmd/api/main.go
# GOOS=windows GOARCH=amd64 go build -o bin/server.exe cmd/api/main.go
GOOS=linux GOARCH=amd64 go build -o bin/server cmd/api/main.go
# GOOS=darwin GOARCH=amd64 go build -o bin/server cmd/api/main.go
echo "Build complete!"

# Note: Database migrations are handled automatically by GORM AutoMigrate
# in internal/bootstrap/bootstrap.go when the server starts.
# To force a fresh migration, set DB_RESET=drop before starting.
# To force re-seeding, set DB_SEED=1 before starting.

# Start the application (migrations run automatically on startup)
echo "Starting application..."
./bin/server