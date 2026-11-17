from app import app
import json

def run_tests():
    client = app.test_client()
    print("Running Flask In-Process Test Client Suite...")

    # Health
    r = client.get('/api/health')
    assert r.status_code == 200, f"Health check failed: {r.data}"
    print("✓ /api/health:", r.get_json())

    # Login Admin
    r = client.post('/api/auth/login', json={"username": "admin", "password": "Admin@123"})
    assert r.status_code == 200, f"Admin login failed: {r.data}"
    token = r.get_json()['token']
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Admin Login OK. Role:", r.get_json()['user']['role'])

    # Login Facility Manager
    r = client.post('/api/auth/login', json={"username": "fm1", "password": "FM1@pass"})
    assert r.status_code == 200
    print("✓ FM Login OK:", r.get_json()['user']['username'])

    # Login Consumer
    r = client.post('/api/auth/login', json={"username": "consumer1", "password": "Consumer@123"})
    assert r.status_code == 200
    print("✓ Consumer Login OK:", r.get_json()['user']['username'])

    # Login Technician
    r = client.post('/api/auth/login', json={"username": "tech1", "password": "Tech1@pass"})
    assert r.status_code == 200
    print("✓ Technician Login OK:", r.get_json()['user']['username'])

    # Dashboard KPIs
    r = client.get('/api/dashboard/kpis', headers=headers)
    assert r.status_code == 200, f"KPIs failed: {r.data}"
    print("✓ Dashboard KPIs:", r.get_json())

    # Dashboard Energy Chart
    r = client.get('/api/dashboard/energy-chart?days=7', headers=headers)
    assert r.status_code == 200
    print(f"✓ Energy Chart OK: {len(r.get_json())} data points")

    # Buildings
    r = client.get('/api/buildings/', headers=headers)
    assert r.status_code == 200
    print(f"✓ Buildings: {len(r.get_json())} buildings listed")

    # Consumers
    r = client.get('/api/consumers/', headers=headers)
    assert r.status_code == 200
    print(f"✓ Consumers: {len(r.get_json())} consumers listed")

    # Smart Meters
    r = client.get('/api/meters/', headers=headers)
    assert r.status_code == 200
    print(f"✓ Meters: {len(r.get_json())} meters listed")

    # Readings
    r = client.get('/api/readings/?limit=5', headers=headers)
    assert r.status_code == 200
    print(f"✓ Readings: {len(r.get_json())} readings retrieved")

    # Anomalies
    r = client.get('/api/anomalies/', headers=headers)
    assert r.status_code == 200
    print(f"✓ Anomalies: {len(r.get_json())} anomaly events recorded")

    # Alerts
    r = client.get('/api/alerts/', headers=headers)
    assert r.status_code == 200
    print(f"✓ Alerts: {len(r.get_json())} alerts listed")

    # Maintenance
    r = client.get('/api/maintenance/', headers=headers)
    assert r.status_code == 200
    print(f"✓ Maintenance: {len(r.get_json())} work orders listed")

    # Demand Response
    r = client.get('/api/demand-response/', headers=headers)
    assert r.status_code == 200
    print(f"✓ Demand Response: {len(r.get_json())} DR events listed")

    # Analytics Performance Metrics
    r = client.get('/api/analytics/performance-metrics', headers=headers)
    assert r.status_code == 200
    print("✓ Performance Metrics:", r.get_json())

    # ML Forecast Prediction
    r = client.get('/api/forecasting/predict', headers=headers)
    assert r.status_code == 200
    print("✓ ML Forecasting Predict:", r.get_json().get('next_day_prediction'))

    # System Settings
    r = client.get('/api/settings/', headers=headers)
    assert r.status_code == 200
    print(f"✓ System Settings OK: {len(r.get_json().get('settings', {}))} settings keys")

    print("\n=======================================================")
    print("ALL 16 BACKEND API & ML TEST SUITES VERIFIED AND PASSED!")
    print("=======================================================")

if __name__ == '__main__':
    run_tests()
