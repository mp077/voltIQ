import requests
import time
import subprocess
import sys
import os

BASE_URL = 'http://127.0.0.1:5000'

def test_endpoints():
    print("Testing API endpoints...")
    # Health
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=3)
        assert r.status_code == 200, f"Health check failed: {r.status_code}"
        print("✓ Health check OK:", r.json())
    except Exception as e:
        print("✗ Health check failed:", e)
        return False

    # Login admin
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    token = r.json()['token']
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Admin login OK. Role:", r.json()['user']['role'])

    # Login FM
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "fm1", "password": "FM1@pass"})
    assert r.status_code == 200, f"FM login failed: {r.text}"
    print("✓ Facility Manager login OK:", r.json()['user']['username'])

    # Login Consumer
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "consumer1", "password": "Consumer@123"})
    assert r.status_code == 200, f"Consumer login failed: {r.text}"
    print("✓ Consumer login OK:", r.json()['user']['username'])

    # Login Tech
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "tech1", "password": "Tech1@pass"})
    assert r.status_code == 200, f"Tech login failed: {r.text}"
    print("✓ Technician login OK:", r.json()['user']['username'])

    # Dashboard KPIs
    r = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=headers)
    assert r.status_code == 200, f"KPIs failed: {r.text}"
    print("✓ Dashboard KPIs OK:", r.json())

    # Buildings
    r = requests.get(f"{BASE_URL}/api/buildings/", headers=headers)
    assert r.status_code == 200
    print(f"✓ Buildings list OK: {len(r.json())} buildings")

    # Meters
    r = requests.get(f"{BASE_URL}/api/meters/", headers=headers)
    assert r.status_code == 200
    print(f"✓ Meters list OK: {len(r.json())} smart meters")

    # Readings
    r = requests.get(f"{BASE_URL}/api/readings/?limit=5", headers=headers)
    assert r.status_code == 200
    print(f"✓ Readings OK: {len(r.json())} records")

    # Anomalies
    r = requests.get(f"{BASE_URL}/api/anomalies/", headers=headers)
    assert r.status_code == 200
    print(f"✓ Anomalies list OK: {len(r.json())} anomalies")

    # Alerts
    r = requests.get(f"{BASE_URL}/api/alerts/", headers=headers)
    assert r.status_code == 200
    print(f"✓ Alerts list OK: {len(r.json())} alerts")

    # Maintenance
    r = requests.get(f"{BASE_URL}/api/maintenance/", headers=headers)
    assert r.status_code == 200
    print(f"✓ Maintenance tasks OK: {len(r.json())} tasks")

    # Demand Response
    r = requests.get(f"{BASE_URL}/api/demand-response/", headers=headers)
    assert r.status_code == 200
    print(f"✓ Demand Response requests OK: {len(r.json())} events")

    # Forecasting
    r = requests.get(f"{BASE_URL}/api/forecasting/predict", headers=headers)
    assert r.status_code == 200
    print("✓ ML Forecasting OK:", r.json().get('next_day_prediction'))

    # Performance
    r = requests.get(f"{BASE_URL}/api/analytics/performance-metrics", headers=headers)
    assert r.status_code == 200
    print("✓ Performance Metrics OK:", r.json())

    print("\nALL BACKEND API AND ML INTEGRATION TESTS PASSED PERFECTLY!")
    return True

if __name__ == '__main__':
    test_endpoints()
