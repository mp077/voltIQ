import random
import math
from datetime import datetime, timedelta
from database import get_db

# Base consumption ranges (kWh per hour)
BUILDING_TYPE_BASE = {
    'Office': (5, 25),
    'Residential': (1, 8),
    'Industrial': (20, 100),
    'Commercial': (10, 50),
}

def time_of_day_factor(hour):
    """Peak hours 9-18, low 0-6"""
    if 0 <= hour <= 5:
        return 0.3 + 0.1 * random.random()
    elif 6 <= hour <= 8:
        return 0.6 + 0.2 * random.random()
    elif 9 <= hour <= 18:
        return 0.85 + 0.3 * random.random()
    elif 19 <= hour <= 21:
        return 0.7 + 0.2 * random.random()
    else:
        return 0.4 + 0.1 * random.random()

def day_of_week_factor(dow):
    """Monday=0, Sunday=6; weekdays higher"""
    if dow < 5:  # Weekday
        return 0.9 + 0.2 * random.random()
    else:  # Weekend
        return 0.5 + 0.3 * random.random()

def simulate_reading(meter, building_type, timestamp, inject_anomaly=False):
    base_low, base_high = BUILDING_TYPE_BASE.get(building_type, (5, 50))
    base = random.uniform(base_low, base_high)
    hour = timestamp.hour
    dow = timestamp.weekday()
    tod_factor = time_of_day_factor(hour)
    dow_factor = day_of_week_factor(dow)
    energy_kwh = base * tod_factor * dow_factor

    if inject_anomaly:
        anomaly_type = random.choice(['spike', 'drop', 'off_hours'])
        if anomaly_type == 'spike':
            energy_kwh *= random.uniform(3.0, 5.0)
        elif anomaly_type == 'drop':
            energy_kwh *= random.uniform(0.05, 0.15)
        elif anomaly_type == 'off_hours' and hour in range(1, 5):
            energy_kwh *= random.uniform(2.5, 4.0)

    energy_kwh = max(0.1, round(energy_kwh, 3))
    peak_demand_kw = round(energy_kwh * random.uniform(0.8, 1.2), 3)
    voltage = round(random.uniform(218, 242), 1)
    power_factor = round(random.uniform(0.80, 0.98), 3)

    return {
        'meter_id': meter['id'],
        'building_id': meter['building_id'],
        'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        'energy_kwh': energy_kwh,
        'peak_demand_kw': peak_demand_kw,
        'voltage': voltage,
        'power_factor': power_factor,
    }

def run_simulation(hours_back=720):
    """Generate historical data for all active meters over the last hours_back hours."""
    conn = get_db()
    try:
        meters = conn.execute("""
            SELECT m.id, m.building_id, m.meter_code, b.building_type
            FROM meters m
            JOIN buildings b ON m.building_id = b.id
            WHERE m.status = 'active'
        """).fetchall()

        if not meters:
            print("No active meters found.")
            return []

        meters = [dict(m) for m in meters]
        now = datetime.now()
        readings_to_insert = []

        for meter in meters:
            building_type = meter.get('building_type', 'Office')
            for h in range(hours_back, 0, -1):
                ts = now - timedelta(hours=h)
                # ~5% anomaly rate
                inject_anomaly = random.random() < 0.05
                reading = simulate_reading(meter, building_type, ts, inject_anomaly)
                readings_to_insert.append(reading)

        # Batch insert
        conn.executemany("""
            INSERT INTO energy_readings (meter_id, building_id, timestamp, energy_kwh,
                                         peak_demand_kw, voltage, power_factor)
            VALUES (:meter_id, :building_id, :timestamp, :energy_kwh,
                    :peak_demand_kw, :voltage, :power_factor)
        """, readings_to_insert)
        conn.commit()
        print(f"Simulated {len(readings_to_insert)} readings for {len(meters)} meters.")
        return readings_to_insert
    finally:
        conn.close()

def simulate_single_reading(meter_id):
    """Simulate one new reading for a specific meter."""
    conn = get_db()
    try:
        row = conn.execute("""
            SELECT m.id, m.building_id, m.meter_code, b.building_type
            FROM meters m JOIN buildings b ON m.building_id = b.id
            WHERE m.id = ?
        """, (meter_id,)).fetchone()
        if not row:
            return None
        meter = dict(row)
        ts = datetime.now()
        inject_anomaly = random.random() < 0.05
        reading = simulate_reading(meter, meter['building_type'], ts, inject_anomaly)
        cur = conn.execute("""
            INSERT INTO energy_readings (meter_id, building_id, timestamp, energy_kwh,
                                         peak_demand_kw, voltage, power_factor)
            VALUES (:meter_id, :building_id, :timestamp, :energy_kwh,
                    :peak_demand_kw, :voltage, :power_factor)
        """, reading)
        conn.commit()
        reading['id'] = cur.lastrowid
        return reading
    finally:
        conn.close()
