# 🗂️ BorlaCam: AI-Powered Waste Classification System

**Real-time waste detection and classification using YOLOv8 and computer vision**

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-orange.svg)](https://github.com/ultralytics/ultralytics)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.8+-green.svg)](https://opencv.org/)

## 🎯 Project Overview

BorlaCam is a complete, end-to-end waste classification system that uses artificial intelligence to identify and categorize different types of waste in real-time. The system combines computer vision, deep learning, and audio feedback to create an automated solution for waste sorting at the source.

### 🌍 Problem Statement

- **Inefficient waste segregation** at the source
- **Environmental pollution** due to improper sorting
- **High labor costs** for manual waste sorting
- **Lack of automation tools** for waste management

### 🔧 Solution

BorlaCam provides real-time waste classification using:
- **YOLOv8 object detection** for accurate waste identification
- **Live webcam feed** for continuous monitoring
- **Voice announcements** for immediate feedback
- **Visual indicators** with bounding boxes and labels

## 🚀 Features

### Core Functionality
- ✅ **Real-time Detection**: Live webcam feed with instant classification
- ✅ **Multi-class Classification**: Supports plastic, paper, metal, glass, organic waste, and more
- ✅ **Voice Feedback**: Audio announcements using text-to-speech
- ✅ **Visual Indicators**: Color-coded bounding boxes and confidence scores
- ✅ **Performance Monitoring**: Real-time FPS display
- ✅ **Interactive Controls**: Keyboard shortcuts for settings adjustment

### Waste Categories Detected
- 🟢 **Plastic** (bottles, cups, containers)
- 🔵 **Paper** (documents, cardboard)
- 🟡 **Metal** (cans, electronics)
- 🟣 **Glass** (bottles, containers)
- 🟤 **Organic** (food waste, compostables)
- 🔴 **General Trash** (non-recyclable items)

### Advanced Features
- **Confidence Threshold Adjustment**: Fine-tune detection sensitivity
- **Sound Toggle**: Enable/disable audio feedback
- **FPS Optimization**: Efficient processing for smooth real-time operation
- **Custom Model Support**: Train on specific waste datasets
- **Announcement Cooldown**: Prevents audio spam

## 📋 Requirements

### System Requirements
- **Python**: 3.8 or higher
- **Operating System**: Windows, macOS, or Linux
- **Camera**: USB webcam or built-in camera
- **Memory**: 4GB+ RAM recommended
- **Storage**: 2GB+ free space

### Hardware Recommendations
- **GPU**: CUDA-compatible GPU for faster processing (optional)
- **Camera**: 720p or higher resolution
- **Audio**: Speakers or headphones for voice feedback

## 🛠️ Installation

### Quick Setup (Recommended)

1. **Clone or Download** the project:
   ```bash
   git clone <repository-url>
   cd BorlaCam
   ```

2. **Run the automated setup**:
   ```bash
   python setup.py
   ```

### Manual Installation

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Download YOLOv8 model** (automatic on first run):
   ```python
   from ultralytics import YOLO
   model = YOLO('yolov8n.pt')
   ```

## 🎮 Usage

### Starting the Application

```bash
python borlacam.py
```

### Controls

| Key | Action |
|-----|--------|
| `q` | Quit application |
| `s` | Toggle sound on/off |
| `+` / `=` | Increase confidence threshold |
| `-` | Decrease confidence threshold |

### Using the System

1. **Position the camera** to have a clear view of the area
2. **Show waste items** to the camera
3. **Listen for audio announcements** of detected waste types
4. **View bounding boxes** and labels on screen
5. **Monitor confidence scores** for detection accuracy

## 🧠 Model Training (Advanced)

### Training Custom Models

For better accuracy on specific waste types, you can train a custom model:

```bash
python train_waste_model.py
```

### Dataset Preparation

1. **Create dataset structure**:
   ```
   datasets/waste_detection/
   ├── images/
   │   ├── train/
   │   ├── val/
   │   └── test/
   └── labels/
       ├── train/
       ├── val/
       └── test/
   ```

2. **Image format**: JPG, PNG (recommended: 640x640)
3. **Label format**: YOLO format (.txt files)

### Recommended Datasets

- **TACO Dataset**: http://tacodataset.org/
- **TrashNet**: https://github.com/garythung/trashnet
- **Roboflow Waste**: https://roboflow.com/

## 📊 Performance Optimization

### For Better Accuracy
- Use **good lighting** conditions
- Ensure **clear object visibility**
- **Hold items steady** for 1-2 seconds
- Position objects **within camera focus range**

### For Better Performance
- Close **unnecessary applications**
- Use **GPU acceleration** if available
- Adjust **confidence threshold** based on needs
- Consider **lower resolution** for faster processing

## 🔧 Configuration

### Adjustable Parameters

In `borlacam.py`, you can modify:

```python
# Detection settings
self.confidence_threshold = 0.5  # Detection confidence (0.1-0.9)
self.announcement_cooldown = 3.0  # Seconds between announcements

# Camera settings
frame_width = 640   # Camera resolution width
frame_height = 480  # Camera resolution height
fps = 30           # Camera frame rate
```

### Adding New Waste Categories

1. **Update waste_colors dictionary**:
   ```python
   self.waste_colors = {
       'new_category': (R, G, B),  # RGB color values
       # ... existing categories
   }
   ```

2. **Update mapping function**:
   ```python
   def map_to_waste_category(self, detected_class):
       waste_mapping = {
           'new_object': 'new_category',
           # ... existing mappings
       }
   ```

## 🐛 Troubleshooting

### Common Issues

**Camera not detected:**
- Check camera permissions
- Ensure camera is not used by other applications
- Try different camera indices (0, 1, 2...)

**Low detection accuracy:**
- Improve lighting conditions
- Clean camera lens
- Adjust confidence threshold
- Consider training custom model

**Audio not working:**
- Check system audio settings
- Install audio drivers
- Use `s` key to toggle sound

**Performance issues:**
- Close unnecessary applications
- Lower camera resolution
- Adjust confidence threshold
- Use GPU acceleration

### Error Messages

**"Could not open camera":**
```bash
# Try different camera index
cap = cv2.VideoCapture(1)  # Instead of 0
```

**"Model loading failed":**
```bash
# Ensure internet connection for model download
pip install --upgrade ultralytics
```

## 📁 Project Structure

```
BorlaCam/
├── borlacam.py              # Main application
├── setup.py                 # Automated setup script
├── train_waste_model.py     # Model training script
├── requirements.txt         # Python dependencies
├── README.md               # This file
├── datasets/               # Training datasets (created by setup)
├── models/                 # Trained models (created by setup)
└── logs/                   # Application logs (created by setup)
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature-name`
3. **Commit changes**: `git commit -am 'Add feature'`
4. **Push branch**: `git push origin feature-name`
5. **Submit pull request**

### Development Guidelines
- Follow PEP 8 style guidelines
- Add comments for complex functions
- Test on multiple operating systems
- Update documentation for new features

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Ultralytics** for the YOLOv8 framework
- **OpenCV** team for computer vision tools
- **TACO Dataset** creators for waste classification data
- **Python community** for excellent libraries

## 📧 Support

For questions, issues, or contributions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review existing documentation

## 🔮 Future Enhancements

- [ ] Mobile application support
- [ ] Cloud-based model training
- [ ] Multi-camera support
- [ ] Database logging of waste statistics
- [ ] Integration with IoT waste bins
- [ ] Real-time analytics dashboard
- [ ] Support for industrial-scale deployment

---

**Built with ❤️ for a cleaner environment 🌍**

*BorlaCam - Making waste sorting smarter, one detection at a time.*