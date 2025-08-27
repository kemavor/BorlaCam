# BorlaCam Production Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libglib2.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements_production.txt .
RUN pip install --no-cache-dir -r requirements_production.txt

# Copy essential application files
COPY production_api.py .
COPY healthcheck.py .

# Create necessary directories
RUN mkdir -p models logs static

# Copy everything and clean up what we don't need
COPY . .
RUN find . -name "*.pyc" -delete && \
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Download YOLOv8 base model (will be used if no custom model is provided)
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" || echo "Base model download failed"

# Set environment variables
ENV FLASK_ENV=production
ENV PYTHONPATH=/app
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python healthcheck.py

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "production_api.py"]