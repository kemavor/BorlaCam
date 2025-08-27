#!/usr/bin/env python3
"""
Simple Flask API for React Development
Minimal API to serve model predictions for React dev server.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os

app = Flask(__name__)
CORS(app)  # Allow React dev server to connect

# Load model with enhanced error handling and verification
print("Loading YOLOv8 model...")
model = None
model_info = {}

model_paths = [
    'training_runs/borlacam_optimized/weights/best.pt',  # NEW OPTIMIZED MODEL
    'waste_training/mx450_manual_enhanced/weights/best.pt',
    'waste_training/mx450_extended_90pct/weights/best.pt',
    'waste_training/mx450_waste_model/weights/best.pt', 
    'waste_detection_mx450.pt'
]

for path in model_paths:
    if os.path.exists(path):
        try:
            print(f"Attempting to load: {path}")
            temp_model = YOLO(path)
            
            # Force GPU usage if available
            import torch
            if torch.cuda.is_available():
                print(f"CUDA is available! GPU: {torch.cuda.get_device_name(0)}")
                print(f"CUDA version: {torch.version.cuda}")
                temp_model.to('cuda')
                device_name = torch.cuda.get_device_name(0)
                print(f"Model moved to GPU: {device_name}")
            else:
                print("CUDA not available, using CPU")
            
            # Verify model works with a test
            print(f"Model classes: {temp_model.names}")
            print(f"Model task: {temp_model.task}")
            print(f"Final device: {temp_model.device}")
            
            model = temp_model
            model_info = {
                'path': path,
                'classes': list(temp_model.names.values()),
                'task': temp_model.task,
                'device': str(temp_model.device),
                'gpu_available': torch.cuda.is_available(),
                'gpu_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
            }
            print(f"SUCCESS: Model loaded from {path}")
            print(f"Classes: {model_info['classes']}")
            print(f"Device: {model_info['device']}")
            if torch.cuda.is_available():
                print(f"GPU: {model_info['gpu_name']}")
            break
        except Exception as e:
            print(f"Failed to load {path}: {e}")
            import traceback
            traceback.print_exc()

if not model:
    print("ERROR: No model could be loaded!")
    print("Available model files:")
    for path in model_paths:
        exists = "✓" if os.path.exists(path) else "✗"
        print(f"  {exists} {path}")
else:
    print(f"Model ready for inference on device: {model.device}")

@app.route('/api/predict', methods=['POST'])
def predict():
    """Predict waste class from image."""
    try:
        if not model:
            return jsonify({'error': 'No model loaded'}), 500
            
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        image_data = data.get('image', '')
        confidence = data.get('confidence', 0.3)
        
        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400
        
        print(f"Received prediction request, confidence: {confidence}")
        
        # Decode base64 image
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
        
        print(f"Image decoded: {img.shape}")
        
        # Enhanced inference optimized for recyclable detection issues
        print(f"Running inference with confidence={confidence}")
        
        # 1. RESTORED: Reasonable confidence thresholds (0.15-0.25)
        # Based on debugging results, the model works well with moderate thresholds
        detection_conf = max(0.15, confidence - 0.1)  # Range: 0.15-0.25 for most cases
        
        results = model(
            img, 
            conf=detection_conf,  # Lower initial confidence
            iou=0.25,  # Even lower NMS threshold for recyclables
            imgsz=640,  
            max_det=100,  # More detections to catch recyclables
            verbose=False,
            device=model.device,
            agnostic_nms=False,  
            half=False
        )
        
        # Process results with enhanced logging
        predictions = []
        total_detections = 0
        raw_detections = 0
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                raw_detections = len(boxes)
                print(f"Raw detections before filtering: {raw_detections}")
                
                for i, box in enumerate(boxes):
                    class_id = int(box.cls)
                    conf_score = float(box.conf.item())
                    class_name = model.names[class_id]
                    
                    print(f"Detection {i+1}: {class_name} with confidence {conf_score:.3f}")
                    
                    # 1. RESTORED: Reasonable confidence filtering
                    if conf_score >= max(0.2, confidence - 0.05):  # Slightly lower than frontend threshold
                        # Get bounding box coordinates (x1, y1, x2, y2)
                        xyxy = box.xyxy[0].tolist()  # Convert tensor to list
                        
                        predictions.append({
                            'index': class_id,
                            'score': conf_score,
                            'label': class_name,
                            'bbox': {
                                'x1': xyxy[0],
                                'y1': xyxy[1], 
                                'x2': xyxy[2],
                                'y2': xyxy[3]
                            }
                        })
                        total_detections += 1
                    else:
                        print(f"  Filtered out (below threshold {confidence})")
        
        # Sort by confidence and apply quality filtering
        predictions.sort(key=lambda x: x['score'], reverse=True)
        
        # 2. RESTORED: More permissive but smart filtering
        if len(predictions) > 0:
            # Keep top 5 most confident detections
            predictions = predictions[:5]
            
            # Advanced false positive filtering
            filtered_predictions = []
            
            for pred in predictions:
                bbox = pred['bbox']
                width = bbox['x2'] - bbox['x1']
                height = bbox['y2'] - bbox['y1']
                area = width * height
                confidence = pred['score']
                
                # DEBUGGING: Temporarily disable size filtering to see all detections
                is_valid_detection = True
                
                # 1. Size filtering - DISABLED FOR DEBUGGING
                image_area = img.shape[0] * img.shape[1]
                relative_area = area / image_area
                
                # 2. RELAXED: Even more permissive size filtering (0.01-0.99 vs 0.1-0.9)
                if relative_area < 0.01:  # Too small (less than 1% of image)
                    print(f"  FILTERED: {pred['label']} too small (area: {relative_area:.4f})")
                    is_valid_detection = False
                elif relative_area > 0.99:  # Too large (more than 99% of image)
                    print(f"  FILTERED: {pred['label']} too large (area: {relative_area:.4f})")
                    is_valid_detection = False
                
                print(f"  SIZE CHECK: {pred['label']} area: {relative_area:.4f} (range: 0.1-0.9)")  
                
                # 2. Aspect ratio filtering - extreme ratios are likely false positives
                if height > 0:
                    aspect_ratio = width / height
                    if aspect_ratio > 10 or aspect_ratio < 0.1:  # Too wide or too tall
                        print(f"  FILTERED: {pred['label']} extreme aspect ratio ({aspect_ratio:.2f})")
                        is_valid_detection = False
                
                # 3. RELAXED: Very permissive confidence and edge filtering
                min_confidence_threshold = 0.15  # Further lowered from 0.25 to 0.15
                
                # Disabled edge detection filtering for debugging
                edge_margin = 0.02  # Very small margin (2% vs 5%)
                img_h, img_w = img.shape[:2]
                is_near_edge = (
                    bbox['x1'] < img_w * edge_margin or bbox['x2'] > img_w * (1 - edge_margin) or
                    bbox['y1'] < img_h * edge_margin or bbox['y2'] > img_h * (1 - edge_margin)
                )
                
                # Very permissive edge filtering - only filter very low confidence near edges
                if is_near_edge and confidence < 0.25:  # Lowered from 0.4 to 0.25
                    print(f"  FILTERED: {pred['label']} near edge with low confidence ({confidence:.3f})")
                    is_valid_detection = False
                elif confidence < min_confidence_threshold:
                    print(f"  FILTERED: {pred['label']} below minimum confidence ({confidence:.3f})")
                    is_valid_detection = False
                
                # 4. RESTORED: More permissive center bias filtering
                center_x = (bbox['x1'] + bbox['x2']) / 2
                center_y = (bbox['y1'] + bbox['y2']) / 2
                img_center_x = img_w / 2
                img_center_y = img_h / 2
                
                distance_from_center = ((center_x - img_center_x)**2 + (center_y - img_center_y)**2)**0.5
                max_distance = (img_w**2 + img_h**2)**0.5 / 2
                center_factor = 1 - (distance_from_center / max_distance)
                
                # More gentle center bias - less aggressive filtering
                if center_factor > 0.5:  # Lowered from 0.6 to 0.5
                    pred['score'] = min(confidence * 1.1, 0.98)
                    print(f"  BOOSTED: {pred['label']} center detection ({center_factor:.2f})")
                elif center_factor < 0.2 and confidence < 0.45:  # More permissive (was 0.3 and 0.6)
                    print(f"  FILTERED: {pred['label']} edge detection with low confidence")
                    is_valid_detection = False
                
                if is_valid_detection:
                    filtered_predictions.append(pred)
                    print(f"  ACCEPTED: {pred['label']} confidence: {pred['score']:.3f}, area: {relative_area:.4f}")
            
            predictions = filtered_predictions
            
            # Advanced confidence boosting with class-specific adjustments
            for pred in predictions:
                base_score = pred['score']
                
                # Class-specific confidence adjustments
                if pred['label'] == 'organic':
                    # Organic waste often has lower confidence, boost more aggressively
                    if base_score > 0.45:
                        pred['score'] = min(base_score * 1.15, 0.98)
                    elif base_score > 0.35:
                        pred['score'] = min(base_score * 1.12, 0.95)
                    elif base_score > 0.25:
                        pred['score'] = min(base_score * 1.08, 0.92)
                        
                elif pred['label'] == 'recyclable':
                    # NEW MODEL: Recyclable 58.8% precision, 92.4% recall
                    # Model is catching recyclables well (high recall) but with more false positives
                    if base_score > 0.4:  # Higher threshold for new model
                        pred['score'] = min(base_score * 1.15, 0.95)  # Moderate boost
                    elif base_score > 0.3:  # Medium threshold
                        pred['score'] = min(base_score * 1.10, 0.90)
                    elif base_score > 0.25:  # Still catch lower confidence recyclables
                        pred['score'] = min(base_score * 1.05, 0.85)
                    
                    # Additional boost for common recyclable patterns
                    bbox = pred.get('bbox')
                    if bbox:
                        # Check for typical recyclable shape ratios (bottles, cans, boxes)
                        width = bbox['x2'] - bbox['x1']
                        height = bbox['y2'] - bbox['y1']
                        if height > 0:
                            aspect_ratio = width / height
                            # Tall objects (bottles) or wide objects (cans lying down)
                            if aspect_ratio < 0.6 or aspect_ratio > 1.8:
                                pred['score'] = min(pred['score'] * 1.1, 0.98)
                
            # Remove low-confidence duplicates (same class detected multiple times)
            seen_classes = {}
            filtered_predictions = []
            
            for pred in predictions:
                class_name = pred['label']
                if class_name not in seen_classes or pred['score'] > seen_classes[class_name]['score']:
                    seen_classes[class_name] = pred
            
            # Keep only the best detection per class
            filtered_predictions = list(seen_classes.values())
            predictions = sorted(filtered_predictions, key=lambda x: x['score'], reverse=True)
        
        # Final validation - ensure we have meaningful waste detections
        final_predictions = []
        if len(predictions) > 0:
            # Group by class and keep only the best of each
            class_groups = {}
            for pred in predictions:
                class_name = pred['label']
                if class_name not in class_groups or pred['score'] > class_groups[class_name]['score']:
                    class_groups[class_name] = pred
            
            # RELAXED: Very permissive final threshold
            for class_name, pred in class_groups.items():
                if pred['score'] >= 0.2:  # Further lowered from 0.3 to 0.2
                    final_predictions.append(pred)
                    print(f"  FINAL: {pred['label']} ({pred['score']:.3f})")
                else:
                    print(f"  REJECTED: {pred['label']} final confidence too low ({pred['score']:.3f})")
        
        predictions = sorted(final_predictions, key=lambda x: x['score'], reverse=True)
        
        print(f"RESTORED PIPELINE: {raw_detections} raw → {total_detections} accepted → {len(predictions)} final (PERMISSIVE FILTERING)")
        
        if len(predictions) > 0:
            print(f"✓ Valid waste detected: {predictions[0]['label']} ({predictions[0]['score']:.3f})")
        else:
            print("✓ No waste detected - clean scene")
        
        return jsonify({
            'success': True,
            'predictions': predictions[:5],  # Limit to top 5
            'total_detections': total_detections
        })
        
    except Exception as e:
        print(f"Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/labels')
def get_labels():
    """Get class labels."""
    if model:
        return jsonify({'labels': list(model.names.values())})
    return jsonify({'labels': ['organic', 'recyclable']})

@app.route('/api/status')
def get_status():
    """Get API status with detailed model info."""
    status_info = {
        'status': 'running',
        'model_loaded': model is not None,
        'model_classes': list(model.names.values()) if model else []
    }
    
    if model and model_info:
        status_info.update({
            'model_path': model_info.get('path'),
            'model_device': model_info.get('device'),
            'model_task': model_info.get('task'),
            'total_classes': len(model.names) if model else 0,
            'gpu_available': model_info.get('gpu_available', False),
            'gpu_name': model_info.get('gpu_name')
        })
    
    return jsonify(status_info)

if __name__ == '__main__':
    print("Simple Flask API for React Development")
    print("=" * 40)
    print("API running at: http://localhost:8000")
    print("React dev server: http://localhost:5173")
    print("Model classes:", list(model.names.values()) if model else "No model")
    print()
    
    app.run(host='localhost', port=8000, debug=True)