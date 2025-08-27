# BorlaCam Production Deployment Guide

## 🚀 Quick Deployment

### Prerequisites
- Docker & Docker Compose installed
- At least 2GB RAM available
- Port 8000 available (or configure different port)

### One-Click Deployment
```bash
# Clean up development files
python cleanup_for_deployment.py

# Deploy to production
chmod +x deploy.sh
./deploy.sh production true true
```

That's it! Your BorlaCam will be running at `http://localhost:8000`

---

## 📁 Production File Structure

After cleanup, your deployment will contain only essential files:

```
BorlaCam/
├── production_api.py          # Main production API
├── requirements_production.txt # Production dependencies
├── Dockerfile                 # Container configuration
├── docker-compose.yml         # Orchestration
├── .env.production           # Production environment
├── deploy.sh                 # Deployment script
├── monitoring.py             # Health monitoring
├── cleanup_for_deployment.py # Cleanup script
├── models/                   # AI models
│   └── best.pt              # Best trained model
├── logs/                     # Application logs
└── front/                    # React frontend
    └── dist/                 # Built frontend assets
```

---

## 🔧 Configuration Options

### Environment Variables (.env.production)
```bash
# API Configuration
PORT=8000
ALLOWED_ORIGINS=https://yourdomain.com

# Model Settings
CONFIDENCE_THRESHOLD=0.25
MAX_DETECTIONS=5

# Performance
GPU_ENABLED=true
HALF_PRECISION=true
```

### Docker Compose Profiles
```bash
# Basic deployment
docker-compose up -d

# Production with Nginx
docker-compose --profile production up -d
```

---

## 📊 API Endpoints

### Core Endpoints
- `GET /health` - Health check for load balancers
- `GET /api/status` - Detailed API status
- `POST /api/predict` - Main prediction endpoint

### Request Format
```javascript
POST /api/predict
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
  "confidence": 0.25
}
```

### Response Format
```javascript
{
  "success": true,
  "predictions": [
    {
      "class": "recyclable",
      "confidence": 0.87,
      "bbox": {"x1": 100, "y1": 150, "x2": 200, "y2": 250}
    }
  ],
  "inference_time_ms": 45.2,
  "total_detections": 1
}
```

---

## 🏥 Monitoring & Health Checks

### Built-in Health Monitoring
```bash
# Check API health
curl http://localhost:8000/health

# Run monitoring once
python monitoring.py --once

# Continuous monitoring (every 5 minutes)
python monitoring.py --interval 300
```

### Key Metrics Monitored
- API response time and availability
- CPU, memory, and disk usage
- Model inference performance
- Error rates and alerts

---

## 🔄 Scaling & Load Balancing

### Horizontal Scaling
```bash
# Scale to 3 API instances
docker-compose up -d --scale borlacam-api=3
```

### Load Balancer Configuration (Nginx)
```nginx
upstream borlacam_backend {
    server borlacam-api-1:8000;
    server borlacam-api-2:8000;
    server borlacam-api-3:8000;
}
```

---

## 🛠️ Maintenance Commands

### View Logs
```bash
# API logs
docker-compose logs -f borlacam-api

# System logs
tail -f logs/borlacam_api.log
tail -f logs/monitoring.log
```

### Update Deployment
```bash
# Pull latest changes and redeploy
git pull
./deploy.sh production true true
```

### Backup Model
```bash
# Backup current model
cp models/best.pt models/best_backup_$(date +%Y%m%d).pt

# Deploy new model
cp new_model.pt models/best.pt
docker-compose restart borlacam-api
```

---

## 🚨 Troubleshooting

### Common Issues

#### API Not Starting
```bash
# Check logs
docker-compose logs borlacam-api

# Check model file
ls -la models/best.pt

# Verify port availability
netstat -tulpn | grep 8000
```

#### High Memory Usage
```bash
# Check memory usage
docker stats borlacam-api

# Restart services
docker-compose restart
```

#### Slow Inference
- Ensure GPU is available and enabled
- Check model file isn't corrupted
- Monitor CPU/memory usage
- Consider using smaller model for speed

### Performance Optimization

#### GPU Acceleration
```bash
# Install NVIDIA Docker runtime
# Uncomment GPU sections in docker-compose.yml
# Set GPU_ENABLED=true in .env.production
```

#### Memory Optimization
- Use `HALF_PRECISION=true` for GPU inference
- Reduce `MAX_DETECTIONS` if not needed
- Set appropriate Docker memory limits

---

## 📈 Production Best Practices

### Security
- Use HTTPS in production
- Set proper CORS origins
- Implement API rate limiting
- Regular security updates

### Performance
- Use GPU acceleration when available
- Monitor response times and scale accordingly
- Implement caching for static assets
- Use CDN for frontend assets

### Reliability
- Set up automated health checks
- Implement proper logging and monitoring
- Use container orchestration (Kubernetes for large scale)
- Regular backups of models and configurations

---

## 🎯 Quick Commands Reference

```bash
# Deploy
./deploy.sh production true true

# Health check
curl http://localhost:8000/health

# View logs
docker-compose logs -f borlacam-api

# Scale up
docker-compose up -d --scale borlacam-api=3

# Stop
docker-compose down

# Update
git pull && ./deploy.sh production true true

# Monitor
python monitoring.py --once

# Cleanup
python cleanup_for_deployment.py
```

---

## 📞 Support

For issues or questions:
1. Check the logs: `docker-compose logs borlacam-api`
2. Verify health: `curl http://localhost:8000/health`
3. Review monitoring: `python monitoring.py --once`

Your BorlaCam is now production-ready! 🎉