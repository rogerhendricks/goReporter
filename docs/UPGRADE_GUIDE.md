# Upgrade Guide - Docker Deployment

This guide explains how to upgrade your goReporter application running in Docker without losing any data.

## Prerequisites

- Docker and Docker Compose installed
- Access to the server running the application
- Basic knowledge of command line operations

## Quick Upgrade Steps

```bash
# 1. Backup your data
./scripts/backup.sh

# 2. Pull latest code (if using git)
git pull origin main

# 3. Rebuild and restart containers
docker-compose down
docker-compose up -d --build

# 4. Verify the upgrade
docker-compose logs -f
```

## Detailed Upgrade Process

### Step 1: Backup Your Data

**CRITICAL: Always backup before upgrading!**

#### Option A: Manual Database Backup

For PostgreSQL:
```bash
# Create backup directory
mkdir -p backups

# Backup the database
docker-compose exec db pg_dump -U postgres goReporter > backups/goReporter_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh backups/
```

For MySQL:
```bash
# Create backup directory
mkdir -p backups

# Backup the database
docker-compose exec db mysqldump -u root -p goReporter > backups/goReporter_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh backups/
```

#### Option B: Backup Uploaded Files

```bash
# Backup uploads directory
tar -czf backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# Verify backup
ls -lh backups/
```

#### Option C: Complete System Backup

```bash
# Backup everything including volumes
docker-compose down
tar -czf backups/complete_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  docker-compose.yml \
  Dockerfile* \
  uploads/ \
  logs/ \
  .env

# Restart services
docker-compose up -d
```

### Step 2: Update Application Code

#### If Using Git:

```bash
# Fetch latest changes
git fetch origin

# Check current version
git log -1 --oneline

# View what will change
git diff HEAD origin/main

# Pull latest code
git pull origin main
```

#### If Using Manual Updates:

1. Download the latest release
2. Extract to a temporary directory
3. Compare configuration files
4. Copy new files to deployment directory

### Step 3: Review Changes

```bash
# Check if there are any changes to docker-compose.yml
git diff docker-compose.yml

# Check if there are environment variable changes
git diff .env.example

# Review migration files
ls -la migrations/
```

**Important:** If there are changes to `.env.example`, update your `.env` file accordingly.

### Step 4: Stop Running Containers

```bash
# Stop containers gracefully
docker-compose down

# Verify containers are stopped
docker-compose ps
```

**Note:** This command stops containers but **preserves volumes** (your data).

### Step 5: Rebuild and Start Containers

```bash
# Rebuild images with latest code
docker-compose build --no-cache

# Start containers in detached mode
docker-compose up -d

# Or combine both steps:
docker-compose up -d --build
```

### Step 6: Verify Database Migrations

The application should run migrations automatically on startup, but verify:

```bash
# Check application logs
docker-compose logs -f api

# Look for migration messages like:
# "Running AutoMigrate..."
# "Database migration and seeding completed."
```

If migrations don't run automatically:

```bash
# Enter the API container
docker-compose exec api /bin/sh

# Run migrations manually (if needed)
# The app typically handles this on startup

# Exit container
exit
```

### Step 7: Verify the Upgrade

#### Check Container Status:
```bash
# Verify all containers are running
docker-compose ps

# Expected output:
# NAME                SERVICE    STATUS       PORTS
# goreporter-api-1    api        Up          0.0.0.0:8080->8080/tcp
# goreporter-db-1     db         Up          5432/tcp
# goreporter-web-1    web        Up          0.0.0.0:80->80/tcp
```

#### Check Application Logs:
```bash
# View API logs
docker-compose logs -f api

# View database logs
docker-compose logs -f db

# View web server logs
docker-compose logs -f web

# View all logs
docker-compose logs -f
```

#### Test Application Access:
```bash
# Test API health
curl http://localhost:8080/api/health || curl http://your-domain.com/api/health

# Test frontend access
curl http://localhost/ || curl http://your-domain.com/
```

#### Login and Verify Features:
1. Open browser and navigate to your application URL
2. Login with admin credentials
3. Verify key features:
   - Patient list loads
   - Reports display correctly
   - Search functionality works
   - File uploads work

### Step 8: Monitor After Upgrade

```bash
# Monitor logs for errors
docker-compose logs -f | grep -i error

# Check resource usage
docker stats

# Check disk space
df -h
```

## Rollback Procedure

If the upgrade fails, you can rollback to the previous version:

### Option 1: Rollback Using Git

```bash
# Stop new version
docker-compose down

# Rollback code to previous version
git log --oneline -10  # Find the commit hash
git checkout <previous-commit-hash>

# Restore database from backup
docker-compose up -d db
docker-compose exec -T db psql -U postgres goReporter < backups/goReporter_YYYYMMDD_HHMMSS.sql

# Start application
docker-compose up -d
```

### Option 2: Restore from Complete Backup

```bash
# Stop all containers
docker-compose down -v  # WARNING: This removes volumes!

# Extract backup
tar -xzf backups/complete_backup_YYYYMMDD_HHMMSS.tar.gz

# Restart application
docker-compose up -d
```

## Upgrading with Zero Downtime

For production environments with high availability requirements:

### Blue-Green Deployment

1. **Prepare new environment:**
   ```bash
   # Copy current setup to new directory
   cp -r /path/to/current /path/to/new
   cd /path/to/new
   
   # Update code
   git pull origin main
   
   # Use different ports in docker-compose.yml
   # Change 8080:8080 to 8081:8080
   ```

2. **Start new version:**
   ```bash
   docker-compose up -d
   # Test on port 8081
   ```

3. **Switch traffic:**
   ```bash
   # Update nginx/load balancer to point to new version
   # Verify it works
   ```

4. **Stop old version:**
   ```bash
   cd /path/to/current
   docker-compose down
   ```

## Automated Upgrade Script

Create a script `scripts/upgrade.sh`:

```bash
#!/bin/bash
set -e

echo "=== goReporter Upgrade Script ==="

# Configuration
BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
echo "1. Backing up database..."
docker-compose exec -T db pg_dump -U postgres goReporter > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
echo "2. Backing up uploads..."
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# Pull latest code
echo "3. Pulling latest code..."
git pull origin main

# Rebuild and restart
echo "4. Rebuilding containers..."
docker-compose down
docker-compose up -d --build

# Wait for services to start
echo "5. Waiting for services to start..."
sleep 10

# Check status
echo "6. Checking container status..."
docker-compose ps

echo "=== Upgrade complete ==="
echo "Backup location: $BACKUP_DIR/"
echo "Please verify the application is working correctly"
```

Make it executable:
```bash
chmod +x scripts/upgrade.sh
```

## Environment-Specific Considerations

### Development Environment
- Can use `docker-compose down -v` to reset completely
- Migrations will recreate schema
- Seed data will repopulate

### Production Environment
- **NEVER** use `-v` flag (removes volumes)
- Always backup before upgrading
- Test upgrade in staging first
- Plan maintenance window
- Notify users of downtime

## Troubleshooting

### Containers Won't Start

```bash
# Check logs for errors
docker-compose logs

# Check if ports are already in use
sudo netstat -tulpn | grep -E ':(80|8080|5432|3306)'

# Remove orphaned containers
docker-compose down --remove-orphans
```

### Database Connection Errors

```bash
# Verify database container is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Test database connection
docker-compose exec api ping db
```

### Migration Errors

```bash
# View migration logs
docker-compose logs api | grep -i migrate

# Access database directly
docker-compose exec db psql -U postgres goReporter

# Check migration table
SELECT * FROM schema_migrations;
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up old images
docker image prune -a

# Clean up old containers
docker container prune

# Clean up old volumes (CAREFUL!)
docker volume ls
```

## Best Practices

1. **Always backup before upgrading**
2. **Test upgrades in staging environment first**
3. **Read release notes for breaking changes**
4. **Keep multiple backups (not just the latest)**
5. **Document any custom configuration changes**
6. **Monitor logs after upgrade**
7. **Have a rollback plan ready**
8. **Schedule upgrades during low-traffic periods**
9. **Notify users of planned maintenance**
10. **Keep Docker and Docker Compose updated**

## Maintenance Schedule

Recommended upgrade schedule:

- **Security patches:** As soon as available
- **Minor versions:** Monthly or quarterly
- **Major versions:** Plan carefully, test thoroughly

## Support

If you encounter issues during upgrade:

1. Check the logs: `docker-compose logs -f`
2. Review this guide
3. Check GitHub issues
4. Restore from backup if necessary

## Backup Retention Policy

Recommended backup retention:

- **Daily backups:** Keep for 7 days
- **Weekly backups:** Keep for 4 weeks
- **Monthly backups:** Keep for 12 months
- **Pre-upgrade backups:** Keep indefinitely

Example cleanup script:
```bash
# Delete backups older than 30 days
find backups/ -name "*.sql" -mtime +30 -delete
find backups/ -name "*.tar.gz" -mtime +30 -delete
```
