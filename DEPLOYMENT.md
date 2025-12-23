# AI CxO - Deployment Guide

This guide covers deploying AI CxO to production environments.

## Table of Contents
- [Quick Start (Development)](#quick-start-development)
- [Production Deployment](#production-deployment)
- [Configuration Reference](#configuration-reference)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Scaling & High Availability](#scaling--high-availability)
- [Backup & Recovery](#backup--recovery)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Quick Start (Development)

```bash
# Clone and start with defaults
git clone <repository-url>
cd aicxo
docker-compose up -d

# Access at http://localhost:3000
# Default admin: admin / admin123
```

---

## Production Deployment

### Step 1: Create Environment Configuration

```bash
# Copy the example environment file
cp env.example .env

# Edit with your production values
nano .env
```

**Critical settings to change for production:**

```env
# Generate a secure secret key
SECRET_KEY=$(openssl rand -hex 32)

# Strong database passwords
POSTGRES_PASSWORD=your-secure-postgres-password
MONGO_PASSWORD=your-secure-mongo-password

# Your domain
APP_URL=https://aicxo.yourdomain.com
CORS_ORIGINS=https://aicxo.yourdomain.com

# Secure admin credentials
DEFAULT_ADMIN_PASSWORD=your-secure-admin-password

# OpenAI API key
OPENAI_API_KEY=sk-your-api-key
```

### Step 2: Deploy with Docker Compose

**For HTTP (development/testing):**
```bash
docker-compose up -d --build
```

**For HTTPS (production):**
```bash
# Ensure SSL certificates are in place first (see SSL section)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Step 3: Verify Deployment

```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs -f

# Test health endpoint
curl http://localhost:3000/health
```

---

## Configuration Reference

### Application Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_ENV` | Environment (development/staging/production) | `development` |
| `APP_URL` | Full application URL | `http://localhost:3000` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000,http://localhost:5173` |

### Security Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing key (**change in production!**) | random |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration | `60` |

### PostgreSQL Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_HOST` | Database host | `postgres` |
| `POSTGRES_PORT` | Database port | `5432` |
| `POSTGRES_USER` | Database user | `aicxo_user` |
| `POSTGRES_PASSWORD` | Database password | `aicxo_password` |
| `POSTGRES_DB` | Database name | `aicxo_users` |

### MongoDB Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection URI | `mongodb://mongodb:27017` |
| `MONGO_DB` | Database name | `aicxo_documents` |
| `MONGO_USER` | MongoDB user (optional) | - |
| `MONGO_PASSWORD` | MongoDB password (optional) | - |

### OpenAI Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (also configurable via UI) | - |
| `DEFAULT_AI_MODEL` | Default model for new agents | `gpt-4o-mini` |

### Networking Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `FRONTEND_PORT` | Exposed HTTP port | `3000` |
| `FRONTEND_SSL_PORT` | Exposed HTTPS port (prod) | `443` |
| `BACKEND_HOST` | Backend container hostname | `backend` |
| `BACKEND_PORT` | Backend internal port | `8000` |

### Default Admin User

| Variable | Description | Default |
|----------|-------------|---------|
| `DEFAULT_ADMIN_EMAIL` | Admin email | `admin@aicxo.com` |
| `DEFAULT_ADMIN_USERNAME` | Admin username | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | Admin password (**change!**) | `admin123` |

---

## SSL/HTTPS Setup

### Option 1: Let's Encrypt with Certbot

```bash
# Install certbot
apt-get install certbot

# Obtain certificate
certbot certonly --standalone -d aicxo.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/aicxo.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/aicxo.yourdomain.com/privkey.pem
```

Update `docker-compose.prod.yml`:
```yaml
frontend:
  volumes:
    - ./nginx/nginx.prod.conf:/etc/nginx/conf.d/default.conf:ro
    - /etc/letsencrypt/live/aicxo.yourdomain.com/fullchain.pem:/etc/ssl/certs/fullchain.pem:ro
    - /etc/letsencrypt/live/aicxo.yourdomain.com/privkey.pem:/etc/ssl/private/privkey.pem:ro
```

Update `nginx/nginx.prod.conf` - uncomment SSL lines:
```nginx
ssl_certificate /etc/ssl/certs/fullchain.pem;
ssl_certificate_key /etc/ssl/private/privkey.pem;
```

### Option 2: Behind a Reverse Proxy (Traefik, Caddy, etc.)

If you're using an external reverse proxy that handles SSL:

```yaml
# docker-compose.override.yml
services:
  frontend:
    ports:
      - "3000:80"  # Internal port only, proxy handles SSL
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.aicxo.rule=Host(`aicxo.yourdomain.com`)"
      - "traefik.http.routers.aicxo.tls.certresolver=letsencrypt"
```

---

## Scaling & High Availability

### Horizontal Scaling

For high-availability deployments:

```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
    
  frontend:
    deploy:
      replicas: 2
```

```bash
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

### Database Considerations

**PostgreSQL:**
- Consider managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
- Set up read replicas for scaling reads
- Enable connection pooling (PgBouncer)

**MongoDB:**
- Use MongoDB Atlas for managed hosting
- Configure replica sets for HA
- Enable sharding for large datasets

Update connection strings in `.env`:
```env
POSTGRES_HOST=your-rds-endpoint.amazonaws.com
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/aicxo
```

---

## Backup & Recovery

### PostgreSQL Backup

```bash
# Backup
docker exec aicxo-postgres pg_dump -U aicxo_user aicxo_users > backup_postgres_$(date +%Y%m%d).sql

# Restore
cat backup_postgres_20241224.sql | docker exec -i aicxo-postgres psql -U aicxo_user aicxo_users
```

### MongoDB Backup

```bash
# Backup
docker exec aicxo-mongodb mongodump --db aicxo_documents --out /tmp/backup
docker cp aicxo-mongodb:/tmp/backup ./backup_mongo_$(date +%Y%m%d)

# Restore
docker cp ./backup_mongo_20241224 aicxo-mongodb:/tmp/restore
docker exec aicxo-mongodb mongorestore --db aicxo_documents /tmp/restore/aicxo_documents
```

### Automated Backups

Create a cron job for daily backups:

```bash
# /etc/cron.daily/aicxo-backup
#!/bin/bash
BACKUP_DIR=/var/backups/aicxo
mkdir -p $BACKUP_DIR

# PostgreSQL
docker exec aicxo-postgres pg_dump -U aicxo_user aicxo_users > $BACKUP_DIR/postgres_$(date +%Y%m%d).sql

# MongoDB
docker exec aicxo-mongodb mongodump --db aicxo_documents --archive > $BACKUP_DIR/mongo_$(date +%Y%m%d).archive

# Keep last 7 days
find $BACKUP_DIR -mtime +7 -delete
```

---

## Monitoring

### Health Checks

```bash
# Application health
curl http://localhost:3000/health

# Container status
docker-compose ps

# Container stats
docker stats
```

### Logging

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Recommended Monitoring Stack

Consider adding:
- **Prometheus** for metrics collection
- **Grafana** for visualization
- **Loki** for log aggregation

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend

# Verify environment variables
docker-compose config

# Rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

### Database connection issues

```bash
# Check if databases are healthy
docker-compose ps

# Test PostgreSQL connection
docker exec -it aicxo-postgres psql -U aicxo_user -d aicxo_users -c "SELECT 1"

# Test MongoDB connection
docker exec -it aicxo-mongodb mongosh --eval "db.adminCommand('ping')"
```

### API returns 401/403 errors

1. Verify `SECRET_KEY` is the same across restarts
2. Check `CORS_ORIGINS` includes your frontend URL
3. Clear browser localStorage and re-login

### OpenAI API errors

1. Verify API key is set (via `.env` or Admin UI)
2. Check API key has sufficient credits
3. Verify the model name is valid (e.g., `gpt-4o-mini`)

### Reset to clean state

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data!)
docker-compose down -v

# Rebuild and start fresh
docker-compose up -d --build
```

---

## Quick Reference

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build

# View logs
docker-compose logs -f

# Shell into container
docker exec -it aicxo-backend bash

# Update single service
docker-compose up -d --build backend

# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

