#!/bin/bash
# BorlaCam Deployment Script

set -e

echo "🚀 Starting BorlaCam deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_TYPE=${1:-"production"}  # production or development
BUILD_FRONTEND=${2:-"true"}
RESTART_SERVICES=${3:-"true"}

echo -e "${BLUE}Deployment Configuration:${NC}"
echo -e "  Type: ${DEPLOYMENT_TYPE}"
echo -e "  Build Frontend: ${BUILD_FRONTEND}"
echo -e "  Restart Services: ${RESTART_SERVICES}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-deployment checks
echo -e "${BLUE}🔍 Running pre-deployment checks...${NC}"

# Check Docker
if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check Docker Compose
if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Check model files
if [ ! -f "training_runs/borlacam_optimized/weights/best.pt" ] && 
   [ ! -f "waste_training/mx450_waste_model/weights/best.pt" ] && 
   [ ! -f "precision_training/precision_focused/weights/best.pt" ]; then
    echo -e "${RED}❌ No trained model found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# Clean up previous builds
echo -e "${BLUE}🧹 Cleaning up previous builds...${NC}"
rm -rf front/dist 2>/dev/null || true
docker-compose down 2>/dev/null || true
docker system prune -f --volumes 2>/dev/null || true

# Build frontend if requested
if [ "$BUILD_FRONTEND" = "true" ]; then
    echo -e "${BLUE}📦 Building React frontend...${NC}"
    cd front
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    # Build for production
    npm run build
    
    if [ ! -d "dist" ]; then
        echo -e "${RED}❌ Frontend build failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
    cd ..
fi

# Setup environment
echo -e "${BLUE}⚙️  Setting up environment...${NC}"
if [ "$DEPLOYMENT_TYPE" = "production" ]; then
    cp .env.production .env
    echo "Using production environment"
else
    cp .env.development .env 2>/dev/null || echo "FLASK_ENV=development" > .env
    echo "Using development environment"
fi

# Create necessary directories
mkdir -p logs models

# Copy best available model to models directory
echo -e "${BLUE}📋 Copying model files...${NC}"
if [ -f "training_runs/borlacam_optimized/weights/best.pt" ]; then
    cp "training_runs/borlacam_optimized/weights/best.pt" "models/"
    echo "Using optimized model"
elif [ -f "waste_training/mx450_waste_model/weights/best.pt" ]; then
    cp "waste_training/mx450_waste_model/weights/best.pt" "models/"
    echo "Using MX450 model"
elif [ -f "precision_training/precision_focused/weights/best.pt" ]; then
    cp "precision_training/precision_focused/weights/best.pt" "models/"
    echo "Using precision-focused model"
fi

# Build and deploy
echo -e "${BLUE}🐳 Building Docker containers...${NC}"
docker-compose build --no-cache

if [ "$RESTART_SERVICES" = "true" ]; then
    echo -e "${BLUE}🔄 Starting services...${NC}"
    if [ "$DEPLOYMENT_TYPE" = "production" ]; then
        docker-compose --profile production up -d
    else
        docker-compose up -d
    fi
fi

# Health check
echo -e "${BLUE}🏥 Performing health check...${NC}"
sleep 10

for i in {1..12}; do
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API is healthy${NC}"
        break
    else
        if [ $i -eq 12 ]; then
            echo -e "${RED}❌ Health check failed${NC}"
            docker-compose logs borlacam-api
            exit 1
        fi
        echo -e "${YELLOW}⏳ Waiting for API to start... (${i}/12)${NC}"
        sleep 5
    fi
done

# Final status
echo ""
echo -e "${GREEN}🎉 BorlaCam deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
echo "  API: http://localhost:8000"
echo "  Health Check: http://localhost:8000/health"
echo "  Status: http://localhost:8000/api/status"

if [ "$BUILD_FRONTEND" = "true" ]; then
    echo "  Frontend: Built in front/dist/"
fi

echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "  View logs: docker-compose logs -f borlacam-api"
echo "  Stop services: docker-compose down"
echo "  Restart: docker-compose restart"
echo "  Update: ./deploy.sh production true true"

echo ""
echo -e "${GREEN}🚀 BorlaCam is ready for use!${NC}"