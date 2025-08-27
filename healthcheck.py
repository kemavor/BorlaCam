#!/usr/bin/env python3
"""
Simple health check script for Docker containers
"""
import requests
import sys
import os

def health_check():
    """Check if the API is responding"""
    try:
        port = os.getenv('PORT', '8000')
        response = requests.get(f'http://localhost:{port}/health', timeout=5)
        if response.status_code == 200:
            print("Health check passed")
            return 0
        else:
            print(f"Health check failed with status {response.status_code}")
            return 1
    except Exception as e:
        print(f"Health check failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(health_check())