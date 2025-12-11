# 🚀 HVV Mobility Platform Deployment Guide

This guide covers various deployment strategies for the HVV Mobility Platform, from development setups to production deployments.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Options](#deployment-options)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Cloud Deployment](#cloud-deployment)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Security Considerations](#security-considerations)
9. [Maintenance](#maintenance)
10. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### System Requirements

**Minimum Requirements:**
- **CPU**: 2 cores
- **Memory**: 4GB RAM
- **Storage**: 20GB SSD
- **Network**: 100Mbps

**Recommended Requirements:**
- **CPU**: 4 cores
- **Memory**: 8GB RAM
- **Storage**: 50GB SSD
- **Network**: 1Gbps

### Software Requirements

- **Node.js**: 18.x or later
- **PostgreSQL**: 14.x or later
- **Redis**: 6.x or later
- **Docker**: 20.x or later (for containerized deployment)
- **Kubernetes**: 1.24+ (for K8s deployment)

### External Services

- **Google Maps API**: For geocoding and routing
- **HVV API**: For public transport data
- **Email Service**: SMTP server or service like SendGrid
- **Monitoring**: Optional (Datadog, New Relic, etc.)

---

## ⚙️ Environment Configuration

### Production Environment Variables

Create a production `.env` file with the following variables:

```bash
# =============================================================================
# Production Environment Configuration
# =============================================================================

# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration (Production)
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=hvv_mobility_prod
DB_USER=hvv_prod_user
DB_PASSWORD=your_secure_db_password
DB_SSL=true
DB_MAX_CONNECTIONS=50
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# Redis Configuration (Production)
REDIS_HOST=your-production-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_KEY_PREFIX=hvv:prod:
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000

# JWT Configuration (Production - Use strong secrets)
JWT_SECRET=your_super_secure_jwt_secret_key_minimum_32_characters
JWT_SECRET_REFRESH=your_super_secure_refresh_secret_key_minimum_32_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# API Keys (Production)
GOOGLE_MAPS_API_KEY=your_production_google_maps_api_key
HVV_API_KEY=your_production_hvv_api_key
HVV_API_SECRET=your_production_hvv_api_secret
HVV_API_BASE_URL=https://api.hvv.de
WEATHER_API_KEY=your_production_weather_api_key

# Payment Configuration (Production)
STRIPE_SECRET_KEY=sk_live_your_stripe_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_live_publishable_key

# Email Configuration (Production)
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=your_production_email
SMTP_PASSWORD=your_production_email_password
EMAIL_FROM=noreply@hvv-mobility.com

# Security Configuration
BCRYPT_ROUNDS=14
SESSION_SECRET=your_super_secure_session_secret_minimum_32_characters

# Rate Limiting (Production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration (Production)
CORS_ORIGIN=https://your-domain.com,https://app.your-domain.com
CORS_CREDENTIALS=true

# Logging Configuration
LOG_LEVEL=warn
LOG_FILE=/var/log/hvv-mobility/app.log
LOG_MAX_SIZE=100m
LOG_MAX_FILES=30d

# Monitoring Configuration
HEALTH_CHECK_INTERVAL=30000

# Production Flags
PRODUCTION_SSL_REQUIRED=true
PRODUCTION_CACHE_ENABLED=true
PRODUCTION_MONITORING_ENABLED=true
PRODUCTION_ERROR_REPORTING=true

# SSL Configuration (if using HTTPS)
SSL_CERT_PATH=/etc/ssl/certs/hvv-mobility.crt
SSL_KEY_PATH=/etc/ssl/private/hvv-mobility.key
```

---

## 🚀 Deployment Options

### Option 1: Traditional Server Deployment

#### 1. Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Redis
sudo apt install redis-server -y

# Install PM2 for process management
sudo npm install -g pm2
```

#### 2. Database Setup

```bash
# Switch to PostgreSQL user
sudo -u postgres psql

# Create database and user
CREATE DATABASE hvv_mobility_prod;
CREATE USER hvv_prod_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE hvv_mobility_prod TO hvv_prod_user;
\q
```

#### 3. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/hvv-mobility-platform.git
cd hvv-mobility-platform

# Install dependencies
npm ci --production

# Setup environment
cp .env.example .env
# Edit .env with production values

# Run database migrations
chmod +x database/migration.sh
./database/migration.sh migrate

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

#### 4. PM2 Ecosystem Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'hvv-mobility-api',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/hvv-mobility/error.log',
    out_file: '/var/log/hvv-mobility/out.log',
    log_file: '/var/log/hvv-mobility/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

#### 5. Nginx Configuration

Create `/etc/nginx/sites-available/hvv-mobility`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/hvv-mobility.crt;
    ssl_certificate_key /etc/ssl/private/hvv-mobility.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health Check
    location /health {
        proxy_pass http://127.0.0.1:3000;
        access_log off;
    }

    # Static Files (if any)
    location /uploads/ {
        alias /var/www/hvv-mobility/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Logging
    access_log /var/log/nginx/hvv-mobility.access.log;
    error_log /var/log/nginx/hvv-mobility.error.log;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/hvv-mobility /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🐳 Docker Deployment

### Option 2: Docker Compose (Single Server)

#### 1. Production Docker Compose

Use `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/var/log/hvv-mobility
      - ./uploads:/var/www/hvv-mobility/uploads
    restart: unless-stopped
    networks:
      - hvv-network
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=hvv_mobility_prod
      - POSTGRES_USER=hvv_prod_user
      - POSTGRES_PASSWORD=your_secure_db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/001_initial_schema.sql:/docker-entrypoint-initdb.d/1-schema.sql
      - ./database/002_create_indexes.sql:/docker-entrypoint-initdb.d/2-indexes.sql
      - ./database/003_seed_data.sql:/docker-entrypoint-initdb.d/3-seed.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - hvv-network
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass your_redis_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - hvv-network
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/sites-available:/etc/nginx/sites-available
      - ./ssl:/etc/ssl
      - ./uploads:/var/www/hvv-mobility/uploads
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - hvv-network

volumes:
  postgres_data:
  redis_data:

networks:
  hvv-network:
    driver: bridge
```

#### 2. Production Dockerfile

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Create necessary directories
RUN mkdir -p /var/log/hvv-mobility /var/www/hvv-mobility/uploads
RUN chown -R nodejs:nodejs /app /var/log/hvv-mobility /var/www/hvv-mobility/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

#### 3. Health Check Script

Create `healthcheck.js`:

```javascript
const http = require('http');

const options = {
  host: 'localhost',
  port: 3000,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('Health check failed:', err);
  process.exit(1);
});

request.end();
```

#### 4. Deployment Commands

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Run database migrations
docker-compose -f docker-compose.prod.yml exec app ./database/migration.sh migrate

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale application (if needed)
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

---

## ☸️ Kubernetes Deployment

### Option 3: Kubernetes Cluster

#### 1. Namespace and ConfigMap

Create `k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: hvv-mobility
```

Create `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hvv-mobility-config
  namespace: hvv-mobility
data:
  NODE_ENV: "production"
  PORT: "3000"
  DB_HOST: "postgres-service"
  REDIS_HOST: "redis-service"
  LOG_LEVEL: "warn"
```

#### 2. Secrets

Create `k8s/secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hvv-mobility-secrets
  namespace: hvv-mobility
type: Opaque
data:
  db-password: <base64-encoded-password>
  jwt-secret: <base64-encoded-jwt-secret>
  redis-password: <base64-encoded-redis-password>
  google-maps-api-key: <base64-encoded-api-key>
```

#### 3. Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hvv-mobility-api
  namespace: hvv-mobility
  labels:
    app: hvv-mobility-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hvv-mobility-api
  template:
    metadata:
      labels:
        app: hvv-mobility-api
    spec:
      containers:
      - name: api
        image: hvv-mobility/platform:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: hvv-mobility-config
              key: NODE_ENV
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: hvv-mobility-secrets
              key: db-password
        envFrom:
        - configMapRef:
            name: hvv-mobility-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /var/log/hvv-mobility
      volumes:
      - name: logs
        emptyDir: {}
      imagePullSecrets:
      - name: registry-secret
```

#### 4. Service

Create `k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hvv-mobility-service
  namespace: hvv-mobility
spec:
  selector:
    app: hvv-mobility-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

#### 5. Ingress

Create `k8s/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hvv-mobility-ingress
  namespace: hvv-mobility
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  tls:
  - hosts:
    - your-domain.com
    - api.your-domain.com
    secretName: hvv-mobility-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: hvv-mobility-service
            port:
              number: 80
      - path: /health
        pathType: Prefix
        backend:
          service:
            name: hvv-mobility-service
            port:
              number: 80
```

#### 6. Horizontal Pod Autoscaler

Create `k8s/hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hvv-mobility-hpa
  namespace: hvv-mobility
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hvv-mobility-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### 7. Deployment Commands

```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n hvv-mobility
kubectl get services -n hvv-mobility
kubectl get ingress -n hvv-mobility

# View logs
kubectl logs -f deployment/hvv-mobility-api -n hvv-mobility

# Scale deployment
kubectl scale deployment hvv-mobility-api --replicas=5 -n hvv-mobility
```

---

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. ECS (Elastic Container Service)

```json
{
  "family": "hvv-mobility-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/hvv-mobility:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:hvv-mobility/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hvv-mobility",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### 2. Application Load Balancer

```yaml
Resources:
  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: hvv-mobility-alb
      Scheme: internet-facing
      Type: application
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
      SecurityGroups:
        - !Ref LoadBalancerSecurityGroup

  TargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: hvv-mobility-tg
      Port: 80
      Protocol: HTTP
      VpcId: !Ref VPC
      HealthCheckProtocol: HTTP
      HealthCheckPath: /health
      HealthCheckIntervalSeconds: 30
      HealthCheckTimeoutSeconds: 5
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 3
      TargetType: ip

  Listener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !Ref LoadBalancer
      Port: 443
      Protocol: HTTPS
      Certificates:
        - CertificateArn: !Ref SSLCertificate
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref TargetGroup
```

### Google Cloud Platform

#### 1. Cloud Run Deployment

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/your-project/hvv-mobility

# Deploy to Cloud Run
gcloud run deploy hvv-mobility \
  --image gcr.io/your-project/hvv-mobility \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 1 \
  --set-env-vars NODE_ENV=production \
  --set-secrets DB_PASSWORD=hvv-mobility-db-password:latest
```

---

## 📊 Monitoring and Logging

### 1. Application Monitoring

#### Prometheus and Grafana

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'hvv-mobility-api'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

#### Custom Metrics

Add to your application:

```typescript
import client from 'prom-client';

// Create metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Export metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

### 2. Logging

#### Winston Configuration

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hvv-mobility-api' },
  transports: [
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### 3. Error Tracking

#### Sentry Integration

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Error handling middleware
app.use(Sentry.Handlers.errorHandler());
```

---

## 🔒 Security Considerations

### 1. SSL/TLS Configuration

```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### 2. Security Headers

```typescript
// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 3. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 4. Environment Security

```bash
# Secure environment variables
chmod 600 .env

# Use secrets management in production
kubectl create secret generic hvv-secrets \
  --from-env-file=.env \
  --namespace=hvv-mobility
```

---

## 🔧 Maintenance

### 1. Database Maintenance

```sql
-- Regular maintenance queries
-- Vacuum analyze tables
VACUUM ANALYZE users, routes, bookings;

-- Reindex tables
REINDEX TABLE users;
REINDEX TABLE routes;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 2. Log Rotation

```bash
# /etc/logrotate.d/hvv-mobility
/var/log/hvv-mobility/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload hvv-mobility
    endscript
}
```

### 3. Backup Strategy

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/hvv-mobility"

# Database backup
pg_dump -h localhost -U hvv_prod_user -d hvv_mobility_prod | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# File backup
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /var/www/hvv-mobility/uploads

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### 4. Update Process

```bash
#!/bin/bash
# deploy.sh
set -e

echo "Starting deployment..."

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Run database migrations
./database/migration.sh migrate

# Build application
npm run build

# Restart application
pm2 reload hvv-mobility-api

echo "Deployment completed successfully!"
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U hvv_prod_user -d hvv_mobility_prod -c "SELECT 1;"

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### 2. Redis Connection Issues

```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connection
redis-cli -u redis://localhost:6379 ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

#### 3. Application Issues

```bash
# Check application logs
pm2 logs hvv-mobility-api

# Check application status
pm2 status

# Restart application
pm2 restart hvv-mobility-api

# Check system resources
free -h
df -h
top
```

#### 4. Nginx Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Performance Issues

#### 1. Database Performance

```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check table indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### 2. Application Performance

```bash
# Monitor application performance
pm2 monit

# Check memory usage
pm2 show hvv-mobility-api

# Profile Node.js application
node --inspect dist/index.js
```

---

## 📞 Support and Documentation

- **Documentation**: https://docs.hvv-mobility.com
- **API Reference**: https://api.hvv-mobility.com/docs
- **Status Page**: https://status.hvv-mobility.com
- **Support Email**: support@hvv-mobility.com

---

**Last Updated**: January 15, 2024  
**Version**: 1.0.0