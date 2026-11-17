from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db, rows_to_list, row_to_dict

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/kpis', methods=['GET'])
@jwt_required()
def kpis():
    conn = get_db()
    total_energy = conn.execute(
        "SELECT COALESCE(SUM(energy_kwh), 0) FROM energy_readings").fetchone()[0]
    peak_demand = conn.execute(
        "SELECT COALESCE(MAX(peak_demand_kw), 0) FROM energy_readings").fetchone()[0]
    active_meters = conn.execute(
        "SELECT COUNT(*) FROM meters WHERE status='active'").fetchone()[0]
    total_meters = conn.execute("SELECT COUNT(*) FROM meters").fetchone()[0]
    anomalies_count = conn.execute(
        "SELECT COUNT(*) FROM anomalies WHERE status='open' AND is_anomaly=1").fetchone()[0]
    pending_maintenance = conn.execute(
        "SELECT COUNT(*) FROM maintenance_tasks WHERE status IN ('pending','assigned','in_progress')").fetchone()[0]
    uptime = round(active_meters / total_meters * 100, 1) if total_meters > 0 else 0

    # Energy today
    energy_today = conn.execute("""
        SELECT COALESCE(SUM(energy_kwh), 0)
        FROM energy_readings WHERE date(timestamp) = date('now')
    """).fetchone()[0]

    # Open alerts
    open_alerts = conn.execute(
        "SELECT COUNT(*) FROM alerts WHERE status='open'").fetchone()[0]
    critical_alerts = conn.execute(
        "SELECT COUNT(*) FROM alerts WHERE status='open' AND severity='critical'").fetchone()[0]

    conn.close()
    return jsonify({
        'total_energy_kwh': round(total_energy, 2),
        'energy_today_kwh': round(energy_today, 2),
        'peak_demand_kw': round(peak_demand, 2),
        'active_meters': active_meters,
        'total_meters': total_meters,
        'uptime_pct': uptime,
        'open_anomalies': anomalies_count,
        'pending_maintenance': pending_maintenance,
        'open_alerts': open_alerts,
        'critical_alerts': critical_alerts
    }), 200

@dashboard_bp.route('/recent-alerts', methods=['GET'])
@jwt_required()
def recent_alerts():
    conn = get_db()
    rows = conn.execute("""
        SELECT al.*, b.name as building_name
        FROM alerts al
        LEFT JOIN buildings b ON al.building_id=b.id
        ORDER BY al.created_at DESC LIMIT 10
    """).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@dashboard_bp.route('/energy-chart', methods=['GET'])
@jwt_required()
def energy_chart():
    conn = get_db()
    days = int(request.args.get('days', 7))
    building_id = request.args.get('building_id')
    where = "WHERE timestamp >= datetime('now', ? || ' days')"
    if building_id:
        where += " AND building_id=?"
        params = [f'-{days}', building_id]
    else:
        params = [f'-{days}']

    rows = conn.execute(f"""
        SELECT date(timestamp) as date,
               SUM(energy_kwh) as total_kwh,
               MAX(peak_demand_kw) as peak_demand,
               AVG(energy_kwh) as avg_kwh
        FROM energy_readings
        {where}
        GROUP BY date(timestamp)
        ORDER BY date
    """, params).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@dashboard_bp.route('/building-comparison', methods=['GET'])
@jwt_required()
def building_comparison():
    conn = get_db()
    rows = conn.execute("""
        SELECT b.id, b.name, b.building_type,
               COALESCE(SUM(er.energy_kwh), 0) as total_kwh,
               COUNT(DISTINCT m.id) as meter_count
        FROM buildings b
        LEFT JOIN meters m ON m.building_id=b.id
        LEFT JOIN energy_readings er ON er.building_id=b.id
            AND er.timestamp >= datetime('now', '-30 days')
        GROUP BY b.id, b.name, b.building_type
        ORDER BY total_kwh DESC
    """).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@dashboard_bp.route('/energy-distribution', methods=['GET'])
@jwt_required()
def energy_distribution():
    conn = get_db()
    rows = conn.execute("""
        SELECT b.name as building,
               COALESCE(SUM(er.energy_kwh), 0) as total_kwh
        FROM buildings b
        LEFT JOIN energy_readings er ON er.building_id=b.id
            AND er.timestamp >= datetime('now', '-30 days')
        GROUP BY b.id, b.name
    """).fetchall()
    rows = rows_to_list(rows)
    grand_total = sum(r['total_kwh'] for r in rows)
    for r in rows:
        r['pct'] = round(r['total_kwh'] / grand_total * 100, 1) if grand_total > 0 else 0
    conn.close()
    return jsonify(rows), 200
