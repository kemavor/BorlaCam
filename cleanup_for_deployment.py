#!/usr/bin/env python3
"""
BorlaCam Deployment Cleanup Script
=================================
Removes unnecessary files and folders for production deployment.
"""

import os
import shutil
import json
from pathlib import Path

def cleanup_for_deployment():
    """Remove development files and optimize for deployment"""
    
    # Files and folders to remove
    cleanup_items = [
        # Development documentation
        'CUSTOM_LABELING_GUIDE.md',
        'DETECTION_TROUBLESHOOTING.md', 
        'FRONTEND_INTEGRATION_GUIDE.md',
        'QUICK_TROUBLESHOOTING.md',
        'REACT_DEV_GUIDE.md',
        'SIMPLE_TRAINING_COMMAND.txt',
        'TRAINING_INSTRUCTIONS.md',
        
        # Development scripts
        'create_training_dataset.py',
        'debug_model.py',
        'examine_dataset.py',
        'reorganize_dataset.py',
        'reorganize_or_dataset.py',
        'integrate_frontend.py',
        'setup_frontend_simple.py',
        'borlacam_react_api.py',  # Old API
        'validate_model.py',
        'quick_validate.py',
        'optimize_confidence_thresholds.py',
        'simple_precision_test.py',
        'flawless_detection.py',
        'custom_labeling_system.py',
        'enhanced_api_with_custom_labels.py',  # Old enhanced API
        'enhanced_api_with_custom_labels_fixed.py',
        'generate_model_graphs.py',
        'enhanced_model_graphs.py',
        'simple_model_graphs.py',
        'fix_opencv.py',
        
        # Training scripts (keep only core)
        'train_manual_fixed.py',
        'train_optimized_yolo.py', 
        'train_working.py',
        # Keep: train_precision_focused.py (main training script)
        
        # Development files
        'borlacam_screenshot_1755375823.jpg',
        'test_detection_image.jpg',
        'test_frontend_connection.html',
        'launch.bat',
        'run_training.bat',
        'nul',
        
        # Cache and temporary files
        '__pycache__',
        '.pytest_cache',
        '*.pyc',
        '*.pyo',
        '*.pyd',
        '.DS_Store',
        'Thumbs.db',
        
        # Development environments
        'venv',
        'cuda_env',
        '.env',  # Keep .env.production instead
        
        # Test results (keep models, remove test images)
        'test_results_best',
        'test_results_extended',
        
        # Logs directory (will be recreated)
        'logs',
        
        # Model graphs (generated files)
        'model_graphs',
        
        # Training runs (keep only the best model)
        # We'll handle this specially to preserve the best model
        
        # Quick optimization folders
        'quick_threshold_optimization',
        
        # Frontend development files
        'front/node_modules',  # Will be reinstalled during build
        'front/.eslintrc.js',
        'front/dist',  # Will be rebuilt
    ]
    
    # Directories to keep only the best model from
    model_dirs_to_cleanup = [
        'training_runs',
        'training_runs_optimized', 
        'waste_training',
        'precision_training'
    ]
    
    print("🧹 Starting BorlaCam deployment cleanup...")
    
    removed_count = 0
    preserved_count = 0
    
    # Remove general cleanup items
    for item in cleanup_items:
        if os.path.exists(item):
            try:
                if os.path.isdir(item):
                    shutil.rmtree(item)
                    print(f"📁 Removed directory: {item}")
                else:
                    os.remove(item)
                    print(f"📄 Removed file: {item}")
                removed_count += 1
            except Exception as e:
                print(f"⚠️  Could not remove {item}: {e}")
        else:
            print(f"✓ Already clean: {item}")
    
    # Handle model directories - keep only best.pt files
    for model_dir in model_dirs_to_cleanup:
        if os.path.exists(model_dir):
            print(f"\n🎯 Processing model directory: {model_dir}")
            
            for root, dirs, files in os.walk(model_dir):
                # Remove everything except best.pt files
                for file in files:
                    file_path = os.path.join(root, file)
                    if file == 'best.pt':
                        print(f"💾 Preserved: {file_path}")
                        preserved_count += 1
                    else:
                        try:
                            os.remove(file_path)
                            removed_count += 1
                        except Exception as e:
                            print(f"⚠️  Could not remove {file_path}: {e}")
                
                # Remove empty directories
                for dir_name in dirs[:]:  # Create a copy to avoid modification during iteration
                    dir_path = os.path.join(root, dir_name)
                    if dir_name != 'weights':  # Keep weights directories
                        try:
                            if os.path.exists(dir_path) and not os.listdir(dir_path):
                                os.rmdir(dir_path)
                                dirs.remove(dir_name)
                        except:
                            pass
    
    # Clean up dataset directories but keep the YAML files
    datasets_dir = 'datasets'
    if os.path.exists(datasets_dir):
        print(f"\n📊 Processing datasets directory...")
        for root, dirs, files in os.walk(datasets_dir):
            for file in files:
                if file.endswith(('.jpg', '.jpeg', '.png', '.txt', '.cache')):
                    file_path = os.path.join(root, file)
                    try:
                        os.remove(file_path)
                        removed_count += 1
                    except Exception as e:
                        print(f"⚠️  Could not remove {file_path}: {e}")
                elif file.endswith('.yaml'):
                    print(f"💾 Preserved dataset config: {file}")
                    preserved_count += 1
    
    # Create essential directories for production
    essential_dirs = ['logs', 'models']
    for dir_name in essential_dirs:
        os.makedirs(dir_name, exist_ok=True)
        print(f"📁 Created essential directory: {dir_name}")
    
    # Create deployment summary
    summary = {
        'cleanup_completed': True,
        'files_removed': removed_count,
        'files_preserved': preserved_count,
        'essential_files': [
            'production_api.py',
            'requirements_production.txt', 
            'Dockerfile',
            'docker-compose.yml',
            '.env.production',
            'train_precision_focused.py',
            'deploy.sh'
        ],
        'model_files_preserved': [],
        'notes': [
            'Removed development files and documentation',
            'Cleaned up training directories, kept best.pt models only',
            'Removed dataset images but kept configuration files',
            'Created essential directories for production',
            'Frontend will be rebuilt during deployment'
        ]
    }
    
    # Find preserved model files
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file == 'best.pt':
                summary['model_files_preserved'].append(os.path.join(root, file))
    
    # Write summary
    with open('deployment_cleanup_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n✅ Cleanup completed!")
    print(f"📊 Summary:")
    print(f"   Files removed: {removed_count}")
    print(f"   Files preserved: {preserved_count}")
    print(f"   Model files preserved: {len(summary['model_files_preserved'])}")
    
    print(f"\n🎯 Ready for deployment!")
    print(f"   Run: ./deploy.sh production")
    print(f"   Or: docker-compose up")
    
    print(f"\n📋 Cleanup summary saved to: deployment_cleanup_summary.json")

if __name__ == "__main__":
    cleanup_for_deployment()