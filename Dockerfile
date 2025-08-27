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

# Copy application code
COPY production_api.py .
COPY custom_waste_knowledge.json* ./

# Copy the best available model
COPY training_runs/borlacam_optimized/weights/best.pt* ./models/ 2>/dev/null || \
COPY waste_training/mx450_waste_model/weights/best.pt* ./models/ 2>/dev/null || \
COPY precision_training/precision_focused/weights/best.pt* ./models/ 2>/dev/null || true

# Create models directory if it doesn't exist
RUN mkdir -p models logs

# Set environment variables
ENV FLASK_ENV=production
ENV PYTHONPATH=/app
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "production_api.py"]