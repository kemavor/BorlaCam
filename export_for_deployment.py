#!/usr/bin/env python3
"""
BorlaCam Model Export Script
===========================

Export trained models to optimized formats for deployment on MX450 GPU.
Supports ONNX, TensorRT, and various optimization strategies.
"""

import os
import torch
import time
import json
import logging
from pathlib import Path
from ultralytics import YOLO
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BorlaCamExporter:
    def __init__(self, model_path):
        self.model_path = Path(model_path)
        self.model = None
        self.load_model()
        
        # Export configurations
        self.export_formats = {
            'onnx': {'format': 'onnx', 'suffix': '.onnx'},
            'tensorrt': {'format': 'engine', 'suffix': '.engine'},
            'openvino': {'format': 'openvino', 'suffix': '_openvino_model'},
            'coreml': {'format': 'coreml', 'suffix': '.mlmodel'},
            'tflite': {'format': 'tflite', 'suffix': '.tflite'}
        }
        
    def load_model(self):
        """Load the trained model."""
        try:
            self.model = YOLO(str(self.model_path))
            logger.info(f"Model loaded: {self.model_path}")
            logger.info(f"Model classes: {self.model.names}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def export_onnx(self, output_dir, imgsz=640, optimize=True):
        """
        Export model to ONNX format.
        """
        logger.info("Exporting to ONNX format...")
        
        try:
            output_path = self.model.export(
                format='onnx',
                imgsz=imgsz,
                optimize=optimize,
                dynamic=False,  # Fixed input size for TensorRT optimization
                simplify=True,  # Simplify model for better performance
                opset=11,       # ONNX opset version (compatible with TensorRT)
                workspace=4,    # Workspace size in GB for TensorRT
                verbose=True
            )
            
            logger.info(f"ONNX export successful: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"ONNX export failed: {e}")
            return None
    
    def export_tensorrt(self, output_dir, imgsz=640, fp16=True, int8=False, workspace=4):
        """
        Export model to TensorRT format optimized for MX450.
        """
        logger.info("Exporting to TensorRT format...")
        logger.info(f"Configuration: FP16={fp16}, INT8={int8}, Workspace={workspace}GB")
        
        try:
            # Check CUDA availability
            if not torch.cuda.is_available():
                logger.error("CUDA not available. TensorRT export requires GPU.")
                return None
            
            output_path = self.model.export(
                format='engine',    # TensorRT engine
                imgsz=imgsz,       # Input image size
                half=fp16,         # FP16 precision
                int8=int8,         # INT8 quantization
                dynamic=False,     # Fixed input size for optimization
                workspace=workspace, # Workspace size in GB
                verbose=True,
                device=0           # Use first GPU
            )
            
            logger.info(f"TensorRT export successful: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"TensorRT export failed: {e}")
            logger.error("Make sure you have TensorRT installed and compatible with your PyTorch version")
            return None
    
    def export_optimized_versions(self, output_dir):
        """
        Export multiple optimized versions for different use cases.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        exported_models = {}
        
        logger.info("=" * 60)
        logger.info("EXPORTING OPTIMIZED MODELS FOR DEPLOYMENT")
        logger.info("=" * 60)
        
        # 1. ONNX (Standard optimization)
        logger.info("\n1. Exporting ONNX (Standard)")
        onnx_path = self.export_onnx(output_dir, imgsz=640, optimize=True)
        if onnx_path:
            exported_models['onnx_standard'] = {
                'path': str(onnx_path),
                'description': 'Standard ONNX export for cross-platform deployment',
                'use_case': 'Development, testing, and non-NVIDIA GPUs'
            }
        
        # 2. TensorRT FP16 (Balanced speed/accuracy)
        logger.info("\n2. Exporting TensorRT FP16 (Balanced)")
        trt_fp16_path = self.export_tensorrt(output_dir, imgsz=640, fp16=True, int8=False, workspace=4)
        if trt_fp16_path:
            exported_models['tensorrt_fp16'] = {
                'path': str(trt_fp16_path),
                'description': 'TensorRT FP16 for balanced speed and accuracy',
                'use_case': 'Production deployment on MX450 (recommended)'
            }
        
        # 3. TensorRT INT8 (Maximum speed)
        logger.info("\n3. Exporting TensorRT INT8 (Maximum Speed)")
        trt_int8_path = self.export_tensorrt(output_dir, imgsz=640, fp16=False, int8=True, workspace=4)
        if trt_int8_path:
            exported_models['tensorrt_int8'] = {
                'path': str(trt_int8_path),
                'description': 'TensorRT INT8 for maximum inference speed',
                'use_case': 'High-speed requirements, slight accuracy trade-off'
            }
        
        # 4. Smaller input size for ultra-fast inference
        logger.info("\n4. Exporting TensorRT FP16 (Fast - 320px)")
        trt_fast_path = self.export_tensorrt(output_dir, imgsz=320, fp16=True, int8=False, workspace=2)
        if trt_fast_path:
            exported_models['tensorrt_fast'] = {
                'path': str(trt_fast_path),
                'description': 'TensorRT FP16 with 320px input for ultra-fast inference',
                'use_case': 'Real-time applications where speed is critical'
            }
        
        return exported_models
    
    def benchmark_exported_models(self, exported_models, num_tests=100):
        """
        Benchmark all exported models for performance comparison.
        """
        logger.info("\n" + "=" * 60)
        logger.info("BENCHMARKING EXPORTED MODELS")
        logger.info("=" * 60)
        
        benchmark_results = {}
        
        for model_name, model_info in exported_models.items():
            model_path = model_info['path']
            
            if not Path(model_path).exists():
                logger.warning(f"Model not found: {model_path}")
                continue
            
            logger.info(f"\nBenchmarking: {model_name}")
            
            try:
                # Load exported model
                if model_path.endswith('.onnx'):
                    # ONNX model benchmarking would require ONNXRuntime
                    logger.info(f"ONNX benchmarking requires ONNXRuntime - skipping for now")
                    continue
                elif model_path.endswith('.engine') or model_path.endswith('.pt'):
                    # Load with YOLO
                    test_model = YOLO(model_path)
                else:
                    logger.warning(f"Unsupported model format: {model_path}")
                    continue
                
                # Benchmark inference speed
                results = self.benchmark_model_speed(test_model, num_tests)
                benchmark_results[model_name] = results
                
                logger.info(f"Results: {results['avg_fps']:.1f} FPS (avg)")
                
            except Exception as e:
                logger.error(f"Benchmarking failed for {model_name}: {e}")
                continue
        
        return benchmark_results
    
    def benchmark_model_speed(self, model, num_tests=100, imgsz=640):
        """
        Benchmark a single model's inference speed.
        """
        # Create dummy input
        if isinstance(imgsz, int):
            dummy_input = np.random.randint(0, 255, (imgsz, imgsz, 3), dtype=np.uint8)
        else:
            dummy_input = np.random.randint(0, 255, (*imgsz, 3), dtype=np.uint8)
        
        # Warmup runs
        for _ in range(10):
            _ = model(dummy_input, verbose=False)
        
        # Timed runs
        times = []
        for _ in range(num_tests):
            start_time = time.time()
            _ = model(dummy_input, verbose=False)
            end_time = time.time()
            times.append(end_time - start_time)
        
        # Calculate statistics
        avg_time = np.mean(times)
        std_time = np.std(times)
        min_time = np.min(times)
        max_time = np.max(times)
        avg_fps = 1.0 / avg_time
        
        return {
            'avg_time_ms': avg_time * 1000,
            'std_time_ms': std_time * 1000,
            'min_time_ms': min_time * 1000,
            'max_time_ms': max_time * 1000,
            'avg_fps': avg_fps,
            'target_fps_met': avg_fps >= 30.0
        }
    
    def generate_deployment_package(self, output_dir, exported_models, benchmark_results):
        """
        Generate a complete deployment package with all optimized models.
        """
        package_dir = Path(output_dir) / "deployment_package"
        package_dir.mkdir(parents=True, exist_ok=True)
        
        # Create deployment configuration
        deployment_config = {
            'model_info': {
                'original_model': str(self.model_path),
                'model_type': 'YOLOv8n',
                'classes': ['organic', 'recyclable'],
                'input_size': [640, 640],
                'export_date': time.strftime('%Y-%m-%d %H:%M:%S')
            },
            'available_models': exported_models,
            'performance_benchmarks': benchmark_results,
            'deployment_recommendations': {
                'mx450_gpu': {
                    'recommended_model': 'tensorrt_fp16',
                    'fallback_model': 'onnx_standard',
                    'expected_fps': '>30',
                    'memory_usage': '<3GB'
                },
                'cpu_fallback': {
                    'recommended_model': 'onnx_standard',
                    'expected_fps': '5-15',
                    'memory_usage': '<2GB'
                }
            },
            'integration_notes': {
                'flask_api_update': 'Update simple_flask_api.py to load optimized model',
                'confidence_thresholds': {
                    'organic': 0.4,
                    'recyclable': 0.3
                },
                'nms_settings': {
                    'iou_threshold': 0.45,
                    'conf_threshold': 0.25
                }
            }
        }
        
        # Save deployment configuration
        config_path = package_dir / "deployment_config.json"
        with open(config_path, 'w') as f:
            json.dump(deployment_config, f, indent=2)
        
        # Create Flask API integration script
        self.create_flask_integration_script(package_dir, deployment_config)
        
        # Create README
        self.create_deployment_readme(package_dir, deployment_config)
        
        logger.info(f"\nDeployment package created: {package_dir}")
        logger.info(f"Configuration: {config_path}")
        
        return package_dir
    
    def create_flask_integration_script(self, package_dir, config):
        """
        Create updated Flask API script with optimized model loading.
        """
        flask_script = '''#!/usr/bin/env python3
"""
BorlaCam Optimized Flask API
===========================

Updated Flask API with optimized model loading for production deployment.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os
import json
import logging

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Model configuration
MODEL_CONFIG = {
    'primary_model': 'tensorrt_fp16',  # Primary model for MX450
    'fallback_model': 'onnx_standard', # Fallback for compatibility
    'confidence_thresholds': {
        'organic': 0.4,
        'recyclable': 0.3
    },
    'nms_settings': {
        'iou_threshold': 0.45,
        'conf_threshold': 0.25
    }
}

# Global model variables
model = None
model_info = {}

def load_optimized_model():
    """Load the best available optimized model."""
    global model, model_info
    
    # Try to load models in order of preference
    model_paths = [
        'deployment_package/tensorrt_fp16.engine',
        'deployment_package/tensorrt_int8.engine', 
        'deployment_package/onnx_standard.onnx',
        'best.pt'  # Original fallback
    ]
    
    for model_path in model_paths:
        if os.path.exists(model_path):
            try:
                logger.info(f"Loading optimized model: {model_path}")
                model = YOLO(model_path)
                
                # Test model
                test_input = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
                _ = model(test_input, verbose=False)
                
                model_info = {
                    'path': model_path,
                    'type': 'optimized',
                    'classes': ['organic', 'recyclable'],
                    'device': str(model.device),
                }
                
                logger.info(f"Successfully loaded optimized model: {model_path}")
                return True
                
            except Exception as e:
                logger.warning(f"Failed to load {model_path}: {e}")
                continue
    
    logger.error("No optimized model could be loaded!")
    return False

# Load model on startup
if not load_optimized_model():
    logger.error("Failed to load any model - API will not function properly")

@app.route('/api/predict', methods=['POST'])
def predict():
    """Enhanced prediction with optimized model."""
    try:
        if not model:
            return jsonify({'error': 'No model loaded'}), 500
            
        data = request.json
        if not data or not data.get('image'):
            return jsonify({'error': 'No image data provided'}), 400
        
        # Decode image
        image_data = data.get('image', '')
        confidence = data.get('confidence', 0.3)
        
        try:
            if ',' in image_data:
                image_bytes = base64.b64decode(image_data.split(',')[1])
            else:
                image_bytes = base64.b64decode(image_data)
        except Exception as e:
            return jsonify({'error': f'Failed to decode image: {str(e)}'}), 400
            
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'error': 'Failed to decode image'}), 400
        
        # Run optimized inference
        results = model(
            img,
            conf=MODEL_CONFIG['nms_settings']['conf_threshold'],
            iou=MODEL_CONFIG['nms_settings']['iou_threshold'],
            verbose=False,
            device=model.device
        )
        
        # Process results with class-specific thresholds
        predictions = []
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    class_id = int(box.cls)
                    conf_score = float(box.conf.item())
                    class_name = model.names[class_id]
                    
                    # Apply class-specific confidence thresholds
                    min_conf = MODEL_CONFIG['confidence_thresholds'].get(class_name, confidence)
                    
                    if conf_score >= min_conf:
                        xyxy = box.xyxy[0].tolist()
                        predictions.append({
                            'index': class_id,
                            'score': conf_score,
                            'label': class_name,
                            'bbox': {
                                'x1': xyxy[0], 'y1': xyxy[1],
                                'x2': xyxy[2], 'y2': xyxy[3]
                            }
                        })
        
        # Sort by confidence
        predictions.sort(key=lambda x: x['score'], reverse=True)
        
        return jsonify({
            'success': True,
            'predictions': predictions[:5],
            'model_info': model_info
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/status')
def get_status():
    """Get API status with model information."""
    return jsonify({
        'status': 'running',
        'model_loaded': model is not None,
        'model_info': model_info,
        'optimization': 'enabled'
    })

if __name__ == '__main__':
    logger.info("BorlaCam Optimized API Starting...")
    logger.info(f"Model loaded: {model_info.get('path', 'None')}")
    app.run(host='localhost', port=8000, debug=False)
'''
        
        flask_path = package_dir / "optimized_flask_api.py"
        with open(flask_path, 'w') as f:
            f.write(flask_script)
        
        logger.info(f"Flask integration script created: {flask_path}")
    
    def create_deployment_readme(self, package_dir, config):
        """
        Create deployment README with instructions.
        """
        readme_content = f'''# BorlaCam Deployment Package

## Overview
This package contains optimized models and deployment scripts for the BorlaCam waste detection system.

## Available Models
{json.dumps(config['available_models'], indent=2)}

## Deployment Instructions

### 1. Prerequisites
```bash
pip install ultralytics torch torchvision opencv-python flask flask-cors
```

### 2. For NVIDIA MX450 GPU (Recommended)
```bash
# Use the TensorRT FP16 model for best performance
python optimized_flask_api.py
```

### 3. For CPU Fallback
```bash
# Use the ONNX model for CPU inference
python optimized_flask_api.py
```

### 4. Integration with Frontend
Update your React frontend to use the new optimized API endpoints.

## Performance Expectations

### MX450 GPU
- **Recommended Model**: TensorRT FP16
- **Expected FPS**: >30 FPS
- **Memory Usage**: <3GB VRAM
- **Accuracy**: Optimized for recyclable detection

### CPU Fallback
- **Model**: ONNX Standard
- **Expected FPS**: 5-15 FPS
- **Memory Usage**: <2GB RAM

## Configuration

### Confidence Thresholds
- **Organic**: {config['integration_notes']['confidence_thresholds']['organic']}
- **Recyclable**: {config['integration_notes']['confidence_thresholds']['recyclable']}

### NMS Settings
- **IoU Threshold**: {config['integration_notes']['nms_settings']['iou_threshold']}
- **Confidence Threshold**: {config['integration_notes']['nms_settings']['conf_threshold']}

## Troubleshooting

### TensorRT Issues
If TensorRT models fail to load:
1. Check CUDA installation
2. Verify TensorRT compatibility
3. Fall back to ONNX model

### Performance Issues
If FPS is below 30:
1. Use INT8 model for maximum speed
2. Reduce input resolution to 320px
3. Check GPU memory usage

## Model Update Process
1. Train new model with improved dataset
2. Export using export_for_deployment.py
3. Replace models in deployment_package/
4. Update configuration as needed

## Support
For issues with deployment, check:
1. Model loading logs
2. GPU compatibility
3. Input image format
4. Confidence threshold settings
'''
        
        readme_path = package_dir / "README.md"
        with open(readme_path, 'w') as f:
            f.write(readme_content)
        
        logger.info(f"Deployment README created: {readme_path}")

def main():
    """
    Main export function.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Export BorlaCam model for deployment')
    parser.add_argument('--model', required=True, help='Path to trained model (.pt file)')
    parser.add_argument('--output', default='exported_models', help='Output directory')
    parser.add_argument('--benchmark', action='store_true', help='Run performance benchmarks')
    
    args = parser.parse_args()
    
    # Initialize exporter
    exporter = BorlaCamExporter(args.model)
    
    # Export optimized models
    logger.info("Starting model export for deployment...")
    exported_models = exporter.export_optimized_versions(args.output)
    
    # Benchmark if requested
    benchmark_results = {}
    if args.benchmark and exported_models:
        benchmark_results = exporter.benchmark_exported_models(exported_models)
    
    # Generate deployment package
    if exported_models:
        package_dir = exporter.generate_deployment_package(
            args.output, exported_models, benchmark_results
        )
        
        logger.info("=" * 60)
        logger.info("EXPORT COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)
        logger.info(f"Deployment package: {package_dir}")
        logger.info("Check README.md for deployment instructions")
    else:
        logger.error("No models were successfully exported")

if __name__ == "__main__":
    main()