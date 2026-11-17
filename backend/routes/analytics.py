from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db, rows_to_list, row_to_dict

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/consumption', methods=['GET'])
@jwt_required()
def consumption():
    conn = get_db()
    period = request.args.get('period', 'daily')  # daily/weekly/monthly
    building_id = request.args.get('building_id')
    start_date = request.args.get('start_date', '2000-01-01')
    end_date = request.args.get('end_date', '2100-01-01')

    params = [start_date, end_date]
    where = "WHERE timestamp BETWEEN ? AND ?"
    if building_id:
        where += " AND building_id=?"
        params.append(building_id)

    if period == 'monthly':
        group_expr = "strftime('%Y-%m', timestamp)"
        label = 'month'
    elif period == 'weekly':
        group_expr = "strftime('%Y-%W', timestamp)"
        label = 'week'
    else:
        group_expr = "date(timestamp)"
        label = 'date'

    rows = conn.execute(f"""
        SELECT {group_expr} as {label},
               SUM(energy_kwh) as total_kwh,
               AVG(energy_kwh) as avg_kwh,
               MAX(peak_demand_kw) as peak_demand,
               COUNT(*) as readings
        FROM energy_readings
        {where}
        GROUP BY {group_expr}
        ORDER BY {group_expr}
    """, params).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@analytics_bp.route('/buildings-comparison', methods=['GET'])
@jwt_required()
def buildings_comparison():
    conn = get_db()
    start_date = request.args.get('start_date', '2000-01-01')
    end_date = request.args.get('end_date', '2100-01-01')
    rows = conn.execute("""
        SELECT b.id, b.name, b.building_type,
               SUM(er.energy_kwh) as total_kwh,
               AVG(er.energy_kwh) as avg_kwh,
               MAX(er.peak_demand_kw) as peak_demand,
               COUNT(er.id) as readings
        FROM buildings b
        LEFT JOIN energy_readings er ON b.id=er.building_id
            AND er.timestamp BETWEEN ? AND ?
        GROUP BY b.id, b.name, b.building_type
        ORDER BY total_kwh DESC
    """, (start_date, end_date)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@analytics_bp.route('/peak-demand', methods=['GET'])
@jwt_required()
def peak_demand():
    conn = get_db()
    start_date = request.args.get('start_date', '2000-01-01')
    end_date = request.args.get('end_date', '2100-01-01')
    building_id = request.args.get('building_id')
    params = [start_date, end_date]
    where = "WHERE timestamp BETWEEN ? AND ?"
    if building_id:
        where += " AND building_id=?"
        params.append(building_id)
    rows = conn.execute(f"""
        SELECT date(timestamp) as date,
               MAX(peak_demand_kw) as peak_demand,
               AVG(peak_demand_kw) as avg_demand
        FROM energy_readings {where}
        GROUP BY date(timestamp)
        ORDER BY date
    """, params).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@analytics_bp.route('/anomaly-frequency', methods=['GET'])
@jwt_required()
def anomaly_frequency():
    conn = get_db()
    rows = conn.execute("""
        SELECT date(detected_at) as date, COUNT(*) as count,
               SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) as resolved
        FROM anomalies WHERE is_anomaly=1
        GROUP BY date(detected_at)
        ORDER BY date
    """).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@analytics_bp.route('/load-reduction', methods=['GET'])
@jwt_required()
def load_reduction():
    conn = get_db()
    rows = conn.execute("""
        SELECT dr.id, dr.created_at, b.name as building_name,
               dr.target_load_reduction_kw, dr.actual_load_reduction_kw,
               dr.baseline_consumption_kwh, dr.actual_consumption_kwh,
               dr.status,
               CASE
                 WHEN dr.actual_load_reduction_kw IS NOT NULL AND dr.target_load_reduction_kw > 0
                 THEN ROUND(dr.actual_load_reduction_kw / dr.target_load_reduction_kw * 100, 1)
                 ELSE NULL
               END as achievement_pct
        FROM demand_response_requests dr
        JOIN buildings b ON dr.building_id=b.id
        ORDER BY dr.created_at DESC
    """).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@analytics_bp.route('/performance-metrics', methods=['GET'])
@jwt_required()
def performance_metrics():
    conn = get_db()
    total_meters = conn.execute("SELECT COUNT(*) FROM meters").fetchone()[0]
    active_meters = conn.execute("SELECT COUNT(*) FROM meters WHERE status='active'").fetchone()[0]
    uptime = round(active_meters / total_meters * 100, 1) if total_meters > 0 else 0

    total_alerts = conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
    ack_alerts = conn.execute("SELECT COUNT(*) FROM alerts WHERE status != 'open'").fetchone()[0]
    ack_rate = round(ack_alerts / total_alerts * 100, 1) if total_alerts > 0 else 0

    forecasts = conn.execute("""
        SELECT AVG(mae) as avg_mae FROM energy_forecasts WHERE mae IS NOT NULL
    """).fetchone()[0]

    pending_maint = conn.execute(
        "SELECT COUNT(*) FROM maintenance_tasks WHERE status IN ('pending','assigned','in_progress')").fetchone()[0]

    conn.close()
    return jsonify({
        'total_meters': total_meters,
        'active_meters': active_meters,
        'uptime_pct': uptime,
        'total_alerts': total_alerts,
        'acknowledgement_rate_pct': ack_rate,
        'avg_forecast_mae': forecasts or 0,
        'pending_maintenance': pending_maint
    }), 200

@analytics_bp.route('/tariff-analysis', methods=['GET'])
@jwt_required()
def tariff_analysis():
    conn = get_db()
    rows = conn.execute("""
        SELECT tc.name as tariff, tc.rate_per_kwh,
               COUNT(DISTINCT m.id) as meter_count,
               COALESCE(SUM(er.energy_kwh), 0) as total_kwh,
               COALESCE(SUM(er.energy_kwh) * tc.rate_per_kwh, 0) as estimated_cost
        FROM tariff_categories tc
        LEFT JOIN meters m ON m.tariff_category_id=tc.id
        LEFT JOIN energy_readings er ON er.meter_id=m.id
        GROUP BY tc.id, tc.name, tc.rate_per_kwh
    """).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200
