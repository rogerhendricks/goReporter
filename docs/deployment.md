# GoReporter Deployment Guide

This guide covers all deployment methods for the GoReporter application including direct builds and Docker deployments.

## Table of Contents
- [Direct Build Deployment](#direct-build-deployment)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Persistent Storage](#persistent-storage)
- [Production Best Practices](#production-best-practices)

---

## Direct Build Deployment

### Using build.bash Script

The `build.bash` script builds both frontend and backend:

```bash
# Make script executable
chmod +x build.bash

# Run build script
./build.bash
```

The script will:
1. Set `APP_ENV=production`
2. Build React frontend (`npm run build`)
3. Build Go backend for Linux AMD64
4. Start the server (with automatic GORM migrations)

### Manual Build Steps

```bash
# Set production environment
export APP_ENV=production

# Build frontend
cd frontend
npm run build

# Build backend
cd ..
GOOS=linux GOARCH=amd64 go build -o bin/server cmd/api/main.go

# Run the server
./bin/server
```

### Build for Different Platforms

```bash
# Windows
GOOS=windows GOARCH=amd64 go build -o bin/server.exe cmd/api/main.go

# macOS
GOOS=darwin GOARCH=amd64 go build -o bin/server cmd/api/main.go

# Linux
GOOS=linux GOARCH=amd64 go build -o bin/server cmd/api/main.go
```

---

## Docker Deployment

### Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier orchestration)
- Database connection details (PostgreSQL recommended for production)

### Dockerfile Options

#### Standard Dockerfile (`dockerFile`)
Basic multi-stage build suitable for development and production.

#### Production Dockerfile (`Dockerfile.production`)
Enhanced version with:
- Security hardening (non-root user)
- Health checks
- Timezone support
- Optimized binary size
- Static binary compilation

### Building the Docker Image

#### Development Build
```bash
docker build -f dockerFile -t goreporter:dev .
```

#### Production Build (Recommended)
```bash
docker build -f Dockerfile.production -t goreporter:prod .
```

#### Build with Specific Tag
```bash
docker build -f Dockerfile.production -t goreporter:v1.0.0 .
```

### Running the Container

#### Basic Run
```bash
docker run -p 5000:5000 goreporter:prod
```

#### Run with Environment Variables
```bash
docker run -p 5000:5000 \
  -e APP_ENV=production \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e JWT_SECRET="your-secret-key" \
  -e PORT=5000 \
  goreporter:prod
```

#### Run with Database Reset (Fresh Install)
```bash
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e DB_RESET=drop \
  -e DB_SEED=1 \
  goreporter:prod
```

#### Run in Detached Mode (Background)
```bash
docker run -d \
  --name goreporter \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  --restart unless-stopped \
  goreporter:prod
```

#### Run with All Persistent Storage (Recommended)
```bash
docker run -d \
  --name goreporter \
  -p 5000:5000 \
  -v $(pwd)/logs:/home/appuser/logs \
  -v $(pwd)/uploads:/home/appuser/uploads \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  --restart unless-stopped \
  goreporter:prod
```

> **Important:** Always mount the `uploads/` directory as a volume to prevent data loss when containers are rebuilt or removed.

### Docker Compose (Recommended for Production)

The project includes a `docker-compose.yml` file for easy orchestration:

```bash
# First time setup - configure environment
cp .env.example .env
nano .env  # Edit JWT_SECRET and other variables

# Create directories with proper permissions
mkdir -p uploads logs
chown -R 1000:1000 uploads logs
chmod 750 uploads logs

# Start all services (with fresh database)
DB_RESET=drop DB_SEED=1 docker-compose up -d

# Or start normally (auto-migrate only)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Reset database (removes all data)
docker-compose down -v
docker-compose up -d
```

The `docker-compose.yml` includes:
- PostgreSQL 15 database with health checks
- GoReporter application with automatic migrations
- Persistent volumes for database, uploads, and logs
- Automatic restarts on failure
- Health checks for both services

---

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_ENV` | Environment (development/production) | development | No |
| `PORT` | Server port | 5000 | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | - | Yes |
| `DB_RESET` | Reset database (`drop` to drop all tables) | - | No |
| `DB_SEED` | Force re-seeding (`1` to enable) | - | No |

### Generating Secrets

```bash
# Generate a strong JWT secret
openssl rand -base64 32
```

---

## Database Migrations

Database migrations are handled automatically by GORM AutoMigrate when the application starts.

### How It Works

When the server starts (`internal/bootstrap/bootstrap.go`):
1. Connects to the database
2. Runs GORM AutoMigrate for all models
3. Seeds the database if empty (or if `DB_SEED=1`)
4. Starts the web server

### Migration Options

#### Normal Startup (Auto-migrate only)
```bash
./bin/server
# or
docker-compose up -d
```

#### Fresh Installation (Drop and Recreate)
```bash
DB_RESET=drop DB_SEED=1 ./bin/server
# or
DB_RESET=drop DB_SEED=1 docker-compose up -d
```

#### Force Re-seed Existing Database
```bash
DB_SEED=1 ./bin/server
# or
DB_SEED=1 docker-compose up -d
```

---

## Persistent Storage

The application stores data in three locations:

### What Gets Stored

| Location | Content | Volume Mount |
|----------|---------|--------------|
| Database | PostgreSQL data | `postgres_data` volume |
| `uploads/` | Uploaded PDF reports | `./uploads:/home/appuser/uploads` |
| `logs/` | Application logs | `./logs:/home/appuser/logs` |

### File Upload Storage

Uploaded files are stored in: `uploads/reports/{patientId}/`

**Critical:** The `uploads/` directory **must be mounted as a volume** to prevent data loss when containers are rebuilt or removed.

### Directory Permissions

The production Docker container runs as user `appuser` (UID 1000). Ensure host directories have correct permissions:

```bash
# Create directories with correct permissions
mkdir -p uploads logs
chown -R 1000:1000 uploads logs
chmod 750 uploads logs
```

### Backup Strategy

#### Backup Uploaded Files
```bash
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/
```

#### Backup Database
```bash
# Docker Compose
docker-compose exec postgres pg_dump -U goreporter goreporter > backup-$(date +%Y%m%d).sql

# Direct PostgreSQL
pg_dump -U goreporter -h localhost goreporter > backup-$(date +%Y%m%d).sql
```

#### Restore Database
```bash
# Docker Compose
docker-compose exec -T postgres psql -U goreporter goreporter < backup-20260114.sql

# Direct PostgreSQL
psql -U goreporter -h localhost goreporter < backup-20260114.sql
```

---```

## Container Management

### View Running Containers
```bash
docker ps
```

### View Container Logs
```bash
docker logs goreporter

# Follow logs in real-time
docker logs -f goreporter

# Last 100 lines
docker logs --tail 100 goreporter

# Docker Compose
docker-compose logs -f app
```

### Stop Container
```bash
docker stop goreporter

# Docker Compose
docker-compose stop
```

### Remove Container
```bash
docker rm goreporter

# Docker Compose
docker-compose down
```

### Execute Commands Inside Container
```bash
# Access shell
docker exec -it goreporter sh

# Check running processes
docker exec goreporter ps aux

# Docker Compose
docker-compose exec app sh
```

---

## Health Checks

The production Dockerfile includes health checks that ping the `/health` endpoint every 30 seconds.

### Check Health Status
```bash
docker inspect --format='{{json .State.Health}}' goreporter

# Docker Compose
docker-compose ps
```

---

## Troubleshooting

### Container Exits Immediately
```bash
# Check logs for errors
docker logs goreporter

# Common issues:
# - Missing DATABASE_URL
# - Database connection failed
# - Port already in use
```

### Database Connection Issues
```bash
# Test database connectivity from container
docker exec goreporter wget -O- http://localhost:5000/health

# Check environment variables
docker exec goreporter env | grep DATABASE
```

### Port Already in Use
```bash
# Find what's using port 5000
lsof -i :5000

# Use a different port
docker run -p 8080:5000 goreporter:prod
```

### Permission Issues (with volumes)
```bash
# The production image runs as user 1000:1000
# Ensure host directories have correct permissions
chown -R 1000:1000 ./logs ./uploads
```

---

## Production Best Practices

### 1. Use Specific Tags
```bash
docker build -t goreporter:v1.0.0 .
```

### 2. Set Resource Limits
```bash
docker run -m 512m --cpus="1.0" goreporter:prod
```

### 3. Use Environment Files for Secrets
```bash
docker run --env-file .env.production goreporter:prod
```

### 4. Enable Automatic Restarts
```bash
docker run --restart unless-stopped goreporter:prod
```

### 5. Monitor Container Health
```bash
docker stats goreporter
```

### 6. Keep Base Images Updated
```bash
docker pull alpine:latest
docker pull postgres:15-alpine
```

### 7. Scan for Vulnerabilities
```bash
docker scan goreporter:prod
```

### 8. Regular Backups
- Schedule daily database backups
- Back up `uploads/` directory regularly
- Store backups in separate location/cloud

---

## Security Best Practices

1. **Never commit sensitive data** to Dockerfile or docker-compose.yml
2. **Use environment variables** or Docker secrets for credentials
3. **Run as non-root user** (Dockerfile.production does this)
4. **Keep base images updated**
5. **Scan for vulnerabilities** regularly
6. **Use read-only filesystem** where possible:
   ```bash
   docker run --read-only --tmpfs /tmp goreporter:prod
   ```
7. **Enable HTTPS** in production with reverse proxy (nginx, Caddy, Traefik)

---

## Registry Deployment

### Tag for Registry
```bash
docker tag goreporter:prod registry.example.com/goreporter:v1.0.0
```

### Push to Registry
```bash
docker push registry.example.com/goreporter:v1.0.0
```

### Pull from Registry
```bash
docker pull registry.example.com/goreporter:v1.0.0
```

---

## Image Size Optimization

The production Dockerfile creates optimized images:

```bash
# Check image size
docker images goreporter

# Expected sizes:
# Development: ~50-100 MB
# Production: ~30-50 MB (with optimizations)
```