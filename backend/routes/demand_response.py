from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db, row_to_dict, rows_to_list
from routes.auth import facility_manager_required, get_current_user

dr_bp = Blueprint('demand_response', __name__)

def request_detail(conn, rid):
    r = row_to_dict(conn.execute("""
        SELECT dr.*, b.name as building_name, u.full_name as created_by_name
        FROM demand_response_requests dr
        JOIN buildings b ON dr.building_id=b.id
        JOIN users u ON dr.created_by=u.id
        WHERE dr.id=?
    """, (rid,)).fetchone())
    if r:
        acks = conn.execute("""
            SELECT da.*, u.full_name as user_name
            FROM demand_response_acknowledgements da
            JOIN users u ON da.user_id=u.id
            WHERE da.request_id=?
        """, (rid,)).fetchall()
        r['acknowledgements'] = rows_to_list(acks)
    return r

@dr_bp.route('/', methods=['GET'])
@jwt_required()
def list_requests():
    conn = get_db()
    building_id = request.args.get('building_id')
    status = request.args.get('status')
    q = """
        SELECT dr.*, b.name as building_name, u.full_name as created_by_name
        FROM demand_response_requests dr
        JOIN buildings b ON dr.building_id=b.id
        JOIN users u ON dr.created_by=u.id
        WHERE 1=1
    """
    params = []
    if building_id:
        q += " AND dr.building_id=?"
        params.append(building_id)
    if status:
        q += " AND dr.status=?"
        params.append(status)
    q += " ORDER BY dr.created_at DESC"
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@dr_bp.route('/', methods=['POST'])
@facility_manager_required
def create_request():
    data = request.get_json() or {}
    required = ['building_id', 'target_load_reduction_kw', 'duration_minutes']
    for f in required:
        if data.get(f) is None:
            return jsonify({'error': 'Bad Request', 'message': f'{f} is required'}), 400
    user = get_current_user()
    conn = get_db()
    cur = conn.execute("""
        INSERT INTO demand_response_requests
        (building_id, created_by, target_load_reduction_kw, duration_minutes,
         instructions, status, baseline_consumption_kwh, start_time)
        VALUES (?,?,?,?,?,?,?,?)
    """, (data['building_id'], user['id'], data['target_load_reduction_kw'],
          data['duration_minutes'], data.get('instructions'),
          'pending', data.get('baseline_consumption_kwh'),
          data.get('start_time')))
    conn.commit()
    r = request_detail(conn, cur.lastrowid)
    conn.close()
    return jsonify(r), 201

@dr_bp.route('/stats', methods=['GET'])
@jwt_required()
def dr_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM demand_response_requests").fetchone()[0]
    by_status = conn.execute("""
        SELECT status, COUNT(*) as count FROM demand_response_requests GROUP BY status
    """).fetchall()
    avg_reduction = conn.execute("""
        SELECT AVG(actual_load_reduction_kw) FROM demand_response_requests
        WHERE status='completed' AND actual_load_reduction_kw IS NOT NULL
    """).fetchone()[0]
    conn.close()
    return jsonify({
        'total': total,
        'by_status': rows_to_list(by_status),
        'avg_actual_reduction_kw': avg_reduction or 0
    }), 200

@dr_bp.route('/<int:rid>', methods=['GET'])
@jwt_required()
def get_request(rid):
    conn = get_db()
    r = request_detail(conn, rid)
    conn.close()
    if not r:
        return jsonify({'error': 'Not Found', 'message': 'Request not found'}), 404
    return jsonify(r), 200

@dr_bp.route('/<int:rid>/status', methods=['PUT'])
@facility_manager_required
def update_status(rid):
    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ('pending', 'acknowledged', 'accepted', 'rejected', 'completed'):
        return jsonify({'error': 'Bad Request', 'message': 'Invalid status'}), 400
    conn = get_db()
    r = conn.execute("SELECT id FROM demand_response_requests WHERE id=?", (rid,)).fetchone()
    if not r:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Request not found'}), 404
    end_time_sql = ", end_time=datetime('now')" if new_status == 'completed' else ""
    conn.execute(f"""
        UPDATE demand_response_requests
        SET status=?, actual_load_reduction_kw=?, actual_consumption_kwh=?{end_time_sql}
        WHERE id=?
    """, (new_status,
          data.get('actual_load_reduction_kw'),
          data.get('actual_consumption_kwh'), rid))
    conn.commit()
    updated = request_detail(conn, rid)
    conn.close()
    return jsonify(updated), 200

@dr_bp.route('/<int:rid>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_request(rid):
    user = get_current_user()
    data = request.get_json() or {}
    response = data.get('response')
    if response not in ('accepted', 'rejected'):
        return jsonify({'error': 'Bad Request', 'message': 'response must be accepted or rejected'}), 400
    conn = get_db()
    r = conn.execute("SELECT id FROM demand_response_requests WHERE id=?", (rid,)).fetchone()
    if not r:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Request not found'}), 404
    conn.execute("""
        INSERT INTO demand_response_acknowledgements (request_id, user_id, response, notes)
        VALUES (?,?,?,?)
    """, (rid, user['id'], response, data.get('notes')))
    conn.execute(
        "UPDATE demand_response_requests SET status='acknowledged' WHERE id=? AND status='pending'",
        (rid,))
    conn.commit()
    updated = request_detail(conn, rid)
    conn.close()
    return jsonify(updated), 200
