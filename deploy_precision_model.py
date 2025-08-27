#!/usr/bin/env python3
"""
Precision-Focused Deployment Script for BorlaCam
================================================

Implements flawless waste classification with:
1. Class-specific confidence thresholds
2. Precision-first decision making
3. Real-time monitoring of classification accuracy
4. Fallback mechanisms for uncertain predictions
"""

import cv2
import torch
from ultralytics import YOLO
import numpy as np
import json
import time
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PrecisionWasteDetector:
    def __init__(self, model_path, config_path=None):
        """
        Initialize precision-focused waste detector.
        """
        self.model = YOLO(model_path)
        self.model_path = model_path
        
        # Default precision-focused thresholds
        self.thresholds = {
            'organic': 0.4,      # Lower threshold for organic (majority class)
            'recyclable': 0.7,   # Higher threshold for recyclable (minority class)
            'iou': 0.45,         # Standard IoU threshold
            'global_conf': 0.25  # Fallback global confidence
        }
        
        # Load custom config if provided
        if config_path and Path(config_path).exists():
            self.load_config(config_path)
        
        # Performance tracking
        self.stats = {
            'total_detections': 0,
            'organic_detections': 0,
            'recyclable_detections': 0,
            'uncertain_detections': 0,
            'processing_times': [],
            'confidence_scores': {'organic': [], 'recyclable': []}
        }
        
        logger.info(f"Precision detector initialized with model: {model_path}")
        logger.info(f"Thresholds - Organic: {self.thresholds['organic']}, Recyclable: {self.thresholds['recyclable']}")
    
    def load_config(self, config_path):
        """
        Load deployment configuration with optimized thresholds.
        """
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            if 'deployment_recommendations' in config:
                primary_threshold = config['deployment_recommendations']['primary_threshold']
                if primary_threshold:
                    self.thresholds['global_conf'] = primary_threshold
            
            # Update thresholds if specified
            if 'thresholds' in config:
                self.thresholds.update(config['thresholds'])
            
            logger.info(f"Loaded config from: {config_path}")
            
        except Exception as e:
            logger.warning(f"Failed to load config: {e}, using defaults")
    
    def detect_with_precision_control(self, image, return_confidence=True):
        """
        Perform detection with precision-focused post-processing.
        """
        start_time = time.time()
        
        # Run inference with lower global threshold to get all potential detections
        results = self.model(image, conf=self.thresholds['global_conf'], 
                           iou=self.thresholds['iou'], verbose=False)
        
        if not results or not results[0].boxes:
            return [], []
        
        boxes = results[0].boxes
        filtered_detections = []
        confidences = []
        
        for box in boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            class_name = self.model.names[class_id]
            
            # Apply class-specific thresholds
            if class_name == 'organic' and confidence >= self.thresholds['organic']:
                filtered_detections.append({
                    'class': class_name,
                    'confidence': confidence,
                    'bbox': box.xyxy[0].cpu().numpy(),
                    'status': 'confident'
                })
                self.stats['organic_detections'] += 1
                self.stats['confidence_scores']['organic'].append(confidence)
                
            elif class_name == 'recyclable' and confidence >= self.thresholds['recyclable']:
                filtered_detections.append({
                    'class': class_name,
                    'confidence': confidence,
                    'bbox': box.xyxy[0].cpu().numpy(),
                    'status': 'confident'
                })
                self.stats['recyclable_detections'] += 1
                self.stats['confidence_scores']['recyclable'].append(confidence)
                
            else:
                # Handle uncertain detections
                filtered_detections.append({
                    'class': class_name,
                    'confidence': confidence,
                    'bbox': box.xyxy[0].cpu().numpy(),
                    'status': 'uncertain',
                    'reason': f'confidence {confidence:.3f} below threshold {self.thresholds[class_name]:.3f}'
                })
                self.stats['uncertain_detections'] += 1
        
        processing_time = time.time() - start_time
        self.stats['processing_times'].append(processing_time)
        self.stats['total_detections'] += len(filtered_detections)
        
        if return_confidence:
            return filtered_detections, [d['confidence'] for d in filtered_detections]
        else:
            return filtered_detections
    
    def draw_precision_results(self, image, detections):
        """
        Draw detection results with precision indicators.
        """
        result_image = image.copy()
        
        for detection in detections:
            bbox = detection['bbox']
            class_name = detection['class']
            confidence = detection['confidence']
            status = detection['status']
            
            # Color coding based on status and class
            if status == 'confident':
                if class_name == 'organic':
                    color = (0, 255, 0)  # Green for confident organic
                else:
                    color = (0, 165, 255)  # Orange for confident recyclable
            else:
                color = (128, 128, 128)  # Gray for uncertain
            
            # Draw bounding box
            x1, y1, x2, y2 = map(int, bbox)
            cv2.rectangle(result_image, (x1, y1), (x2, y2), color, 2)
            
            # Create label with confidence and status
            label = f"{class_name}: {confidence:.3f}"
            if status == 'uncertain':
                label += " (UNCERTAIN)"
            
            # Draw label background
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
            cv2.rectangle(result_image, (x1, y1 - label_size[1] - 10), 
                         (x1 + label_size[0], y1), color, -1)
            
            # Draw label text
            cv2.putText(result_image, label, (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return result_image
    
    def process_camera_feed(self, camera_index=0, save_results=False):
        """
        Process live camera feed with precision detection.
        """
        cap = cv2.VideoCapture(camera_index)
        
        if not cap.isOpened():
            logger.error(f"Failed to open camera {camera_index}")
            return
        
        logger.info("Starting precision waste detection (Press 'q' to quit)")
        logger.info("Green boxes: Confident organic | Orange boxes: Confident recyclable | Gray boxes: Uncertain")
        
        frame_count = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process frame
                detections = self.detect_with_precision_control(frame)
                
                # Draw results
                result_frame = self.draw_precision_results(frame, detections)
                
                # Add performance stats overlay
                self.add_stats_overlay(result_frame)
                
                # Display frame
                cv2.imshow('BorlaCam - Precision Waste Detection', result_frame)
                
                # Save frame if requested
                if save_results and frame_count % 30 == 0:  # Save every 30th frame
                    output_path = f"detection_results/frame_{frame_count:06d}.jpg"
                    Path("detection_results").mkdir(exist_ok=True)
                    cv2.imwrite(output_path, result_frame)
                
                frame_count += 1
                
                # Check for quit
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
        except KeyboardInterrupt:
            logger.info("Detection interrupted by user")
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
            self.print_final_stats()
    
    def add_stats_overlay(self, image):
        """
        Add performance statistics overlay to image.
        """
        height, width = image.shape[:2]
        
        # Calculate stats
        avg_time = np.mean(self.stats['processing_times'][-100:]) if self.stats['processing_times'] else 0
        fps = 1.0 / avg_time if avg_time > 0 else 0
        
        # Create stats text
        stats_text = [
            f"FPS: {fps:.1f}",
            f"Total: {self.stats['total_detections']}",
            f"Organic: {self.stats['organic_detections']}",
            f"Recyclable: {self.stats['recyclable_detections']}",
            f"Uncertain: {self.stats['uncertain_detections']}"
        ]
        
        # Draw semi-transparent background
        overlay = image.copy()
        cv2.rectangle(overlay, (width - 200, 10), (width - 10, 150), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, image, 0.3, 0, image)
        
        # Draw stats text
        for i, text in enumerate(stats_text):
            y_pos = 35 + i * 25
            cv2.putText(image, text, (width - 190, y_pos), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    def process_image(self, image_path, output_path=None):
        """
        Process single image with precision detection.
        """
        image = cv2.imread(str(image_path))
        if image is None:
            logger.error(f"Failed to load image: {image_path}")
            return None
        
        detections = self.detect_with_precision_control(image)
        result_image = self.draw_precision_results(image, detections)
        
        if output_path:
            cv2.imwrite(str(output_path), result_image)
            logger.info(f"Result saved to: {output_path}")
        
        return detections, result_image
    
    def print_final_stats(self):
        """
        Print final detection statistics.
        """
        total = self.stats['total_detections']
        organic = self.stats['organic_detections'] 
        recyclable = self.stats['recyclable_detections']
        uncertain = self.stats['uncertain_detections']
        
        avg_time = np.mean(self.stats['processing_times']) if self.stats['processing_times'] else 0
        avg_fps = 1.0 / avg_time if avg_time > 0 else 0
        
        logger.info("=" * 50)
        logger.info("DETECTION SESSION SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Total detections: {total}")
        logger.info(f"Confident organic: {organic} ({organic/total*100:.1f}%)" if total > 0 else "Confident organic: 0")
        logger.info(f"Confident recyclable: {recyclable} ({recyclable/total*100:.1f}%)" if total > 0 else "Confident recyclable: 0") 
        logger.info(f"Uncertain: {uncertain} ({uncertain/total*100:.1f}%)" if total > 0 else "Uncertain: 0")
        logger.info(f"Average FPS: {avg_fps:.1f}")
        
        if self.stats['confidence_scores']['organic']:
            avg_org_conf = np.mean(self.stats['confidence_scores']['organic'])
            logger.info(f"Average organic confidence: {avg_org_conf:.3f}")
        
        if self.stats['confidence_scores']['recyclable']:
            avg_rec_conf = np.mean(self.stats['confidence_scores']['recyclable'])
            logger.info(f"Average recyclable confidence: {avg_rec_conf:.3f}")
        
        logger.info("=" * 50)

def main():
    """
    Main deployment function.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Deploy precision waste detection')
    parser.add_argument('--model', required=True, help='Path to trained model (.pt)')
    parser.add_argument('--config', help='Path to deployment config (.json)')
    parser.add_argument('--mode', choices=['camera', 'image'], default='camera', help='Detection mode')
    parser.add_argument('--input', help='Input image path (for image mode)')
    parser.add_argument('--output', help='Output path (for image mode)')
    parser.add_argument('--camera', type=int, default=0, help='Camera index')
    parser.add_argument('--save', action='store_true', help='Save detection results')
    
    args = parser.parse_args()
    
    if not Path(args.model).exists():
        logger.error(f"Model not found: {args.model}")
        return
    
    # Initialize detector
    detector = PrecisionWasteDetector(args.model, args.config)
    
    if args.mode == 'camera':
        logger.info("Starting camera-based waste detection...")
        detector.process_camera_feed(args.camera, args.save)
    
    elif args.mode == 'image':
        if not args.input:
            logger.error("Input image path required for image mode")
            return
        
        logger.info(f"Processing image: {args.input}")
        detections, result_image = detector.process_image(args.input, args.output)
        
        # Print detection results
        logger.info(f"Found {len(detections)} detections:")
        for detection in detections:
            logger.info(f"  {detection['class']}: {detection['confidence']:.3f} ({detection['status']})")

if __name__ == "__main__":
    main()