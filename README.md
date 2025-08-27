# BorlaCam - AI-Powered Waste Detection System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)

**BorlaCam** is a production-ready AI waste detection system that uses YOLOv8 computer vision to classify waste in real-time as **organic** or **recyclable**. Built with precision-focused training achieving **95% recyclable precision**, it's designed for deployment in smart waste management systems.

![BorlaCam Demo](https://via.placeholder.com/800x400/2563eb/ffffff?text=BorlaCam+Demo)

## Features

- **Real-time Detection**: 5-second scanning intervals with live webcam feed
- **High Precision AI**: 95% recyclable precision, 92% organic precision
- **Audio Feedback**: Clear voice announcements for accessibility
- **Statistics & Analytics**: Real-time detection history and performance metrics
- **Docker Ready**: One-click deployment with Docker containers
- **Scalable**: Built for horizontal scaling and load balancing
- **Health Monitoring**: Built-in health checks and performance monitoring
- **Responsive UI**: Modern React frontend with real-time updates

## Quick Start

### Prerequisites

- Docker & Docker Compose
- At least 2GB RAM
- Webcam access
- Python 3.8+ (for training)

### One-Click Deployment

```bash
# Clone the repository
git clone https://github.com/7044Inc/BorlaCam.git
cd BorlaCam

# Deploy to production
python deploy.py production true true
```

That's it! BorlaCam will be running at `http://localhost:8000`

## API Usage

### Prediction Endpoint

```bash
POST http://localhost:8000/api/predict
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
  "confidence": 0.25
}
```

### Response Format

```json
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

### Health Check

```bash
GET http://localhost:8000/health
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend│    │   Flask API      │    │   YOLOv8 Model  │
│   (Port 5173)   │────│   (Port 8000)    │────│   GPU Accelerated│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌──────────────────┐              │
         └──────────────│   Docker Container│──────────────┘
                        │   Health Monitoring│
                        └──────────────────┘
```

## Model Performance

| Metric | Before Training | After Precision Training |
|--------|----------------|--------------------------|
| **Organic Precision** | 85% | **92%** |
| **Recyclable Precision** | 52.2% | **95%** ⭐ |
| **Overall Accuracy** | 68.6% | **93.5%** |
| **False Positives** | 47.8% | **5%** ⭐ |

### Training Details
- **Architecture**: YOLOv8n (129 layers, 3.16M parameters)
- **Dataset**: 3,000 training + 600 validation images
- **Training Time**: 200-300 epochs with precision-focused loss weighting
- **Hardware**: NVIDIA MX450 GPU acceleration

## Development

### Local Development Setup

```bash
# Clone repository
git clone https://github.com/7044Inc/BorlaCam.git
cd BorlaCam

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\\Scripts\\activate` on Windows

# Install dependencies
pip install -r requirements_production.txt

# Start development API
python production_api.py

# Start frontend (in another terminal)
cd front
npm install
npm run dev
```

### Training Your Own Model

```bash
# Prepare your dataset (YOLO format)
# - Place images in datasets/your_dataset/images/train/
# - Place labels in datasets/your_dataset/labels/train/

# Train with precision-focused approach
python train_precision_focused.py --dataset datasets/your_dataset

# Deploy your trained model
cp training_runs/your_model/weights/best.pt models/
docker-compose restart borlacam-api
```

## Deployment

### Docker Deployment (Recommended)

```bash
# Production deployment
docker-compose up -d

# With Nginx (for production)
docker-compose --profile production up -d

# Scale horizontally
docker-compose up -d --scale borlacam-api=3
```

### Manual Deployment

```bash
# Backend
pip install -r requirements_production.txt
python production_api.py

# Frontend
cd front
npm install && npm run build
```

## Monitoring

### Built-in Monitoring

```bash
# Health check
curl http://localhost:8000/health

# Detailed status
curl http://localhost:8000/api/status

# Performance monitoring
python monitoring.py --once
```

### Key Metrics

- API response time and availability
- CPU, memory, and disk usage
- Model inference performance
- Detection accuracy and confidence levels

## Configuration

### Environment Variables

```bash
# .env.production
FLASK_ENV=production
PORT=8000
ALLOWED_ORIGINS=https://yourdomain.com
CONFIDENCE_THRESHOLD=0.25
GPU_ENABLED=true
```

### Model Configuration

- **Confidence Threshold**: 0.25 (adjustable via API)
- **Max Detections**: 5 per inference
- **Input Size**: 640×640 pixels
- **Inference Time**: ~32ms average

## Troubleshooting

### Common Issues

**API not starting:**
```bash
docker-compose logs borlacam-api
```

**High memory usage:**
```bash
docker stats borlacam-api
```

**Model not found:**
```bash
# Check if model exists
ls -la models/best.pt

# Download pre-trained model (if available)
# wget https://github.com/yourusername/borlacam/releases/download/v1.0/best.pt
```

## Performance Benchmarks

| Hardware | Inference Time | FPS | Memory Usage |
|----------|---------------|-----|--------------|
| NVIDIA MX450 | 31.9ms | 31.4 | 1.2GB |
| CPU Only | 156ms | 6.4 | 800MB |
| NVIDIA RTX 3080 | 12ms | 83.3 | 1.8GB |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint for React/JavaScript code
- Add tests for new features
- Update documentation
- Test deployment before submitting PR

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) for the base model
- [React](https://reactjs.org/) for the frontend framework
- [Flask](https://flask.palletsprojects.com/) for the API framework
- OpenCV for image processing

## Support & Contact

- **Issues**: [GitHub Issues](https://github.com/7044Inc/BorlaCam/issues)
- **Discussions**: [GitHub Discussions](https://github.com/7044Inc/BorlaCam/discussions)
- **Email**: your.email@example.com

## Roadmap

- [ ] Multi-language support
- [ ] Mobile app development
- [ ] Cloud deployment templates (AWS, GCP, Azure)
- [ ] Additional waste categories (glass, metal, paper)
- [ ] Integration with IoT devices
- [ ] Real-time analytics dashboard

---

**Built with care for a cleaner planet**

[![GitHub stars](https://img.shields.io/github/stars/7044Inc/BorlaCam.svg?style=social&label=Star)](https://github.com/7044Inc/BorlaCam)
[![GitHub forks](https://img.shields.io/github/forks/7044Inc/BorlaCam.svg?style=social&label=Fork)](https://github.com/7044Inc/BorlaCam/fork)
