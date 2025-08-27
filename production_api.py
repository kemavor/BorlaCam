#!/usr/bin/env python3
"""
BorlaCam Production API
=====================
Production-ready Flask API for waste detection with YOLOv8.
Optimized for scalability, performance, and deployment.
"""

import os
import logging
import base64
import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
import torch
from pathlib import Path
import time
import gc

# Configure logging for production
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('borlacam_api.log')
    ]
)
logger = logging.getLogger(__name__)

# Production Flask app configuration
app = Flask(__name__)
CORS(app, origins=os.getenv('ALLOWED_ORIGINS', '*').split(','))
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Global model variable
model = None
model_info = {}

class BorlaCamAPI:
    def __init__(self):
        self.model = None
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model_loaded = False
        self.load_model()
    
    def load_model(self):
        """Load the best available trained model"""
        model_paths = [
            'training_runs/borlacam_optimized/weights/best.pt',
            'waste_training/mx450_waste_model/weights/best.pt',
            'precision_training/precision_focused/weights/best.pt',
        ]
        
        for model_path in model_paths:
            if Path(model_path).exists():
                try:
                    logger.info(f"Loading model from {model_path}")
                    self.model = YOLO(model_path)
                    
                    # Configure for production
                    if torch.cuda.is_available():
                        self.model.to('cuda')
                        logger.info(f"Model loaded on GPU: {torch.cuda.get_device_name(0)}")
                    else:
                        logger.info("Model loaded on CPU")
                    
                    # Warmup inference
                    dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)
                    _ = self.model(dummy_img, verbose=False)
                    
                    self.model_info = {
                        'path': model_path,
                        'classes': list(self.model.names.values()),
                        'device': str(self.model.device),
                        'gpu_available': torch.cuda.is_available()
                    }
                    
                    self.model_loaded = True
                    logger.info(f"Model ready: {self.model_info['classes']}")
                    return
                    
                except Exception as e:
                    logger.error(f"Failed to load {model_path}: {e}")
                    continue
        
        if not self.model_loaded:
            raise RuntimeError("No model could be loaded for production")
    
    def predict(self, image, confidence=0.25):
        """Run inference on image"""
        if not self.model_loaded:
            raise RuntimeError("Model not loaded")
        
        try:
            # Production-optimized inference settings
            results = self.model(
                image,
                conf=max(0.15, confidence * 0.8),  # Slightly lower for detection
                iou=0.25,
                imgsz=640,
                max_det=20,  # Reasonable limit for production
                verbose=False,
                device=self.device,
                half=torch.cuda.is_available()  # Use half precision on GPU
            )
            
            predictions = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        conf_score = float(box.conf.item())
                        if conf_score >= confidence:
                            class_id = int(box.cls)
                            class_name = self.model.names[class_id]
                            xyxy = box.xyxy[0].tolist()
                            
                            predictions.append({
                                'class': class_name,
                                'confidence': conf_score,
                                'bbox': {
                                    'x1': xyxy[0], 'y1': xyxy[1],
                                    'x2': xyxy[2], 'y2': xyxy[3]
                                }
                            })
            
            # Sort by confidence and limit results
            predictions.sort(key=lambda x: x['confidence'], reverse=True)
            return predictions[:5]  # Top 5 predictions only
            
        except Exception as e:
            logger.error(f"Inference error: {e}")
            raise

# Initialize API
try:
    api = BorlaCamAPI()
    logger.info("BorlaCam Production API initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize API: {e}")
    api = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for load balancers"""
    status = {
        'status': 'healthy' if api and api.model_loaded else 'unhealthy',
        'model_loaded': api.model_loaded if api else False,
        'gpu_available': torch.cuda.is_available(),
        'timestamp': time.time()
    }
    
    return jsonify(status), 200 if status['status'] == 'healthy' else 503

@app.route('/api/status', methods=['GET'])
def api_status():
    """Detailed API status"""
    if not api or not api.model_loaded:
        return jsonify({'error': 'API not ready'}), 503
    
    return jsonify({
        'success': True,
        'model_loaded': True,
        'model_classes': api.model_info['classes'],
        'device': api.model_info['device'],
        'gpu_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        'version': '1.0.0'
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    """Main prediction endpoint"""
    if not api or not api.model_loaded:
        return jsonify({'error': 'Model not loaded'}), 503
    
    try:
        # Validate request
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        confidence = float(data.get('confidence', 0.25))
        confidence = max(0.1, min(0.9, confidence))  # Clamp to reasonable range
        
        # Decode image
        image_data = data['image']
        try:
            if ',' in image_data:
                image_bytes = base64.b64decode(image_data.split(',')[1])
            else:
                image_bytes = base64.b64decode(image_data)
        except Exception:
            return jsonify({'error': 'Invalid image data'}), 400
        
        # Convert to OpenCV format
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'error': 'Could not decode image'}), 400
        
        # Run inference
        start_time = time.time()
        predictions = api.predict(img, confidence)
        inference_time = (time.time() - start_time) * 1000
        
        # Log for monitoring
        logger.info(f"Inference completed: {len(predictions)} detections in {inference_time:.1f}ms")
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'inference_time_ms': round(inference_time, 1),
            'total_detections': len(predictions)
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': 'Prediction failed'}), 500
    
    finally:
        # Memory cleanup for production
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()

@app.errorhandler(413)
def file_too_large(e):
    return jsonify({'error': 'File too large (max 16MB)'}), 413

@app.errorhandler(429)
def rate_limit_exceeded(e):
    return jsonify({'error': 'Rate limit exceeded'}), 429

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {e}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Production configuration
    port = int(os.getenv('PORT', 8000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    if debug:
        logger.warning("Running in development mode")
        app.run(host='0.0.0.0', port=port, debug=True)
    else:
        logger.info(f"Starting production server on port {port}")
        # Use gunicorn in production
        from waitress import serve
        serve(app, host='0.0.0.0', port=port, threads=4)