from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import pandas as pd
from database import get_db, row_to_dict, rows_to_list
from routes.auth import facility_manager_required

anomalies_bp = Blueprint('anomalies', __name__)

@anomalies_bp.route('/', methods=['GET'])
@jwt_required()
def list_anomalies():
    conn = get_db()
    building_id = request.args.get('building_id')
    status = request.args.get('status')
    start_date = request.args.get('start_date', '2000-01-01')
    end_date = request.args.get('end_date', '2100-01-01')
    limit = int(request.args.get('limit', 200))

    q = """
        SELECT a.*, m.meter_code, b.name as building_name
        FROM anomalies a
        JOIN meters m ON a.meter_id = m.id
        JOIN buildings b ON a.building_id = b.id
        WHERE a.detected_at BETWEEN ? AND ?
    """
    params = [start_date, end_date]
    if building_id:
        q += " AND a.building_id=?"
        params.append(building_id)
    if status:
        q += " AND a.status=?"
        params.append(status)
    q += f" ORDER BY a.detected_at DESC LIMIT {limit}"
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@anomalies_bp.route('/detect', methods=['POST'])
@facility_manager_required
def detect_anomalies():
    from ml.anomaly_detector import get_detector
    conn = get_db()
    meters = conn.execute(
        "SELECT id, building_id FROM meters WHERE status='active'").fetchall()

    detector = get_detector()
    detected = []

    for meter in meters:
        mid = meter['id']
        bid = meter['building_id']

        # Load historical readings for this meter
        rows = conn.execute("""
            SELECT * FROM energy_readings WHERE meter_id=? ORDER BY timestamp DESC LIMIT 500
        """, (mid,)).fetchall()
        if not rows:
            continue

        historical_df = pd.DataFrame([dict(r) for r in rows])

        # Train if not already trained
        if not detector.trained and len(historical_df) >= 50:
            detector.train(historical_df)

        # Check last reading
        latest = dict(rows[0])
        is_anomaly, score, reason = detector.predict(latest, historical_df)

        if is_anomaly:
            # Check not duplicate
            existing = conn.execute("""
                SELECT id FROM anomalies WHERE meter_id=? AND reading_id=?
            """, (mid, latest['id'])).fetchone()
            if not existing:
                cur = conn.execute("""
                    INSERT INTO anomalies (meter_id, building_id, reading_id, anomaly_score,
                                           is_anomaly, reason, status)
                    VALUES (?,?,?,?,1,?,'open')
                """, (mid, bid, latest['id'], score, reason))
                conn.commit()
                detected.append({'anomaly_id': cur.lastrowid, 'meter_id': mid,
                                  'score': score, 'reason': reason})

    conn.close()
    return jsonify({'detected': len(detected), 'anomalies': detected}), 200

@anomalies_bp.route('/stats', methods=['GET'])
@jwt_required()
def anomaly_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM anomalies WHERE is_anomaly=1").fetchone()[0]
    open_count = conn.execute("SELECT COUNT(*) FROM anomalies WHERE status='open'").fetchone()[0]
    ack = conn.execute("SELECT COUNT(*) FROM anomalies WHERE status='acknowledged'").fetchone()[0]
    resolved = conn.execute("SELECT COUNT(*) FROM anomalies WHERE status='resolved'").fetchone()[0]
    by_building = conn.execute("""
        SELECT b.name, COUNT(a.id) as count
        FROM anomalies a JOIN buildings b ON a.building_id=b.id
        WHERE a.is_anomaly=1
        GROUP BY b.id, b.name
    """).fetchall()
    conn.close()
    return jsonify({
        'total': total,
        'open': open_count,
        'acknowledged': ack,
        'resolved': resolved,
        'by_building': rows_to_list(by_building)
    }), 200

@anomalies_bp.route('/<int:aid>', methods=['GET'])
@jwt_required()
def get_anomaly(aid):
    conn = get_db()
    a = row_to_dict(conn.execute("""
        SELECT a.*, m.meter_code, b.name as building_name
        FROM anomalies a
        JOIN meters m ON a.meter_id=m.id
        JOIN buildings b ON a.building_id=b.id
        WHERE a.id=?
    """, (aid,)).fetchone())
    conn.close()
    if not a:
        return jsonify({'error': 'Not Found', 'message': 'Anomaly not found'}), 404
    return jsonify(a), 200

@anomalies_bp.route('/<int:aid>/status', methods=['PUT'])
@facility_manager_required
def update_anomaly_status(aid):
    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ('open', 'acknowledged', 'resolved'):
        return jsonify({'error': 'Bad Request', 'message': 'Invalid status'}), 400
    conn = get_db()
    a = conn.execute("SELECT id FROM anomalies WHERE id=?", (aid,)).fetchone()
    if not a:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Anomaly not found'}), 404
    conn.execute("UPDATE anomalies SET status=? WHERE id=?", (new_status, aid))
    conn.commit()
    updated = row_to_dict(conn.execute("SELECT * FROM anomalies WHERE id=?", (aid,)).fetchone())
    conn.close()
    return jsonify(updated), 200
