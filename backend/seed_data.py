import os
import random
import bcrypt
from datetime import datetime, timedelta
import pandas as pd

from database import init_db, get_db
from ml.data_simulator import simulate_reading
from ml.anomaly_detector import AnomalyDetector
from ml.forecaster import EnergyForecaster

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def seed():
    print("Initializing clean database...")
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    # Clear existing data
    tables = [
        "notifications", "system_settings", "energy_forecasts",
        "demand_response_acknowledgements", "demand_response_requests",
        "maintenance_tasks", "alerts", "anomalies", "energy_readings",
        "meters", "consumers", "buildings", "tariff_categories", "users"
    ]
    for t in tables:
        cursor.execute(f"DELETE FROM {t}")
    conn.commit()

    print("Seeding Users...")
    users_data = [
        # Admin
        ('admin', 'admin@energyiq.com', hash_pw('Admin@123'), 'admin', 'System Administrator', '+1-555-0100'),
        # Facility Managers
        ('fm1', 'fm1@energyiq.com', hash_pw('FM1@pass'), 'facility_manager', 'David Miller (Alpha/Beta)', '+1-555-0101'),
        ('fm2', 'fm2@energyiq.com', hash_pw('FM2@pass'), 'facility_manager', 'Sarah Connor (Gamma/Delta)', '+1-555-0102'),
        # Technicians
        ('tech1', 'tech1@energyiq.com', hash_pw('Tech1@pass'), 'technician', 'Alex Rivera (HVAC Tech)', '+1-555-0201'),
        ('tech2', 'tech2@energyiq.com', hash_pw('Tech2@pass'), 'technician', 'Marcus Vance (Electrical Tech)', '+1-555-0202'),
        ('tech3', 'tech3@energyiq.com', hash_pw('Tech3@pass'), 'technician', 'Elena Rostova (Meter Specialist)', '+1-555-0203'),
    ]

    # 10 Consumers
    consumer_names = [
        "Robert Chen", "Emily Watson", "Apex Logistics", "Nova Software",
        "Pinnacle Retail", "Horizon Labs", "Summit Healthcare", "Greenfield Apts",
        "Nexus Media", "Vanguard Manufacturing"
    ]
    for i, name in enumerate(consumer_names, 1):
        username = f"consumer{i}"
        email = f"consumer{i}@energyiq.com"
        users_data.append((username, email, hash_pw('Consumer@123'), 'consumer', name, f'+1-555-030{i:02d}'))

    cursor.executemany("""
        INSERT INTO users (username, email, password_hash, role, full_name, contact)
        VALUES (?, ?, ?, ?, ?, ?)
    """, users_data)
    conn.commit()

    # Query back users for IDs
    admin_id = cursor.execute("SELECT id FROM users WHERE username='admin'").fetchone()[0]
    fm1_id = cursor.execute("SELECT id FROM users WHERE username='fm1'").fetchone()[0]
    fm2_id = cursor.execute("SELECT id FROM users WHERE username='fm2'").fetchone()[0]
    tech_ids = [r[0] for r in cursor.execute("SELECT id FROM users WHERE role='technician' ORDER BY id").fetchall()]
    consumer_user_ids = [r[0] for r in cursor.execute("SELECT id FROM users WHERE role='consumer' ORDER BY id").fetchall()]

    print("Seeding Tariff Categories...")
    tariffs = [
        ('Domestic Standard', 'Residential standard tiered tariff', 0.14, 0.22, 0.08),
        ('Commercial General', 'Commercial grade power supply', 0.18, 0.28, 0.11),
        ('Industrial High-Load', 'Heavy 3-phase industrial power supply', 0.12, 0.20, 0.07),
        ('Peak Flex Dynamic', 'Time-of-use variable demand response tariff', 0.16, 0.32, 0.09),
    ]
    cursor.executemany("""
        INSERT INTO tariff_categories (name, description, rate_per_kwh, peak_rate, off_peak_rate)
        VALUES (?, ?, ?, ?, ?)
    """, tariffs)
    conn.commit()
    tariff_ids = [r[0] for r in cursor.execute("SELECT id FROM tariff_categories ORDER BY id").fetchall()]

    print("Seeding Buildings...")
    buildings_data = [
        ('Alpha Corporate Tower', '100 Innovation Way, Financial District', 'Office', 24, 45000.0, fm1_id),
        ('Beta Residential Complex', '45 Green Park Ave, Uptown', 'Residential', 14, 28000.0, fm1_id),
        ('Gamma Industrial Plant', '88 Logistics Parkway, East Industrial Zone', 'Industrial', 3, 75000.0, fm2_id),
        ('Delta Commercial Mall', '12 Retail Boulevard, Downtown Central', 'Commercial', 5, 52000.0, fm2_id),
    ]
    cursor.executemany("""
        INSERT INTO buildings (name, location, building_type, floor_count, total_area, facility_manager_id)
        VALUES (?, ?, ?, ?, ?, ?)
    """, buildings_data)
    conn.commit()
    building_ids = [r[0] for r in cursor.execute("SELECT id FROM buildings ORDER BY id").fetchall()]

    print("Seeding Consumers...")
    for i, user_id in enumerate(consumer_user_ids, 1):
        b_id = building_ids[(i - 1) % len(building_ids)]
        t_id = tariff_ids[(i - 1) % len(tariff_ids)]
        cursor.execute("""
            INSERT INTO consumers (user_id, name, email, contact, assigned_building_id, tariff_category_id, consumer_code)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, consumer_names[i - 1], f"consumer{i}@energyiq.com", f"+1-555-030{i:02d}", b_id, t_id, f"CNS-{1000 + i}"))
    conn.commit()
    consumer_ids = [r[0] for r in cursor.execute("SELECT id FROM consumers ORDER BY id").fetchall()]

    print("Seeding Smart Meters...")
    meter_types = ['Three-Phase Smart', 'Single-Phase Smart', 'IoT Submeter', 'Industrial AMR Meter']
    meters_data = []
    for i in range(1, 11):
        b_id = building_ids[(i - 1) % len(building_ids)]
        c_id = consumer_ids[i - 1]
        m_type = meter_types[(i - 1) % len(meter_types)]
        t_id = tariff_ids[(i - 1) % len(tariff_ids)]
        status = 'active' if i != 9 else 'inactive'
        install_date = (datetime.now() - timedelta(days=180 + i * 15)).strftime('%Y-%m-%d')
        meters_data.append((f"MTR-2024-{100 + i}", b_id, c_id, m_type, install_date, status, t_id))

    cursor.executemany("""
        INSERT INTO meters (meter_code, building_id, consumer_id, meter_type, installation_date, status, tariff_category_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, meters_data)
    conn.commit()

    meters = cursor.execute("""
        SELECT m.id, m.building_id, m.meter_code, b.building_type
        FROM meters m
        JOIN buildings b ON m.building_id = b.id
        WHERE m.status = 'active'
    """).fetchall()

    print("Simulating 30 days of hourly energy readings...")
    now = datetime.now()
    readings = []
    # 720 hours = 30 days
    for meter in meters:
        m_id, b_id, m_code, b_type = meter[0], meter[1], meter[2], meter[3]
        for h in range(720, 0, -1):
            ts = now - timedelta(hours=h)
            # 4% chance of anomaly
            inject = (random.random() < 0.04)
            r = simulate_reading({'id': m_id, 'building_id': b_id}, b_type, ts, inject)
            readings.append((
                r['meter_id'], r['building_id'], r['timestamp'],
                r['energy_kwh'], r['peak_demand_kw'], r['voltage'], r['power_factor']
            ))

    cursor.executemany("""
        INSERT INTO energy_readings (meter_id, building_id, timestamp, energy_kwh, peak_demand_kw, voltage, power_factor)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, readings)
    conn.commit()
    print(f"Inserted {len(readings)} energy readings.")

    # Train ML models
    print("Training ML Anomaly Detection model (Isolation Forest)...")
    readings_df = pd.read_sql_query(
        "SELECT timestamp, energy_kwh, peak_demand_kw, building_id FROM energy_readings", conn
    )
    detector = AnomalyDetector()
    detector.train(readings_df)

    print("Running anomaly detection on historical readings...")
    # Find anomalies from the readings
    sample_readings = cursor.execute("""
        SELECT id, meter_id, building_id, timestamp, energy_kwh, peak_demand_kw
        FROM energy_readings
        ORDER BY RANDOM()
        LIMIT 250
    """).fetchall()

    anomalies_inserted = 0
    anom_ids_for_alerts = []
    for s in sample_readings:
        rid, mid, bid, ts, kwh, kw = s
        reading_dict = {'timestamp': ts, 'energy_kwh': kwh, 'peak_demand_kw': kw}
        is_anom, score, reason = detector.predict(reading_dict, readings_df)
        if is_anom and anomalies_inserted < 30:
            status = random.choice(['open', 'open', 'acknowledged', 'resolved'])
            cursor.execute("""
                INSERT INTO anomalies (meter_id, building_id, reading_id, anomaly_score, is_anomaly, reason, detected_at, status)
                VALUES (?, ?, ?, ?, 1, ?, ?, ?)
            """, (mid, bid, rid, round(score, 4), reason, ts, status))
            anom_id = cursor.lastrowid
            anom_ids_for_alerts.append((anom_id, mid, bid, ts, reason))
            anomalies_inserted += 1

    conn.commit()
    print(f"Recorded {anomalies_inserted} anomalies.")

    print("Seeding Alerts...")
    alert_types = ['anomaly', 'threshold', 'peak_demand', 'meter_offline']
    severities = ['low', 'medium', 'high', 'critical']
    alert_records = []

    # Alerts from detected anomalies
    for anom in anom_ids_for_alerts[:15]:
        anom_id, mid, bid, ts, reason = anom
        sev = random.choice(['medium', 'high', 'critical'])
        status = random.choice(['open', 'open', 'acknowledged', 'resolved'])
        ack_at = (datetime.strptime(ts, '%Y-%m-%d %H:%M:%S') + timedelta(minutes=random.randint(15, 60))).strftime('%Y-%m-%d %H:%M:%S') if status != 'open' else None
        res_at = (datetime.strptime(ack_at, '%Y-%m-%d %H:%M:%S') + timedelta(hours=random.randint(2, 8))).strftime('%Y-%m-%d %H:%M:%S') if status == 'resolved' else None
        ack_by = random.choice([fm1_id, fm2_id]) if status != 'open' else None

        alert_records.append((
            mid, bid, 'anomaly', sev,
            f"AI Anomaly Detected: {reason[:40]}...",
            f"Automated Isolation Forest alert triggered: {reason}",
            status, ts, ack_at, res_at, ack_by
        ))

    # Add threshold and peak alerts
    additional_alerts = [
        (1, building_ids[0], 'threshold', 'high', 'Excessive Daytime Baseline Consumption', 'Consumption exceeded 85% maximum configured threshold during peak hours.', 'open', (now - timedelta(hours=3)).strftime('%Y-%m-%d %H:%M:%S'), None, None, None),
        (3, building_ids[2], 'peak_demand', 'critical', 'Peak Demand Exceeded 120 kW Contract Limit', 'Peak power demand spiked above contractual threshold. Penalty risk elevated.', 'acknowledged', (now - timedelta(hours=8)).strftime('%Y-%m-%d %H:%M:%S'), (now - timedelta(hours=7)).strftime('%Y-%m-%d %H:%M:%S'), None, fm2_id),
        (9, building_ids[1], 'meter_offline', 'medium', 'Smart Meter Telemetry Timeout', 'Meter MTR-2024-109 missed 3 consecutive heartbeat intervals.', 'resolved', (now - timedelta(days=2)).strftime('%Y-%m-%d %H:%M:%S'), (now - timedelta(days=2, hours=-1)).strftime('%Y-%m-%d %H:%M:%S'), (now - timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S'), fm1_id),
        (2, building_ids[0], 'threshold', 'low', 'Minor Off-Hours Power Draw', 'Unexpected base load detected between 02:00 and 04:00.', 'open', (now - timedelta(hours=14)).strftime('%Y-%m-%d %H:%M:%S'), None, None, None),
    ]
    alert_records.extend(additional_alerts)

    cursor.executemany("""
        INSERT INTO alerts (meter_id, building_id, alert_type, severity, title, description, status, created_at, acknowledged_at, resolved_at, acknowledged_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, alert_records)
    conn.commit()
    print(f"Seeded {len(alert_records)} alerts.")

    print("Seeding Maintenance Tasks...")
    maintenance_tasks = [
        (1, 1, building_ids[0], 1, tech_ids[0], fm1_id, 'Inspect HVAC Chiller Surge on Floor 7-11', 'Anomalous load detected on 7th and 11th floor submeters. Inspect refrigerant pressure and motor bearings.', 'high', 'in_progress', 'Initial inspection showed vibration on compressor motor 2.'),
        (2, 2, building_ids[2], 3, tech_ids[1], fm2_id, 'Industrial Transformer Power Factor Correction', 'Power factor dropped below 0.82 during peak industrial shifts. Inspect capacitor bank.', 'critical', 'assigned', 'Scheduled for tomorrow morning shutdown.'),
        (3, None, building_ids[1], 2, tech_ids[2], fm1_id, 'Calibrate Smart Meter MTR-2024-102', 'Routine bi-annual telemetry precision check and firmware upgrade.', 'low', 'completed', 'Firmware upgraded to v2.4. Calibration within +/- 0.5% tolerance.'),
        (4, None, building_ids[3], 4, tech_ids[0], fm2_id, 'Retail Mall Food Court Refrigeration Audit', 'Inspect excessive cooling energy drawn by central refrigeration units.', 'medium', 'pending', None),
        (5, None, building_ids[0], 5, tech_ids[1], fm1_id, 'Server Room Dedicated UPS Battery Maintenance', 'Thermal anomaly reported in electrical room battery storage enclosure.', 'high', 'in_progress', 'Technician dispatched with thermal camera.'),
    ]
    cursor.executemany("""
        INSERT INTO maintenance_tasks (alert_id, anomaly_id, building_id, meter_id, assigned_to, assigned_by, title, description, priority, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, maintenance_tasks)
    conn.commit()

    print("Seeding Demand Response Requests...")
    dr_data = [
        (building_ids[0], fm1_id, 35.0, 120, 'Please raise office thermostat by 1.5C and turn off decorative lobby illumination.', 'completed', 38.4, 210.0, 171.6, (now - timedelta(days=2)).strftime('%Y-%m-%d %H:%M:%S'), (now - timedelta(days=2)).strftime('%Y-%m-%d 14:00:00'), (now - timedelta(days=2)).strftime('%Y-%m-%d 16:00:00')),
        (building_ids[2], fm2_id, 80.0, 90, 'Curtail auxiliary stamping line and switch auxiliary air compressors to eco mode.', 'completed', 74.2, 540.0, 465.8, (now - timedelta(days=4)).strftime('%Y-%m-%d %H:%M:%S'), (now - timedelta(days=4)).strftime('%Y-%m-%d 15:00:00'), (now - timedelta(days=4)).strftime('%Y-%m-%d 16:30:00')),
        (building_ids[3], fm2_id, 25.0, 60, 'Reduce corridor walkway escalator speeds and lower atrium ambient cooling.', 'accepted', 0.0, 180.0, 180.0, (now - timedelta(hours=6)).strftime('%Y-%m-%d %H:%M:%S'), (now + timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S'), (now + timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S')),
        (building_ids[1], fm1_id, 15.0, 180, 'Voluntary consumer load reduction for community club house and exterior lighting.', 'pending', 0.0, 95.0, 95.0, (now - timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S'), (now + timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S'), (now + timedelta(hours=5)).strftime('%Y-%m-%d %H:%M:%S')),
    ]
    cursor.executemany("""
        INSERT INTO demand_response_requests (building_id, created_by, target_load_reduction_kw, duration_minutes, instructions, status, actual_load_reduction_kw, baseline_consumption_kwh, actual_consumption_kwh, created_at, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, dr_data)
    conn.commit()

    dr_req_ids = [r[0] for r in cursor.execute("SELECT id FROM demand_response_requests ORDER BY id").fetchall()]
    # DR Acknowledgements
    cursor.execute("""
        INSERT INTO demand_response_acknowledgements (request_id, user_id, response, notes)
        VALUES (?, ?, 'accepted', 'Thermostat offset applied across zones 1-4.')
    """, (dr_req_ids[0], consumer_user_ids[0]))
    cursor.execute("""
        INSERT INTO demand_response_acknowledgements (request_id, user_id, response, notes)
        VALUES (?, ?, 'accepted', 'Shift schedule shifted by 45 minutes.')
    """, (dr_req_ids[1], consumer_user_ids[2]))
    conn.commit()

    print("Training ML Forecaster & Generating Predictive Data...")
    forecaster = EnergyForecaster()
    forecaster.train(readings_df)

    # Seed Energy Forecasts for next 7 days
    for i in range(1, 8):
        f_date = (now + timedelta(days=i)).strftime('%Y-%m-%d')
        pred = forecaster.predict_next_day(readings_df)
        pred_kwh = pred.get('predicted_kwh', round(random.uniform(450, 750), 2))
        cursor.execute("""
            INSERT INTO energy_forecasts (building_id, forecast_type, forecast_date, predicted_kwh, mae)
            VALUES (?, 'daily', ?, ?, 14.8)
        """, (building_ids[0], f_date, pred_kwh))
    conn.commit()

    print("Seeding System Settings...")
    settings = [
        ('system_uptime_percentage', '99.94', 'System operational uptime percentage'),
        ('energy_warning_threshold_kwh', '150.0', 'Warning threshold for hourly energy consumption (kWh)'),
        ('energy_critical_threshold_kwh', '250.0', 'Critical threshold for hourly energy consumption (kWh)'),
        ('peak_demand_threshold_kw', '100.0', 'Peak power demand ceiling threshold (kW)'),
        ('anomaly_contamination_rate', '0.05', 'Isolation forest contamination fraction (5%)'),
        ('notification_email_enabled', 'true', 'Enable automated critical alert email routing'),
        ('demand_response_auto_notify', 'true', 'Auto-notify affected building consumers during DR event'),
        ('currency_symbol', '$', 'Currency symbol for cost reporting'),
    ]
    cursor.executemany("""
        INSERT INTO system_settings (key, value, description)
        VALUES (?, ?, ?)
    """, settings)
    conn.commit()

    conn.close()
    print("Database seeding completed successfully!")

if __name__ == '__main__':
    seed()
