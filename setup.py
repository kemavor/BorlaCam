#!/usr/bin/env python3
"""
BorlaCam Setup Script
Automated setup and installation for the BorlaCam waste classification system.
"""

import os
import sys
import subprocess
import platform


def check_python_version():
    """Check if Python version is compatible."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8 or higher is required")
        print(f"   Current version: {version.major}.{version.minor}.{version.micro}")
        return False
    
    print(f"✓ Python {version.major}.{version.minor}.{version.micro} detected")
    return True


def install_requirements():
    """Install required packages."""
    print("📦 Installing required packages...")
    
    try:
        # Upgrade pip first
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--upgrade', 'pip'])
        
        # Install requirements
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        
        print("✓ All packages installed successfully")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install packages: {e}")
        return False


def download_yolo_model():
    """Download the base YOLOv8 model with fallback options."""
    print("🧠 Downloading YOLOv8 model...")
    
    try:
        from ultralytics import YOLO
        
        # This will automatically download the model if not present
        model = YOLO('yolov8n.pt')
        print("✓ YOLOv8 nano model downloaded")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to download model: {e}")
        print("🔧 Trying manual download...")
        
        # Try manual download
        try:
            import requests
            
            model_url = "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt"
            model_path = "./yolov8n.pt"
            
            print("   Downloading from GitHub releases...")
            response = requests.get(model_url, timeout=30)
            response.raise_for_status()
            
            with open(model_path, 'wb') as f:
                f.write(response.content)
            
            print(f"✓ Manual download successful: {model_path}")
            
            # Verify the download
            from ultralytics import YOLO
            model = YOLO(model_path)
            print("✓ Model verification successful")
            
            return True
            
        except Exception as manual_error:
            print(f"❌ Manual download also failed: {manual_error}")
            print("⚠ You can run the fix script: python fix_model_download.py")
            return False


def test_camera():
    """Test camera functionality."""
    print("📹 Testing camera access...")
    
    try:
        import cv2
        
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("⚠ Warning: Could not access camera")
            print("   Please check camera permissions and connections")
            return False
        
        ret, frame = cap.read()
        cap.release()
        
        if ret and frame is not None:
            print("✓ Camera test successful")
            return True
        else:
            print("⚠ Warning: Camera accessible but no frame captured")
            return False
            
    except Exception as e:
        print(f"❌ Camera test failed: {e}")
        return False


def test_audio():
    """Test text-to-speech functionality."""
    print("🔊 Testing audio system...")
    
    try:
        import pyttsx3
        
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)
        
        print("✓ Text-to-speech engine initialized")
        
        # Optional: Test audio output
        response = input("Would you like to test audio output? (y/n): ").lower()
        if response == 'y':
            engine.say("BorlaCam audio test successful")
            engine.runAndWait()
            print("✓ Audio test completed")
        
        return True
        
    except Exception as e:
        print(f"⚠ Audio system warning: {e}")
        print("   BorlaCam will work without audio feedback")
        return True  # Non-critical failure


def create_directories():
    """Create necessary directories."""
    print("📁 Creating project directories...")
    
    directories = [
        'datasets',
        'models',
        'logs'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    print("✓ Directories created")


def display_system_info():
    """Display system information."""
    print("💻 System Information:")
    print(f"   OS: {platform.system()} {platform.release()}")
    print(f"   Architecture: {platform.machine()}")
    print(f"   Python: {sys.version.split()[0]}")
    
    try:
        import torch
        print(f"   PyTorch: {torch.__version__}")
        print(f"   CUDA Available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   CUDA Devices: {torch.cuda.device_count()}")
    except ImportError:
        print("   PyTorch: Not installed yet")


def main():
    """Main setup function."""
    print("🗂️ BorlaCam Setup Script")
    print("=" * 50)
    print("Setting up AI-Powered Waste Classification System")
    print("=" * 50)
    
    # Display system info
    display_system_info()
    print()
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Create directories
    create_directories()
    
    # Install requirements
    if not install_requirements():
        return False
    
    # Download YOLO model
    if not download_yolo_model():
        return False
    
    # Test camera
    camera_ok = test_camera()
    
    # Test audio
    audio_ok = test_audio()
    
    print("\n" + "=" * 50)
    print("🎉 Setup completed!")
    print("=" * 50)
    
    if camera_ok and audio_ok:
        print("✅ All systems ready!")
    elif camera_ok:
        print("✅ Setup successful (audio warnings can be ignored)")
    else:
        print("⚠ Setup completed with warnings")
        print("   Please check camera connections before running")
    
    print("\n📋 Next steps:")
    print("   1. Run: python borlacam.py")
    print("   2. For custom training: python train_waste_model.py")
    print("   3. Show waste items to camera for classification")
    
    print("\n🎯 Usage tips:")
    print("   • Ensure good lighting for better detection")
    print("   • Hold items clearly in camera view")
    print("   • Press 'q' to quit, 's' to toggle sound")
    
    return True


if __name__ == "__main__":
    try:
        success = main()
        if success:
            sys.exit(0)
        else:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⏹ Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)