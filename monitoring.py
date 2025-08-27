#!/usr/bin/env python3
"""
BorlaCam Production Monitoring System
===================================
Provides health checks, performance monitoring, and alerting.
"""

import time
import requests
import psutil
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/monitoring.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('BorlaCam-Monitor')

class BorlaCamMonitor:
    def __init__(self, api_url='http://localhost:8000'):
        self.api_url = api_url
        self.metrics_file = 'logs/metrics.json'
        self.alert_file = 'logs/alerts.json'
        self.health_history = []
        self.performance_history = []
        
    def check_health(self):
        """Check API health status"""
        try:
            response = requests.get(f'{self.api_url}/health', timeout=10)
            
            health_data = {
                'timestamp': time.time(),
                'status': 'healthy' if response.status_code == 200 else 'unhealthy',
                'response_time_ms': response.elapsed.total_seconds() * 1000,
                'status_code': response.status_code,
                'details': response.json() if response.status_code == 200 else None
            }
            
            self.health_history.append(health_data)
            # Keep only last 100 entries
            if len(self.health_history) > 100:
                self.health_history.pop(0)
                
            return health_data
            
        except requests.RequestException as e:
            health_data = {
                'timestamp': time.time(),
                'status': 'error',
                'error': str(e),
                'response_time_ms': None
            }
            self.health_history.append(health_data)
            logger.error(f"Health check failed: {e}")
            return health_data
    
    def check_performance(self):
        """Check system performance metrics"""
        try:
            # System metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Test API performance
            start_time = time.time()
            try:
                test_response = requests.get(f'{self.api_url}/api/status', timeout=10)
                api_response_time = (time.time() - start_time) * 1000
                api_status = test_response.status_code == 200
            except:
                api_response_time = None
                api_status = False
            
            performance_data = {
                'timestamp': time.time(),
                'system': {
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory.percent,
                    'memory_available_gb': memory.available / (1024**3),
                    'disk_percent': disk.percent,
                    'disk_free_gb': disk.free / (1024**3)
                },
                'api': {
                    'status': api_status,
                    'response_time_ms': api_response_time
                }
            }
            
            self.performance_history.append(performance_data)
            # Keep only last 100 entries
            if len(self.performance_history) > 100:
                self.performance_history.pop(0)
                
            return performance_data
            
        except Exception as e:
            logger.error(f"Performance check failed: {e}")
            return None
    
    def check_alerts(self, health_data, performance_data):
        """Check for alert conditions"""
        alerts = []
        current_time = time.time()
        
        # Health alerts
        if health_data['status'] != 'healthy':
            alerts.append({
                'type': 'health',
                'level': 'critical',
                'message': f"API is {health_data['status']}",
                'timestamp': current_time
            })
        
        # Performance alerts
        if performance_data:
            system = performance_data['system']
            
            if system['cpu_percent'] > 90:
                alerts.append({
                    'type': 'performance',
                    'level': 'warning',
                    'message': f"High CPU usage: {system['cpu_percent']:.1f}%",
                    'timestamp': current_time
                })
            
            if system['memory_percent'] > 85:
                alerts.append({
                    'type': 'performance', 
                    'level': 'warning',
                    'message': f"High memory usage: {system['memory_percent']:.1f}%",
                    'timestamp': current_time
                })
            
            if system['disk_percent'] > 90:
                alerts.append({
                    'type': 'storage',
                    'level': 'critical',
                    'message': f"Low disk space: {system['disk_percent']:.1f}% used",
                    'timestamp': current_time
                })
            
            if performance_data['api']['response_time_ms'] and performance_data['api']['response_time_ms'] > 5000:
                alerts.append({
                    'type': 'performance',
                    'level': 'warning', 
                    'message': f"Slow API response: {performance_data['api']['response_time_ms']:.0f}ms",
                    'timestamp': current_time
                })
        
        # Log alerts
        for alert in alerts:
            if alert['level'] == 'critical':
                logger.error(f"CRITICAL ALERT: {alert['message']}")
            else:
                logger.warning(f"WARNING ALERT: {alert['message']}")
        
        return alerts
    
    def save_metrics(self):
        """Save metrics to file"""
        try:
            metrics = {
                'last_updated': time.time(),
                'health_history': self.health_history[-10:],  # Last 10 entries
                'performance_history': self.performance_history[-10:],  # Last 10 entries
                'summary': self.get_summary()
            }
            
            Path('logs').mkdir(exist_ok=True)
            with open(self.metrics_file, 'w') as f:
                json.dump(metrics, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to save metrics: {e}")
    
    def get_summary(self):
        """Get monitoring summary"""
        if not self.health_history or not self.performance_history:
            return {}
        
        # Health summary (last hour)
        recent_health = [h for h in self.health_history if h['timestamp'] > time.time() - 3600]
        healthy_count = sum(1 for h in recent_health if h['status'] == 'healthy')
        uptime_percent = (healthy_count / len(recent_health) * 100) if recent_health else 0
        
        # Performance summary (last hour)
        recent_perf = [p for p in self.performance_history if p['timestamp'] > time.time() - 3600]
        avg_cpu = sum(p['system']['cpu_percent'] for p in recent_perf) / len(recent_perf) if recent_perf else 0
        avg_memory = sum(p['system']['memory_percent'] for p in recent_perf) / len(recent_perf) if recent_perf else 0
        
        # API response times
        api_times = [p['api']['response_time_ms'] for p in recent_perf if p['api']['response_time_ms']]
        avg_response_time = sum(api_times) / len(api_times) if api_times else 0
        
        return {
            'uptime_percent_1h': round(uptime_percent, 2),
            'avg_cpu_percent_1h': round(avg_cpu, 2),
            'avg_memory_percent_1h': round(avg_memory, 2),
            'avg_response_time_ms_1h': round(avg_response_time, 2),
            'total_health_checks': len(self.health_history),
            'total_performance_checks': len(self.performance_history)
        }
    
    def run_monitoring_cycle(self):
        """Run one complete monitoring cycle"""
        logger.info("Running monitoring cycle...")
        
        # Check health and performance
        health_data = self.check_health()
        performance_data = self.check_performance()
        
        # Check for alerts
        alerts = self.check_alerts(health_data, performance_data)
        
        # Save metrics
        self.save_metrics()
        
        # Log summary
        summary = self.get_summary()
        logger.info(f"Monitoring cycle complete. Uptime: {summary.get('uptime_percent_1h', 0):.1f}%, "
                   f"Avg Response: {summary.get('avg_response_time_ms_1h', 0):.0f}ms")
        
        return {
            'health': health_data,
            'performance': performance_data,
            'alerts': alerts,
            'summary': summary
        }
    
    def run_continuous_monitoring(self, interval=300):  # 5 minutes
        """Run continuous monitoring"""
        logger.info(f"Starting continuous monitoring (interval: {interval}s)")
        
        try:
            while True:
                self.run_monitoring_cycle()
                time.sleep(interval)
                
        except KeyboardInterrupt:
            logger.info("Monitoring stopped by user")
        except Exception as e:
            logger.error(f"Monitoring error: {e}")

def main():
    """Main monitoring function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='BorlaCam Production Monitoring')
    parser.add_argument('--url', default='http://localhost:8000', help='API URL to monitor')
    parser.add_argument('--interval', type=int, default=300, help='Monitoring interval in seconds')
    parser.add_argument('--once', action='store_true', help='Run once instead of continuously')
    
    args = parser.parse_args()
    
    monitor = BorlaCamMonitor(api_url=args.url)
    
    if args.once:
        result = monitor.run_monitoring_cycle()
        print(json.dumps(result, indent=2))
    else:
        monitor.run_continuous_monitoring(interval=args.interval)

if __name__ == '__main__':
    main()