#!/usr/bin/env python3
"""
BorlaCam Utility Functions
Helper functions for waste classification and system operations.
"""

import cv2
import numpy as np
import os
import json
from datetime import datetime
import logging


class WasteClassificationUtils:
    """Utility class for waste classification operations."""
    
    @staticmethod
    def setup_logging():
        """Set up logging configuration."""
        log_dir = './logs'
        os.makedirs(log_dir, exist_ok=True)
        
        log_file = os.path.join(log_dir, f'borlacam_{datetime.now().strftime("%Y%m%d")}.log')
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        
        return logging.getLogger(__name__)
    
    @staticmethod
    def load_config(config_path='config.json'):
        """Load configuration from JSON file."""
        default_config = {
            "confidence_threshold": 0.5,
            "announcement_cooldown": 3.0,
            "camera_index": 0,
            "frame_width": 640,
            "frame_height": 480,
            "fps": 30,
            "audio_enabled": True,
            "voice_rate": 150,
            "voice_volume": 0.8
        }
        
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                # Merge with defaults for missing keys
                for key, value in default_config.items():
                    if key not in config:
                        config[key] = value
                return config
            except Exception as e:
                print(f"Error loading config: {e}")
                return default_config
        else:
            # Create default config file
            with open(config_path, 'w') as f:
                json.dump(default_config, f, indent=4)
            return default_config
    
    @staticmethod
    def save_config(config, config_path='config.json'):
        """Save configuration to JSON file."""
        try:
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=4)
            return True
        except Exception as e:
            print(f"Error saving config: {e}")
            return False
    
    @staticmethod
    def preprocess_frame(frame, target_size=(640, 640)):
        """Preprocess frame for better detection."""
        # Resize frame while maintaining aspect ratio
        height, width = frame.shape[:2]
        scale = min(target_size[0] / width, target_size[1] / height)
        
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        resized = cv2.resize(frame, (new_width, new_height))
        
        # Create padded frame
        padded = np.zeros((target_size[1], target_size[0], 3), dtype=np.uint8)
        y_offset = (target_size[1] - new_height) // 2
        x_offset = (target_size[0] - new_width) // 2
        
        padded[y_offset:y_offset + new_height, x_offset:x_offset + new_width] = resized
        
        return padded, scale, (x_offset, y_offset)
    
    @staticmethod
    def enhance_image(frame):
        """Enhance image quality for better detection."""
        # Convert to LAB color space
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        
        # Split channels
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE to L channel
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        
        # Merge channels
        enhanced_lab = cv2.merge([l, a, b])
        
        # Convert back to BGR
        enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        
        return enhanced
    
    @staticmethod
    def calculate_fps(frame_count, start_time, current_time):
        """Calculate frames per second."""
        elapsed_time = current_time - start_time
        if elapsed_time > 0:
            return frame_count / elapsed_time
        return 0
    
    @staticmethod
    def draw_fps_counter(frame, fps, position=(10, 30)):
        """Draw FPS counter on frame."""
        fps_text = f"FPS: {fps:.1f}"
        cv2.putText(frame, fps_text, position, cv2.FONT_HERSHEY_SIMPLEX, 
                   0.7, (0, 255, 0), 2)
    
    @staticmethod
    def create_waste_statistics():
        """Create waste detection statistics tracker."""
        return {
            'total_detections': 0,
            'categories': {
                'plastic': 0,
                'paper': 0,
                'metal': 0,
                'glass': 0,
                'organic': 0,
                'trash': 0
            },
            'session_start': datetime.now().isoformat()
        }
    
    @staticmethod
    def update_statistics(stats, detected_categories):
        """Update waste detection statistics."""
        stats['total_detections'] += len(detected_categories)
        for category in detected_categories:
            if category in stats['categories']:
                stats['categories'][category] += 1
    
    @staticmethod
    def save_statistics(stats, filename=None):
        """Save statistics to file."""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f'waste_stats_{timestamp}.json'
        
        stats_dir = './logs'
        os.makedirs(stats_dir, exist_ok=True)
        
        filepath = os.path.join(stats_dir, filename)
        
        try:
            with open(filepath, 'w') as f:
                json.dump(stats, f, indent=4)
            return filepath
        except Exception as e:
            print(f"Error saving statistics: {e}")
            return None
    
    @staticmethod
    def get_waste_color(category):
        """Get color for waste category visualization."""
        colors = {
            'plastic': (0, 255, 0),      # Green
            'paper': (255, 0, 0),        # Blue
            'metal': (0, 255, 255),      # Yellow
            'glass': (255, 0, 255),      # Magenta
            'cardboard': (255, 165, 0),  # Orange
            'trash': (0, 0, 255),        # Red
            'organic': (0, 128, 0),      # Dark Green
            'bottle': (128, 0, 128),     # Purple
            'can': (192, 192, 192),      # Silver
            'bag': (128, 128, 0)         # Olive
        }
        return colors.get(category, (255, 255, 255))  # Default white
    
    @staticmethod
    def create_detection_log_entry(category, confidence, timestamp=None):
        """Create a detection log entry."""
        if timestamp is None:
            timestamp = datetime.now().isoformat()
        
        return {
            'timestamp': timestamp,
            'category': category,
            'confidence': confidence,
            'recyclable': category.lower() in ['plastic', 'paper', 'metal', 'glass', 'cardboard'],
            'compostable': category.lower() in ['organic', 'food']
        }
    
    @staticmethod
    def validate_camera_access(camera_index=0):
        """Validate camera access and return camera info."""
        try:
            cap = cv2.VideoCapture(camera_index)
            if not cap.isOpened():
                return False, "Camera not accessible"
            
            # Test frame capture
            ret, frame = cap.read()
            if not ret or frame is None:
                cap.release()
                return False, "Camera accessible but no frame captured"
            
            # Get camera properties
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            cap.release()
            
            camera_info = {
                'resolution': (width, height),
                'fps': fps,
                'working': True
            }
            
            return True, camera_info
            
        except Exception as e:
            return False, str(e)
    
    @staticmethod
    def create_backup_config():
        """Create backup of current configuration."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f'config_backup_{timestamp}.json'
        
        if os.path.exists('config.json'):
            try:
                import shutil
                shutil.copy('config.json', backup_name)
                return backup_name
            except Exception as e:
                print(f"Error creating backup: {e}")
                return None
        return None


class PerformanceMonitor:
    """Monitor system performance during waste detection."""
    
    def __init__(self):
        self.frame_times = []
        self.detection_times = []
        self.max_samples = 100
    
    def add_frame_time(self, frame_time):
        """Add frame processing time."""
        self.frame_times.append(frame_time)
        if len(self.frame_times) > self.max_samples:
            self.frame_times.pop(0)
    
    def add_detection_time(self, detection_time):
        """Add detection processing time."""
        self.detection_times.append(detection_time)
        if len(self.detection_times) > self.max_samples:
            self.detection_times.pop(0)
    
    def get_average_fps(self):
        """Get average FPS."""
        if not self.frame_times:
            return 0
        avg_time = sum(self.frame_times) / len(self.frame_times)
        return 1.0 / avg_time if avg_time > 0 else 0
    
    def get_average_detection_time(self):
        """Get average detection time in milliseconds."""
        if not self.detection_times:
            return 0
        return (sum(self.detection_times) / len(self.detection_times)) * 1000
    
    def get_performance_summary(self):
        """Get performance summary."""
        return {
            'avg_fps': self.get_average_fps(),
            'avg_detection_time_ms': self.get_average_detection_time(),
            'total_frames': len(self.frame_times),
            'total_detections': len(self.detection_times)
        }