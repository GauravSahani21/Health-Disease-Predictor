# Deployment Guide

## Prerequisites

- Docker & Docker Compose (for local development)
- Kubernetes cluster (for production)
- kubectl configured
- Domain name with DNS configured

## Local Development

### 1. Start All Services

```bash
# Clone repository
cd /Users/gauravsahani/Desktop/1ST_mini_project

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start services
docker-compose -f docker-compose.dev.yml up --build
```

### 2. Access Services

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Text ML Service: http://localhost:8001/docs
- Image ML Service: http://localhost:8002/docs
- MinIO Console: http://localhost:9001 (admin/minioadmin)

### 3. Test the Application

```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123456"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

## Production Deployment

### Option 1: Docker Compose (Simple)

1. **Update environment variables**
```bash
# Edit production env files
nano backend/.env.production
nano frontend/.env.production
```

2. **Build and push images**
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Push to registry
docker-compose -f docker-compose.prod.yml push
```

3. **Deploy**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Kubernetes (Recommended for Production)

#### 1. Prepare Secrets

```bash
# Create namespace
kubectl create namespace health-predictor

# Update secrets file
cp infra/k8s/secrets.yaml.template infra/k8s/secrets.yaml
# Edit secrets.yaml with real values

# Apply secrets
kubectl apply -f infra/k8s/secrets.yaml
```

#### 2. Build and Push Docker Images

```bash
# Set your registry
export REGISTRY=ghcr.io/YOUR_USERNAME

# Build all images
docker build -t $REGISTRY/health-predictor/backend:latest ./backend
docker build -t $REGISTRY/health-predictor/frontend:latest ./frontend
docker build -t $REGISTRY/health-predictor/ml-text:latest ./ml_text
docker build -t $REGISTRY/health-predictor/ml-image:latest ./ml_image

# Push to registry
docker push $REGISTRY/health-predictor/backend:latest
docker push $REGISTRY/health-predictor/frontend:latest
docker push $REGISTRY/health-predictor/ml-text:latest
docker push $REGISTRY/health-predictor/ml-image:latest
```

#### 3. Deploy to Kubernetes

```bash
# Update image names in deployment.yaml
sed -i 's/YOUR_USERNAME/your-github-username/g' infra/k8s/deployment.yaml

# Apply manifests
kubectl apply -f infra/k8s/deployment.yaml

# Check status
kubectl get pods -n health-predictor
kubectl get services -n health-predictor
```

#### 4. Configure Ingress (HTTPS)

```bash
# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Update domain name in deployment.yaml
sed -i 's/health-predictor.example.com/your-domain.com/g' infra/k8s/deployment.yaml

# Reapply ingress
kubectl apply -f infra/k8s/deployment.yaml
```

#### 5. Monitor Deployment

```bash
# Check pods
kubectl get pods -n health-predictor -w

# View logs
kubectl logs -f deployment/backend -n health-predictor
kubectl logs -f deployment/ml-text -n health-predictor

# Get external IP
kubectl get service frontend -n health-predictor
```

### Option 3: Cloud Platforms

#### AWS ECS/EKS

1. Push images to Amazon ECR
2. Create ECS task definitions or EKS cluster
3. Configure Application Load Balancer
4. Set up RDS for MongoDB (or use MongoDB Atlas)
5. Configure S3 for file storage

#### Google Cloud Run / GKE

1. Push images to Google Container Registry
2. Deploy to Cloud Run or GKE
3. Configure Cloud Load Balancer
4. Use Cloud SQL or MongoDB Atlas
5. Configure Cloud Storage

#### Azure Container Instances / AKS

1. Push images to Azure Container Registry
2. Deploy to ACI or AKS
3. Configure Application Gateway
4. Use Azure Cosmos DB or MongoDB Atlas
5. Configure Azure Blob Storage

## Database Migration

For production, consider using MongoDB Atlas instead of self-hosted:

```javascript
// Update backend/.env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/health_predictor?retryWrites=true&w=majority
```

## S3 Configuration

For production, use AWS S3, Google Cloud Storage, or Azure Blob:

```javascript
// backend/.env
S3_ENDPOINT=  # Leave empty for AWS S3
S3_ACCESS_KEY=YOUR_AWS_ACCESS_KEY
S3_SECRET_KEY=YOUR_AWS_SECRET_KEY
S3_BUCKET=health-predictor-prod
S3_REGION=us-east-1
```

## Monitoring Setup

### 1. Prometheus & Grafana

```bash
# Install kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Default: admin/prom-operator
```

### 2. Application Logs (ELK Stack)

```bash
# Install Elasticsearch, Logstash, Kibana
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch -n logging --create-namespace
helm install kibana elastic/kibana -n logging
```

## Scaling

### Manual Scaling

```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n health-predictor

# Scale ML services
kubectl scale deployment ml-text --replicas=3 -n health-predictor
kubectl scale deployment ml-image --replicas=3 -n health-predictor
```

### Auto-scaling

HPA is already configured in deployment.yaml for backend.

Add GPU nodes for ML services:
```yaml
# In deployment.yaml ML services
resources:
  limits:
    nvidia.com/gpu: 1
```

## Backup & Disaster Recovery

### MongoDB Backup

```bash
# Create backup
kubectl exec deployment/mongodb -n health-predictor -- mongodump --out=/tmp/backup

# Copy to local
kubectl cp health-predictor/mongodb-pod:/tmp/backup ./mongodb-backup

# Upload to S3
aws s3 sync ./mongodb-backup s3://your-backup-bucket/mongodb/$(date +%Y%m%d)/
```

### Automated Backups

Set up CronJob for daily backups:
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: health-predictor
spec:
  schedule: "0 2 * * *"  # Every night at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mongo:6.0
            command: ["/bin/sh"]
            args: ["-c", "mongodump --host mongodb --out /backup && aws s3 sync /backup s3://backups/"]
```

## Rollback

```bash
# Check deployment history
kubectl rollout history deployment/backend -n health-predictor

# Rollback to previous version
kubectl rollout undo deployment/backend -n health-predictor

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n health-predictor
```

## Troubleshooting

### Pods not starting

```bash
# Describe pod
kubectl describe pod POD_NAME -n health-predictor

# Check events
kubectl get events -n health-predictor --sort-by=.metadata.creationTimestamp
```

### Database connection issues

```bash
# Test MongoDB connection
kubectl run -it --rm debug --image=mongo:6.0 --restart=Never -- mongosh mongodb://mongodb:27017/health_predictor
```

### ML service timeout

- Increase timeout in backend predict routes
- Add more replicas
- Use GPU nodes
- Optimize model (quantization, ONNX)

## Security Checklist

- [ ] SSL/TLS certificates configured
- [ ] Secrets in Kubernetes/Vault, not in code
- [ ] Network policies configured
- [ ] RBAC configured
- [ ] Pod security policies
- [ ] Regular security scans (Snyk, Trivy)
- [ ] WAF configured (Cloudflare, AWS WAF)
- [ ] Rate limiting enabled
- [ ] Audit logging enabled

## Cost Optimization

- Use spot/preemptible instances for ML services
- Implement caching (Redis) to reduce ML calls
- Use CDN for frontend assets
- Auto-scale down during low traffic
- Use reserved instances for steady-state workload

## Support

For issues or questions:
- Check logs: `kubectl logs -f deployment/SERVICE -n health-predictor`
- Review documentation in `/docs` folder
- Open GitHub issue
