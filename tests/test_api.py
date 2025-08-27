#!/usr/bin/env python3
"""
Basic API tests for BorlaCam
"""

import pytest
import requests
import time
import threading
from production_api import app


@pytest.fixture
def client():
    """Create a test client for the Flask app"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    """Test the health endpoint"""
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json['status'] == 'healthy'


def test_status_endpoint(client):
    """Test the status endpoint"""
    response = client.get('/api/status')
    assert response.status_code == 200
    data = response.json
    assert 'model_loaded' in data
    assert 'device' in data
    assert 'classes' in data


def test_predict_endpoint_no_image(client):
    """Test predict endpoint without image"""
    response = client.post('/api/predict', json={})
    assert response.status_code == 400


def test_predict_endpoint_invalid_image(client):
    """Test predict endpoint with invalid image data"""
    response = client.post('/api/predict', json={
        'image': 'invalid_base64'
    })
    assert response.status_code == 400


def test_cors_headers(client):
    """Test CORS headers are present"""
    response = client.options('/api/predict')
    assert response.status_code == 200
    assert 'Access-Control-Allow-Origin' in response.headers


if __name__ == '__main__':
    pytest.main([__file__])