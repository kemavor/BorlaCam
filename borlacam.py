#!/usr/bin/env python3

import cv2
import numpy as np
import pyttsx3
import threading
import time
from ultralytics import YOLO
from collections import defaultdict


class BorlaCam:
    def __init__(self):
        """Initialize the BorlaCam waste classification system."""
        self.model = None
        self.cap = None
        self.tts_engine = None
        self.last_announcement = {}
        self.announcement_cooldown = 3.0  # seconds
        self.confidence_threshold = 0.5
        
        # Define waste categories and their colors for visualization
        self.waste_colors = {
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
        
        self.setup_tts()
        
    def setup_tts(self):
        """Initialize the text-to-speech engine."""
        try:
            self.tts_engine = pyttsx3.init()
            self.tts_engine.setProperty('rate', 150)
            self.tts_engine.setProperty('volume', 0.8)
            print("✓ Text-to-speech engine initialized")
        except Exception as e:
            print(f"⚠ Warning: Could not initialize TTS engine: {e}")
            self.tts_engine = None
    
    def load_model(self):
        """Load the YOLOv8 model for waste classification."""
        try:
            # Try to load MX450 trained model first, then fallback to other models
            try:
                self.model = YOLO('waste_training/mx450_waste_model/weights/best.pt')  # MX450 custom model
                print("✓ Custom MX450 waste detection model loaded")
                print("  Model trained on 50 epochs with 70%+ accuracy")
            except:
                try:
                    self.model = YOLO('waste_detection.pt')  # Fallback custom model
                    print("✓ Custom waste detection model loaded")
                except:
                    self.model = YOLO('yolov8n.pt')  # Default YOLOv8 nano model
                    print("✓ YOLOv8 nano model loaded (using general object detection)")
                    print("  Note: For best results, train a custom model on waste datasets")
            
            return True
        except Exception as e:
            print(f"✗ Error loading model: {e}")
            return False
    
    def setup_camera(self, camera_index=0):
        """Initialize the webcam capture."""
        try:
            self.cap = cv2.VideoCapture(camera_index)
            if not self.cap.isOpened():
                raise Exception("Could not open camera")
            
            # Set camera properties for better performance
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            print("✓ Camera initialized successfully")
            return True
        except Exception as e:
            print(f"✗ Error setting up camera: {e}")
            return False
    
    def announce_detection(self, class_name):
        """Announce detected waste type using text-to-speech."""
        if not self.tts_engine:
            return
        
        current_time = time.time()
        
        # Check if enough time has passed since last announcement of this class
        if (class_name in self.last_announcement and 
            current_time - self.last_announcement[class_name] < self.announcement_cooldown):
            return
        
        self.last_announcement[class_name] = current_time
        
        # Create announcement message
        if class_name.lower() in ['plastic', 'paper', 'metal', 'glass', 'cardboard']:
            message = f"{class_name.title()} detected - Recyclable waste"
        elif class_name.lower() in ['organic', 'food']:
            message = f"{class_name.title()} detected - Compostable waste"
        else:
            message = f"{class_name.title()} detected"
        
        # Run TTS in a separate thread to avoid blocking
        def speak():
            try:
                self.tts_engine.say(message)
                self.tts_engine.runAndWait()
            except:
                pass
        
        threading.Thread(target=speak, daemon=True).start()
    
    def process_detections(self, results, frame):
        """Process YOLO detection results and draw bounding boxes."""
        detected_items = set()
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Get confidence score
                    confidence = float(box.conf[0])
                    
                    if confidence >= self.confidence_threshold:
                        # Get class information
                        class_id = int(box.cls[0])
                        class_name = result.names[class_id].lower()
                        
                        # Map general objects to waste categories
                        waste_type = self.map_to_waste_category(class_name)
                        
                        # Get bounding box coordinates
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        
                        # Get color for this waste type
                        color = self.waste_colors.get(waste_type, (255, 255, 255))
                        
                        # Draw bounding box
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        
                        # Draw label with background
                        label = f"{waste_type.title()}: {confidence:.2f}"
                        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                        
                        # Background rectangle for text
                        cv2.rectangle(frame, (x1, y1 - label_size[1] - 10), 
                                    (x1 + label_size[0], y1), color, -1)
                        
                        # Text
                        cv2.putText(frame, label, (x1, y1 - 5), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
                        
                        detected_items.add(waste_type)
        
        # Announce detections
        for item in detected_items:
            self.announce_detection(item)
        
        return frame
    
    def map_to_waste_category(self, detected_class):
        """Map detected objects to waste categories."""
        # Mapping dictionary for common objects to waste types
        waste_mapping = {
            'bottle': 'plastic',
            'cup': 'plastic',
            'fork': 'plastic',
            'knife': 'plastic',
            'spoon': 'plastic',
            'bowl': 'plastic',
            'banana': 'organic',
            'apple': 'organic',
            'orange': 'organic',
            'carrot': 'organic',
            'broccoli': 'organic',
            'pizza': 'organic',
            'donut': 'organic',
            'cake': 'organic',
            'sandwich': 'organic',
            'hot dog': 'organic',
            'book': 'paper',
            'laptop': 'metal',
            'keyboard': 'metal',
            'mouse': 'metal',
            'cell phone': 'metal',
            'tv': 'metal',
            'scissors': 'metal',
            'teddy bear': 'trash',
            'hair drier': 'metal',
            'toothbrush': 'plastic'
        }
        
        return waste_mapping.get(detected_class, 'trash')
    
    def draw_info_panel(self, frame):
        """Draw information panel on the frame."""
        height, width = frame.shape[:2]
        
        # Create semi-transparent overlay
        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (400, 120), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        
        # Add title and instructions
        cv2.putText(frame, "BorlaCam - AI Waste Classifier", (20, 35), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        cv2.putText(frame, "Show waste items to camera for classification", (20, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, "Press 'q' to quit | Press 's' to toggle sound", (20, 80), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Show confidence threshold
        cv2.putText(frame, f"Confidence: {self.confidence_threshold:.1f}", (20, 100), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        return frame
    
    def run(self):
        """Main application loop."""
        print("\n🚀 Starting BorlaCam...")
        print("=" * 50)
        
        # Initialize components
        if not self.load_model():
            print("Failed to load detection model. Exiting.")
            return
        
        if not self.setup_camera():
            print("Failed to setup camera. Exiting.")
            return
        
        print("✓ All systems ready!")
        print("\n📹 Starting real-time waste detection...")
        print("   Show waste items to the camera")
        print("   Press 'q' to quit")
        print("   Press 's' to toggle sound")
        print("   Press '+'/'-' to adjust confidence threshold")
        print("\n" + "=" * 50)
        
        fps_counter = 0
        start_time = time.time()
        sound_enabled = True
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    print("Failed to grab frame")
                    break
                
                # Flip frame horizontally for mirror effect
                frame = cv2.flip(frame, 1)
                
                # Run YOLO detection
                results = self.model(frame, verbose=False)
                
                # Process detections and draw bounding boxes
                frame = self.process_detections(results, frame)
                
                # Draw information panel
                frame = self.draw_info_panel(frame)
                
                # Calculate and display FPS
                fps_counter += 1
                if fps_counter % 30 == 0:
                    elapsed_time = time.time() - start_time
                    fps = 30 / elapsed_time
                    start_time = time.time()
                    
                cv2.putText(frame, f"FPS: {fps:.1f}", (frame.shape[1] - 100, 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                # Display sound status
                sound_status = "ON" if sound_enabled else "OFF"
                cv2.putText(frame, f"Sound: {sound_status}", (frame.shape[1] - 100, 60), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                # Show frame
                cv2.imshow('BorlaCam - Waste Classification', frame)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    sound_enabled = not sound_enabled
                    if not sound_enabled:
                        self.tts_engine = None
                    else:
                        self.setup_tts()
                elif key == ord('+') or key == ord('='):
                    self.confidence_threshold = min(0.9, self.confidence_threshold + 0.1)
                elif key == ord('-'):
                    self.confidence_threshold = max(0.1, self.confidence_threshold - 0.1)
                
        except KeyboardInterrupt:
            print("\nStopping BorlaCam...")
        
        finally:
            # Cleanup
            if self.cap:
                self.cap.release()
            cv2.destroyAllWindows()
            print("Cleanup completed")
            print("Thank you for using BorlaCam!")


def main():
    """Main entry point for the application."""
    print("BorlaCam: AI-Powered Waste Classification System")
    print("=" * 60)
    print("Real-time waste detection and sorting using YOLOv8")
    print("Developed for automated waste management solutions")
    print("=" * 60)
    
    try:
        app = BorlaCam()
        app.run()
    except Exception as e:
        print(f"Error running BorlaCam: {e}")
        print("Please check your camera connection and model files.")


if __name__ == "__main__":
    main()