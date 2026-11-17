from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db, row_to_dict, rows_to_list
from routes.auth import facility_manager_required, get_current_user

alerts_bp = Blueprint('alerts', __name__)

def alert_detail(conn, aid):
    a = row_to_dict(conn.execute("""
        SELECT al.*, b.name as building_name, m.meter_code,
               u.full_name as acknowledged_by_name
        FROM alerts al
        LEFT JOIN buildings b ON al.building_id=b.id
        LEFT JOIN meters m ON al.meter_id=m.id
        LEFT JOIN users u ON al.acknowledged_by=u.id
        WHERE al.id=?
    """, (aid,)).fetchone())
    return a

@alerts_bp.route('/', methods=['GET'])
@jwt_required()
def list_alerts():
    conn = get_db()
    building_id = request.args.get('building_id')
    severity = request.args.get('severity')
    status = request.args.get('status')
    alert_type = request.args.get('alert_type')
    limit = int(request.args.get('limit', 100))

    q = """
        SELECT al.*, b.name as building_name, m.meter_code
        FROM alerts al
        LEFT JOIN buildings b ON al.building_id=b.id
        LEFT JOIN meters m ON al.meter_id=m.id
        WHERE 1=1
    """
    params = []
    if building_id:
        q += " AND al.building_id=?"
        params.append(building_id)
    if severity:
        q += " AND al.severity=?"
        params.append(severity)
    if status:
        q += " AND al.status=?"
        params.append(status)
    if alert_type:
        q += " AND al.alert_type=?"
        params.append(alert_type)
    q += f" ORDER BY al.created_at DESC LIMIT {limit}"
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@alerts_bp.route('/', methods=['POST'])
@facility_manager_required
def create_alert():
    data = request.get_json() or {}
    required = ['alert_type', 'severity', 'title']
    for f in required:
        if not data.get(f):
            return jsonify({'error': 'Bad Request', 'message': f'{f} is required'}), 400
    if data['alert_type'] not in ('anomaly', 'threshold', 'peak_demand', 'meter_offline'):
        return jsonify({'error': 'Bad Request', 'message': 'Invalid alert_type'}), 400
    if data['severity'] not in ('low', 'medium', 'high', 'critical'):
        return jsonify({'error': 'Bad Request', 'message': 'Invalid severity'}), 400
    conn = get_db()
    cur = conn.execute("""
        INSERT INTO alerts (meter_id, building_id, alert_type, severity, title, description)
        VALUES (?,?,?,?,?,?)
    """, (data.get('meter_id'), data.get('building_id'), data['alert_type'],
          data['severity'], data['title'], data.get('description')))
    conn.commit()
    a = alert_detail(conn, cur.lastrowid)
    conn.close()
    return jsonify(a), 201

@alerts_bp.route('/stats', methods=['GET'])
@jwt_required()
def alert_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
    open_c = conn.execute("SELECT COUNT(*) FROM alerts WHERE status='open'").fetchone()[0]
    critical = conn.execute("SELECT COUNT(*) FROM alerts WHERE severity='critical' AND status='open'").fetchone()[0]
    by_type = conn.execute("""
        SELECT alert_type, COUNT(*) as count FROM alerts GROUP BY alert_type
    """).fetchall()
    by_severity = conn.execute("""
        SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity
    """).fetchall()
    conn.close()
    return jsonify({
        'total': total,
        'open': open_c,
        'critical_open': critical,
        'by_type': rows_to_list(by_type),
        'by_severity': rows_to_list(by_severity)
    }), 200

@alerts_bp.route('/<int:aid>', methods=['GET'])
@jwt_required()
def get_alert(aid):
    conn = get_db()
    a = alert_detail(conn, aid)
    conn.close()
    if not a:
        return jsonify({'error': 'Not Found', 'message': 'Alert not found'}), 404
    return jsonify(a), 200

@alerts_bp.route('/<int:aid>/acknowledge', methods=['PUT'])
@jwt_required()
def acknowledge_alert(aid):
    user = get_current_user()
    conn = get_db()
    a = conn.execute("SELECT * FROM alerts WHERE id=?", (aid,)).fetchone()
    if not a:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Alert not found'}), 404
    conn.execute("""
        UPDATE alerts SET status='acknowledged', acknowledged_at=datetime('now'),
        acknowledged_by=? WHERE id=?
    """, (user['id'], aid))
    conn.commit()
    updated = alert_detail(conn, aid)
    conn.close()
    return jsonify(updated), 200

@alerts_bp.route('/<int:aid>/resolve', methods=['PUT'])
@facility_manager_required
def resolve_alert(aid):
    conn = get_db()
    a = conn.execute("SELECT * FROM alerts WHERE id=?", (aid,)).fetchone()
    if not a:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Alert not found'}), 404
    conn.execute("""
        UPDATE alerts SET status='resolved', resolved_at=datetime('now') WHERE id=?
    """, (aid,))
    conn.commit()
    updated = alert_detail(conn, aid)
    conn.close()
    return jsonify(updated), 200
