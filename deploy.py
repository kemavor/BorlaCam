#!/usr/bin/env python3
"""
BorlaCam Windows Deployment Script
=================================
Windows-compatible deployment script for BorlaCam production setup.
"""

import os
import sys
import subprocess
import shutil
import time
import requests
from pathlib import Path
import json

def run_command(cmd, check=True, shell=True):
    """Run a command and return the result"""
    try:
        print(f"Running: {cmd}")
        result = subprocess.run(cmd, shell=shell, check=check, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        return result
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {e}")
        if e.stderr:
            print(f"Error: {e.stderr}")
        if check:
            sys.exit(1)
        return e

def check_prerequisites():
    """Check if required tools are installed"""
    print("🔍 Checking prerequisites...")
    
    # Check Docker
    try:
        result = run_command("docker --version", check=False)
        if result.returncode != 0:
            print("❌ Docker is not installed or not in PATH")
            print("Please install Docker Desktop: https://www.docker.com/products/docker-desktop")
            return False
    except FileNotFoundError:
        print("❌ Docker is not installed")
        return False
    
    # Check Docker Compose
    try:
        result = run_command("docker-compose --version", check=False)
        if result.returncode != 0:
            print("❌ Docker Compose is not installed")
            return False
    except FileNotFoundError:
        print("❌ Docker Compose is not installed")
        return False
    
    print("✅ Prerequisites check passed")
    return True

def check_model_files():
    """Check if model files exist"""
    print("🎯 Checking for model files...")
    
    model_paths = [
        "training_runs/borlacam_optimized/weights/best.pt",
        "waste_training/mx450_waste_model/weights/best.pt", 
        "precision_training/precision_focused/weights/best.pt"
    ]
    
    found_model = False
    for model_path in model_paths:
        if Path(model_path).exists():
            print(f"✅ Found model: {model_path}")
            found_model = True
            break
    
    if not found_model:
        print("❌ No trained model found")
        print("Please ensure at least one model file exists:")
        for path in model_paths:
            print(f"  - {path}")
        return False
    
    return True

def cleanup_previous_deployment():
    """Clean up previous deployment"""
    print("🧹 Cleaning up previous deployment...")
    
    # Stop running containers
    run_command("docker-compose down", check=False)
    
    # Clean up frontend build
    if Path("front/dist").exists():
        shutil.rmtree("front/dist")
        print("Removed previous frontend build")
    
    # Clean up Docker
    run_command("docker system prune -f", check=False)
    
    print("✅ Cleanup completed")

def build_frontend():
    """Build React frontend"""
    print("📦 Building React frontend...")
    
    if not Path("front").exists():
        print("❌ Frontend directory not found")
        return False
    
    os.chdir("front")
    
    try:
        # Install dependencies if needed
        if not Path("node_modules").exists():
            print("Installing frontend dependencies...")
            result = run_command("npm install")
            if result.returncode != 0:
                print("❌ Failed to install frontend dependencies")
                return False
        
        # Build for production
        print("Building frontend for production...")
        result = run_command("npm run build")
        if result.returncode != 0:
            print("❌ Frontend build failed")
            return False
        
        if not Path("dist").exists():
            print("❌ Frontend build directory not created")
            return False
        
        print("✅ Frontend built successfully")
        return True
        
    finally:
        os.chdir("..")

def setup_environment():
    """Setup production environment"""
    print("⚙️ Setting up environment...")
    
    # Copy production environment file
    if Path(".env.production").exists():
        shutil.copy(".env.production", ".env")
        print("Using production environment configuration")
    else:
        # Create basic .env file
        with open(".env", "w") as f:
            f.write("FLASK_ENV=production\n")
            f.write("PORT=8000\n")
        print("Created basic environment configuration")
    
    # Create necessary directories
    for directory in ["logs", "models"]:
        Path(directory).mkdir(exist_ok=True)
        print(f"Created directory: {directory}")
    
    print("✅ Environment setup completed")

def copy_model_files():
    """Copy best available model to models directory"""
    print("📋 Copying model files...")
    
    model_paths = [
        "training_runs/borlacam_optimized/weights/best.pt",
        "waste_training/mx450_waste_model/weights/best.pt",
        "precision_training/precision_focused/weights/best.pt"
    ]
    
    for model_path in model_paths:
        if Path(model_path).exists():
            shutil.copy(model_path, "models/best.pt")
            print(f"Copied model from: {model_path}")
            return True
    
    print("❌ No model files found to copy")
    return False

def build_docker_containers():
    """Build Docker containers"""
    print("🐳 Building Docker containers...")
    
    result = run_command("docker-compose build --no-cache")
    if result.returncode != 0:
        print("❌ Docker build failed")
        return False
    
    print("✅ Docker containers built successfully")
    return True

def start_services():
    """Start the services"""
    print("🔄 Starting services...")
    
    result = run_command("docker-compose up -d")
    if result.returncode != 0:
        print("❌ Failed to start services")
        return False
    
    print("✅ Services started successfully")
    return True

def health_check():
    """Perform health check"""
    print("🏥 Performing health check...")
    
    max_attempts = 12
    for attempt in range(1, max_attempts + 1):
        try:
            response = requests.get("http://localhost:8000/health", timeout=10)
            if response.status_code == 200:
                print("✅ API is healthy")
                
                # Get detailed status
                try:
                    status_response = requests.get("http://localhost:8000/api/status", timeout=5)
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        print(f"Model classes: {status_data.get('model_classes', [])}")
                        print(f"Device: {status_data.get('device', 'unknown')}")
                        if status_data.get('gpu_name'):
                            print(f"GPU: {status_data['gpu_name']}")
                except:
                    pass
                
                return True
            
        except requests.RequestException:
            pass
        
        if attempt == max_attempts:
            print("❌ Health check failed")
            print("Showing container logs:")
            run_command("docker-compose logs borlacam-api", check=False)
            return False
        
        print(f"⏳ Waiting for API to start... ({attempt}/{max_attempts})")
        time.sleep(5)
    
    return False

def display_final_status():
    """Display final deployment status"""
    print("\n" + "="*60)
    print("🎉 BorlaCam deployment completed successfully!")
    print("="*60)
    print()
    print("📊 Service Status:")
    print("  API: http://localhost:8000")
    print("  Health Check: http://localhost:8000/health") 
    print("  Status: http://localhost:8000/api/status")
    print()
    print("🔧 Useful Commands:")
    print("  View logs: docker-compose logs -f borlacam-api")
    print("  Stop services: docker-compose down")
    print("  Restart: docker-compose restart")
    print("  Monitor: python monitoring.py --once")
    print()
    print("🚀 BorlaCam is ready for use!")
    print("="*60)

def main():
    """Main deployment function"""
    print("🚀 Starting BorlaCam deployment...")
    print(f"Working directory: {os.getcwd()}")
    print()
    
    # Parse arguments
    deployment_type = "production"
    build_frontend_flag = True
    restart_services_flag = True
    
    if len(sys.argv) > 1:
        deployment_type = sys.argv[1]
    if len(sys.argv) > 2:
        build_frontend_flag = sys.argv[2].lower() == "true"
    if len(sys.argv) > 3:
        restart_services_flag = sys.argv[3].lower() == "true"
    
    print(f"Deployment Configuration:")
    print(f"  Type: {deployment_type}")
    print(f"  Build Frontend: {build_frontend_flag}")
    print(f"  Restart Services: {restart_services_flag}")
    print()
    
    # Deployment steps
    steps = [
        ("Checking prerequisites", check_prerequisites),
        ("Checking model files", check_model_files),
        ("Cleaning up previous deployment", cleanup_previous_deployment),
        ("Setting up environment", setup_environment),
        ("Copying model files", copy_model_files),
    ]
    
    if build_frontend_flag:
        steps.append(("Building frontend", build_frontend))
    
    steps.extend([
        ("Building Docker containers", build_docker_containers),
    ])
    
    if restart_services_flag:
        steps.extend([
            ("Starting services", start_services),
            ("Performing health check", health_check),
        ])
    
    # Execute deployment steps
    for step_name, step_function in steps:
        print(f"\n📋 {step_name}...")
        if not step_function():
            print(f"❌ Deployment failed at step: {step_name}")
            sys.exit(1)
    
    # Display final status
    if restart_services_flag:
        display_final_status()
    else:
        print("\n✅ Docker containers built successfully!")
        print("Run 'docker-compose up -d' to start the services")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Deployment cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)