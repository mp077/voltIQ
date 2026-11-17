import sqlite3
import os
from config import config

def get_db():
    conn = sqlite3.connect(config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin','facility_manager','consumer','technician')),
            full_name TEXT,
            contact TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

        CREATE TABLE IF NOT EXISTS tariff_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            rate_per_kwh REAL NOT NULL,
            peak_rate REAL,
            off_peak_rate REAL
        );

        CREATE TABLE IF NOT EXISTS buildings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            building_type TEXT,
            floor_count INTEGER,
            total_area REAL,
            facility_manager_id INTEGER REFERENCES users(id),
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_buildings_fm ON buildings(facility_manager_id);

        CREATE TABLE IF NOT EXISTS consumers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            name TEXT NOT NULL,
            email TEXT,
            contact TEXT,
            assigned_building_id INTEGER REFERENCES buildings(id),
            tariff_category_id INTEGER REFERENCES tariff_categories(id),
            consumer_code TEXT UNIQUE,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_consumers_building ON consumers(assigned_building_id);

        CREATE TABLE IF NOT EXISTS meters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meter_code TEXT UNIQUE NOT NULL,
            building_id INTEGER REFERENCES buildings(id),
            consumer_id INTEGER REFERENCES consumers(id),
            meter_type TEXT,
            installation_date TEXT,
            status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','faulty')),
            tariff_category_id INTEGER REFERENCES tariff_categories(id),
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_meters_building ON meters(building_id);
        CREATE INDEX IF NOT EXISTS idx_meters_status ON meters(status);

        CREATE TABLE IF NOT EXISTS energy_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meter_id INTEGER NOT NULL REFERENCES meters(id),
            building_id INTEGER NOT NULL REFERENCES buildings(id),
            timestamp TEXT NOT NULL,
            energy_kwh REAL NOT NULL,
            peak_demand_kw REAL,
            voltage REAL,
            power_factor REAL,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_readings_meter ON energy_readings(meter_id);
        CREATE INDEX IF NOT EXISTS idx_readings_building ON energy_readings(building_id);
        CREATE INDEX IF NOT EXISTS idx_readings_ts ON energy_readings(timestamp);

        CREATE TABLE IF NOT EXISTS anomalies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meter_id INTEGER NOT NULL REFERENCES meters(id),
            building_id INTEGER NOT NULL REFERENCES buildings(id),
            reading_id INTEGER REFERENCES energy_readings(id),
            anomaly_score REAL,
            is_anomaly INTEGER DEFAULT 1,
            reason TEXT,
            detected_at TEXT DEFAULT (datetime('now')),
            status TEXT DEFAULT 'open' CHECK(status IN ('open','acknowledged','resolved'))
        );
        CREATE INDEX IF NOT EXISTS idx_anomalies_meter ON anomalies(meter_id);
        CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);

        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meter_id INTEGER REFERENCES meters(id),
            building_id INTEGER REFERENCES buildings(id),
            alert_type TEXT NOT NULL CHECK(alert_type IN ('anomaly','threshold','peak_demand','meter_offline')),
            severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'open' CHECK(status IN ('open','acknowledged','resolved')),
            created_at TEXT DEFAULT (datetime('now')),
            acknowledged_at TEXT,
            resolved_at TEXT,
            acknowledged_by INTEGER REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_alerts_building ON alerts(building_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
        CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

        CREATE TABLE IF NOT EXISTS maintenance_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id INTEGER REFERENCES alerts(id),
            anomaly_id INTEGER REFERENCES anomalies(id),
            building_id INTEGER NOT NULL REFERENCES buildings(id),
            meter_id INTEGER REFERENCES meters(id),
            assigned_to INTEGER REFERENCES users(id),
            assigned_by INTEGER REFERENCES users(id),
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending','assigned','in_progress','completed')),
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_maintenance_assigned ON maintenance_tasks(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tasks(status);

        CREATE TABLE IF NOT EXISTS demand_response_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            building_id INTEGER NOT NULL REFERENCES buildings(id),
            created_by INTEGER NOT NULL REFERENCES users(id),
            target_load_reduction_kw REAL NOT NULL,
            duration_minutes INTEGER NOT NULL,
            instructions TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending','acknowledged','accepted','rejected','completed')),
            actual_load_reduction_kw REAL,
            baseline_consumption_kwh REAL,
            actual_consumption_kwh REAL,
            created_at TEXT DEFAULT (datetime('now')),
            start_time TEXT,
            end_time TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_dr_building ON demand_response_requests(building_id);
        CREATE INDEX IF NOT EXISTS idx_dr_status ON demand_response_requests(status);

        CREATE TABLE IF NOT EXISTS demand_response_acknowledgements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL REFERENCES demand_response_requests(id),
            user_id INTEGER NOT NULL REFERENCES users(id),
            response TEXT NOT NULL CHECK(response IN ('accepted','rejected')),
            notes TEXT,
            responded_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS energy_forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meter_id INTEGER REFERENCES meters(id),
            building_id INTEGER REFERENCES buildings(id),
            forecast_type TEXT NOT NULL CHECK(forecast_type IN ('daily','weekly')),
            forecast_date TEXT NOT NULL,
            predicted_kwh REAL NOT NULL,
            actual_kwh REAL,
            mae REAL,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_forecasts_building ON energy_forecasts(building_id);

        CREATE TABLE IF NOT EXISTS system_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            description TEXT,
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            title TEXT NOT NULL,
            message TEXT,
            type TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            related_id INTEGER,
            related_type TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    """)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

def row_to_dict(row):
    if row is None:
        return None
    return dict(row)

def rows_to_list(rows):
    return [dict(r) for r in rows]

if __name__ == '__main__':
    init_db()
