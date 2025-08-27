#!/usr/bin/env python3
"""
Precision-Focused YOLO Training for BorlaCam
===========================================

Specifically addresses the critical issue:
- Recyclable precision: 0.522 (poor - 48% false positives)
- Model incorrectly classifies organic waste as recyclable

This script implements precision-focused training to ensure:
- Recyclable precision > 0.95 (less than 5% false positives)
- Organic precision maintained > 0.90
- Flawless classification between organic and recyclable
"""

import os
import yaml
import torch
from ultralytics import YOLO
from pathlib import Path
import json
import numpy as np
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PrecisionFocusedTrainer:
    def __init__(self, dataset_path, output_dir="precision_training"):
        self.dataset_path = Path(dataset_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        # Smaller batch size for more stable gradients during precision training
        self.batch_size = 2  
        self.workers = 4
        
        logger.info(f"Precision-focused trainer initialized on: {self.device}")
    
    def create_precision_config(self):
        """
        Create configuration optimized for precision over recall.
        Key focus: Minimize false positives (organic classified as recyclable).
        """
        config = {
            'model': 'yolov8n.pt',
            'data': str(self.dataset_path / 'dataset.yaml'),
            
            # Training parameters for precision
            'epochs': 200,              # More epochs for convergence
            'batch': self.batch_size,   # Small batch for stable gradients
            'imgsz': 640,
            'device': self.device,
            
            # Optimizer - Conservative settings for precision
            'optimizer': 'AdamW',
            'lr0': 0.0005,              # Lower learning rate for precision
            'lrf': 0.001,               # Very low final LR
            'momentum': 0.937,
            'weight_decay': 0.001,      # Higher weight decay to prevent overfitting
            
            # Learning rate scheduling
            'warmup_epochs': 10,        # Longer warmup for stability
            'warmup_momentum': 0.8,
            'warmup_bias_lr': 0.05,     # Lower warmup bias LR
            
            # Loss function weights - PRECISION FOCUSED
            'cls': 2.0,                 # Much higher classification loss weight
            'box': 5.0,                 # Lower box loss to focus on classification
            'dfl': 1.0,                 # Standard distribution focal loss
            
            # Precision-focused augmentation (minimal to avoid confusion)
            'hsv_h': 0.005,             # Minimal hue changes
            'hsv_s': 0.3,               # Moderate saturation
            'hsv_v': 0.2,               # Moderate value changes
            'degrees': 5.0,             # Minimal rotation
            'translate': 0.05,          # Minimal translation
            'scale': 0.95,              # Minimal scaling
            'shear': 1.0,               # Minimal shearing
            'perspective': 0.0,         # No perspective distortion
            'flipud': 0.0,              # No vertical flip
            'fliplr': 0.3,              # Reduced horizontal flip
            'mosaic': 0.5,              # Reduced mosaic for precision
            'mixup': 0.0,               # No mixup to avoid confusion
            'copy_paste': 0.1,          # Minimal copy-paste
            
            # Validation and monitoring
            'val': True,
            'save': True,
            'save_period': 5,           # Save more frequently
            'patience': 30,             # Higher patience for precision training
            'verbose': True,
            
            # Performance settings
            'workers': self.workers,
            'amp': True,                # Mixed precision for speed
            'deterministic': True,      # Deterministic for reproducibility
            'single_cls': False,
            
            # Inference settings
            'half': False,
            'dnn': False,
        }
        
        return config
    
    def create_focal_loss_config(self):
        """
        Create configuration using focal loss to address class imbalance
        while maintaining high precision.
        """
        config = self.create_precision_config()
        
        # Focal loss parameters (handled by YOLOv8 internally)
        config.update({
            'fl_gamma': 2.0,            # Focal loss gamma (if supported)
            'cls': 3.0,                 # Even higher classification weight
            'box': 4.0,                 # Lower box weight
            
            # More conservative augmentation for focal loss
            'degrees': 3.0,
            'translate': 0.03,
            'scale': 0.98,
            'mosaic': 0.3,
            
            # Longer training for focal loss convergence
            'epochs': 250,
            'patience': 40,
        })
        
        return config
    
    def create_high_confidence_config(self):
        """
        Create configuration that trains the model to be more confident
        in its predictions, reducing false positives.
        """
        config = self.create_precision_config()
        
        config.update({
            # Very conservative training
            'lr0': 0.0003,              # Even lower learning rate
            'lrf': 0.0001,              # Very low final LR
            'weight_decay': 0.002,      # Higher regularization
            
            # Minimal augmentation for high confidence
            'hsv_h': 0.002,
            'hsv_s': 0.1,
            'hsv_v': 0.1,
            'degrees': 2.0,
            'translate': 0.02,
            'scale': 0.99,
            'shear': 0.5,
            'fliplr': 0.2,
            'mosaic': 0.2,
            'mixup': 0.0,
            'copy_paste': 0.0,
            
            # Maximum classification focus
            'cls': 5.0,                 # Maximum classification weight
            'box': 3.0,                 # Minimum box weight
            'dfl': 0.5,                 # Reduced distribution focal loss
            
            'epochs': 300,              # Long training for high confidence
            'patience': 50,
        })
        
        return config
    
    def run_precision_training(self):
        """
        Run comprehensive precision-focused training with multiple strategies.
        """
        logger.info("=" * 60)
        logger.info("PRECISION-FOCUSED TRAINING FOR BORLACAM")
        logger.info("Objective: Eliminate organic→recyclable misclassification")
        logger.info("=" * 60)
        
        results = {}
        
        # Strategy 1: Precision-focused training
        logger.info("\n" + "="*50)
        logger.info("Strategy 1: Precision-Focused Training")
        logger.info("="*50)
        
        config1 = self.create_precision_config()
        config1['project'] = str(self.output_dir)
        config1['name'] = 'precision_focused'
        
        with open(self.output_dir / 'config_precision.json', 'w') as f:
            json.dump(config1, f, indent=2)
        
        model1 = YOLO('yolov8n.pt')
        
        try:
            logger.info("Starting precision-focused training...")
            results['precision_focused'] = model1.train(**config1)
            logger.info("✓ Precision-focused training completed!")
        except Exception as e:
            logger.error(f"✗ Precision-focused training failed: {e}")
            results['precision_focused'] = None
        
        # Strategy 2: Focal loss training
        logger.info("\n" + "="*50)
        logger.info("Strategy 2: Focal Loss Training")
        logger.info("="*50)
        
        config2 = self.create_focal_loss_config()
        config2['project'] = str(self.output_dir)
        config2['name'] = 'focal_loss'
        
        with open(self.output_dir / 'config_focal.json', 'w') as f:
            json.dump(config2, f, indent=2)
        
        model2 = YOLO('yolov8n.pt')
        
        try:
            logger.info("Starting focal loss training...")
            results['focal_loss'] = model2.train(**config2)
            logger.info("✓ Focal loss training completed!")
        except Exception as e:
            logger.error(f"✗ Focal loss training failed: {e}")
            results['focal_loss'] = None
        
        # Strategy 3: High confidence training
        logger.info("\n" + "="*50)
        logger.info("Strategy 3: High Confidence Training")
        logger.info("="*50)
        
        config3 = self.create_high_confidence_config()
        config3['project'] = str(self.output_dir)
        config3['name'] = 'high_confidence'
        
        with open(self.output_dir / 'config_high_confidence.json', 'w') as f:
            json.dump(config3, f, indent=2)
        
        model3 = YOLO('yolov8n.pt')
        
        try:
            logger.info("Starting high confidence training...")
            results['high_confidence'] = model3.train(**config3)
            logger.info("✓ High confidence training completed!")
        except Exception as e:
            logger.error(f"✗ High confidence training failed: {e}")
            results['high_confidence'] = None
        
        # Generate summary report
        self.generate_precision_report(results)
        
        return results
    
    def generate_precision_report(self, results):
        """
        Generate a report focused on precision metrics.
        """
        report = {
            'objective': 'Eliminate organic→recyclable misclassification',
            'target_metrics': {
                'recyclable_precision': '>0.95',
                'organic_precision': '>0.90',
                'overall_accuracy': '>0.92'
            },
            'training_strategies': {
                'precision_focused': {
                    'completed': results.get('precision_focused') is not None,
                    'description': 'High classification loss weight, minimal augmentation'
                },
                'focal_loss': {
                    'completed': results.get('focal_loss') is not None,
                    'description': 'Focal loss to handle class imbalance'
                },
                'high_confidence': {
                    'completed': results.get('high_confidence') is not None,
                    'description': 'Ultra-conservative training for high confidence'
                }
            },
            'current_problem': {
                'recyclable_precision': 0.522,
                'false_positive_rate': 0.478,
                'issue': '48% of recyclable detections are actually organic waste'
            },
            'next_steps': [
                '1. Validate all three models on test set',
                '2. Compare precision metrics for each strategy',
                '3. Select model with recyclable precision >0.95',
                '4. Test confidence thresholds for optimal performance',
                '5. Deploy best model with appropriate thresholds'
            ],
            'deployment_thresholds': {
                'recommendation': 'Use higher confidence threshold for recyclable class',
                'suggested_conf_organic': '0.4-0.6',
                'suggested_conf_recyclable': '0.7-0.8',
                'rationale': 'Higher threshold reduces false positives'
            }
        }
        
        report_path = self.output_dir / 'precision_training_report.json'
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info("=" * 60)
        logger.info("PRECISION TRAINING SUMMARY")
        logger.info("=" * 60)
        logger.info("Problem: 48% false positive rate for recyclables")
        logger.info("Solution: Precision-focused training strategies")
        logger.info(f"Strategies completed: {sum([r is not None for r in results.values()])}/3")
        logger.info(f"Report saved: {report_path}")
        logger.info("=" * 60)

def main():
    """
    Main function for precision-focused training.
    """
    dataset_path = "datasets/waste_mx450_clean"
    
    if not Path(dataset_path).exists():
        logger.error(f"Dataset not found: {dataset_path}")
        return
    
    trainer = PrecisionFocusedTrainer(dataset_path)
    results = trainer.run_precision_training()
    
    logger.info("Precision training pipeline completed!")
    logger.info("Next: Validate models and select best performer")

if __name__ == "__main__":
    main()