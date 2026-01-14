# Docker Deployment Guide

This guide covers building and deploying the GoReporter application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier orchestration)
- Database connection details (PostgreSQL recommended for production)

## Dockerfile Options

### Standard Dockerfile (`dockerFile`)
Basic multi-stage build suitable for development and production.

### Production Dockerfile (`Dockerfile.production`)
Enhanced version with:
- Security hardening (non-root user)
- Health checks
- Timezone support
- Optimized binary size
- Static binary compilation

## Building the Docker Image

### Development Build
```bash
docker build -f dockerFile -t goreporter:dev .
```

### Production Build (Recommended)
```bash
docker build -f Dockerfile.production -t goreporter:prod .
```

### Build with specific tag
```bash
docker build -f Dockerfile.production -t goreporter:v1.0.0 .
```

## Running the Container

### Basic Run
```bash
docker run -p 5000:5000 goreporter:prod
```

### Run with Environment Variables
```bash
docker run -p 5000:5000 \
  -e APP_ENV=production \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e JWT_SECRET="your-secret-key" \
  -e PORT=5000 \
  goreporter:prod
```

### Run with Database Reset (Fresh Install)
```bash
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e DB_RESET=drop \
  -e DB_SEED=1 \
  goreporter:prod
```

### Run in Detached Mode (Background)
```bash
docker run -d \
  --name goreporter \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  --restart unless-stopped \
  goreporter:prod
```

### Run with Volume for Logs (Optional)
```bash
docker run -d \
  --name goreporter \
  -p 5000:5000 \
  -v $(pwd)/logs:/home/appuser/logs \
  -v $(pwd)/uploads:/home/appuser/uploads \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  goreporter:prod
```

### Run with All Persistent Storage (Recommended)
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

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_ENV` | Environment (development/production) | development | No |
| `PORT` | Server port | 5000 | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | - | Yes |
| `DB_RESET` | Reset database (`drop` to drop all tables) | - | No |
| `DB_SEED` | Force re-seeding (`1` to enable) | - | No |

## Docker Compose (Recommended for Production)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: goreporter
      POSTGRES_USER: goreporter
      POSTGRES_PASSWORD: changeme
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U goreporter"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "5000:5000"
    environment:
      APP_ENV: production
      DATABASE_URL: postgresql://goreporter:changeme@postgres:5432/goreporter?sslmode=disable
      JWT_SECRET: ${JWT_SECRET}
      PORT: 5000
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/health"]
      interval: 30s
      timeout: 3s
      retries: 3

volumes:
  postgres_data:
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Reset database (fresh start)
docker-compose down -v
docker-compose up -d
```

## Persistent Storage

The application stores uploaded files in the `uploads/` directory. **This must be mounted as a volume** to prevent data loss.

### What Gets Stored:
- **Database Data**: PostgreSQL data (via `postgres_data` volume)
- **Uploaded Files**: PDF reports in `uploads/reports/{patientId}/` (via `./uploads` volume)
- **Application Logs**: Server logs in `logs/` (via `./logs` volume)

### Directory Permissions:
The production container runs as user `appuser` (UID 1000). Ensure host directories have correct permissions:

```bash
# Create directories with correct permissions
mkdir -p uploads logs
chown -R 1000:1000 uploads logs
chmod 750 uploads logs
```

### Backup Strategy:
```bash
# Backup uploaded files
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/

# Backup database
docker-compose exec postgres pg_dump -U goreporter goreporter > backup-$(date +%Y%m%d).sql

# Restore database
docker-compose exec -T postgres psql -U goreporter goreporter < backup-20260114.sql
```

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
```

### Stop Container
```bash
docker stop goreporter
```

### Remove Container
```bash
docker rm goreporter
```

### Execute Commands Inside Container
```bash
# Access shell
docker exec -it goreporter sh

# Check running processes
docker exec goreporter ps aux
```

## Health Checks

The production Dockerfile includes a health check that pings `/health` endpoint every 30 seconds.

Check health status:
```bash
docker inspect --format='{{json .State.Health}}' goreporter
```

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

### Permission Issues (when using volumes)
```bash
# The production image runs as user 1000:1000
# Ensure host directories have correct permissions
chown -R 1000:1000 ./logs
```

## Production Deployment Tips

1. **Use specific tags**, not `latest`:
   ```bash
   docker build -t goreporter:v1.0.0 .
   ```

2. **Set resource limits**:
   ```bash
   docker run -m 512m --cpus="1.0" goreporter:prod
   ```

3. **Use secrets for sensitive data**:
   ```bash
   docker run --env-file .env.production goreporter:prod
   ```

4. **Enable automatic restarts**:
   ```bash
   docker run --restart unless-stopped goreporter:prod
   ```

5. **Monitor container health**:
   ```bash
   docker stats goreporter
   ```

## Image Size Optimization

The production Dockerfile creates optimized images:

```bash
# Check image size
docker images goreporter

# Expected sizes:
# Development: ~50-100 MB
# Production: ~30-50 MB (with optimizations)
```

## Migrations

Database migrations are handled automatically by GORM AutoMigrate when the container starts.

### Fresh Installation
```bash
docker run -e DB_RESET=drop -e DB_SEED=1 goreporter:prod
```

### Normal Startup (Auto-migrate only)
```bash
docker run goreporter:prod
```

The application will:
1. Connect to the database
2. Run GORM AutoMigrate for all models
3. Seed the database if empty (or if `DB_SEED=1`)
4. Start the web server

## Security Best Practices

1. **Never commit sensitive data** to Dockerfile or docker-compose.yml
2. **Use environment variables** or Docker secrets for credentials
3. **Run as non-root user** (Dockerfile.production does this)
4. **Keep base images updated**: `docker pull alpine:latest`
5. **Scan for vulnerabilities**: `docker scan goreporter:prod`
6. **Use read-only filesystem** where possible:
   ```bash
   docker run --read-only --tmpfs /tmp goreporter:prod
   ```

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
