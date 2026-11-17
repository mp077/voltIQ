from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db, row_to_dict, rows_to_list
from routes.auth import admin_required, facility_manager_required

meters_bp = Blueprint('meters', __name__)

def meter_detail(conn, mid):
    m = row_to_dict(conn.execute("SELECT * FROM meters WHERE id=?", (mid,)).fetchone())
    if not m:
        return None
    if m.get('building_id'):
        m['building'] = row_to_dict(conn.execute(
            "SELECT id, name, building_type FROM buildings WHERE id=?", (m['building_id'],)).fetchone())
    if m.get('consumer_id'):
        m['consumer'] = row_to_dict(conn.execute(
            "SELECT id, name, email FROM consumers WHERE id=?", (m['consumer_id'],)).fetchone())
    if m.get('tariff_category_id'):
        m['tariff'] = row_to_dict(conn.execute(
            "SELECT * FROM tariff_categories WHERE id=?", (m['tariff_category_id'],)).fetchone())
    return m

@meters_bp.route('/', methods=['GET'])
@jwt_required()
def list_meters():
    building_id = request.args.get('building_id')
    status = request.args.get('status')
    conn = get_db()
    q = "SELECT * FROM meters WHERE 1=1"
    params = []
    if building_id:
        q += " AND building_id=?"
        params.append(building_id)
    if status:
        q += " AND status=?"
        params.append(status)
    q += " ORDER BY id"
    rows = conn.execute(q, params).fetchall()
    result = []
    for r in rows:
        m = dict(r)
        if m.get('building_id'):
            m['building'] = row_to_dict(conn.execute(
                "SELECT id, name FROM buildings WHERE id=?", (m['building_id'],)).fetchone())
        if m.get('consumer_id'):
            m['consumer'] = row_to_dict(conn.execute(
                "SELECT id, name FROM consumers WHERE id=?", (m['consumer_id'],)).fetchone())
        result.append(m)
    conn.close()
    return jsonify(result), 200

@meters_bp.route('/', methods=['POST'])
@facility_manager_required
def create_meter():
    data = request.get_json() or {}
    if not data.get('meter_code') or not data.get('building_id'):
        return jsonify({'error': 'Bad Request', 'message': 'meter_code and building_id required'}), 400
    conn = get_db()
    try:
        cur = conn.execute("""
            INSERT INTO meters (meter_code, building_id, consumer_id, meter_type,
                                installation_date, status, tariff_category_id)
            VALUES (?,?,?,?,?,?,?)
        """, (data['meter_code'], data['building_id'], data.get('consumer_id'),
              data.get('meter_type', 'Smart'), data.get('installation_date'),
              data.get('status', 'active'), data.get('tariff_category_id')))
        conn.commit()
        m = meter_detail(conn, cur.lastrowid)
        conn.close()
        return jsonify(m), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': 'Error', 'message': str(e)}), 400

@meters_bp.route('/<int:mid>', methods=['GET'])
@jwt_required()
def get_meter(mid):
    conn = get_db()
    m = meter_detail(conn, mid)
    conn.close()
    if not m:
        return jsonify({'error': 'Not Found', 'message': 'Meter not found'}), 404
    return jsonify(m), 200

@meters_bp.route('/<int:mid>', methods=['PUT'])
@facility_manager_required
def update_meter(mid):
    conn = get_db()
    m = row_to_dict(conn.execute("SELECT * FROM meters WHERE id=?", (mid,)).fetchone())
    if not m:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Meter not found'}), 404
    data = request.get_json() or {}
    conn.execute("""
        UPDATE meters SET meter_code=?, building_id=?, consumer_id=?, meter_type=?,
        installation_date=?, status=?, tariff_category_id=? WHERE id=?
    """, (data.get('meter_code', m['meter_code']), data.get('building_id', m['building_id']),
          data.get('consumer_id', m['consumer_id']), data.get('meter_type', m['meter_type']),
          data.get('installation_date', m['installation_date']),
          data.get('status', m['status']),
          data.get('tariff_category_id', m['tariff_category_id']), mid))
    conn.commit()
    updated = meter_detail(conn, mid)
    conn.close()
    return jsonify(updated), 200

@meters_bp.route('/<int:mid>', methods=['DELETE'])
@admin_required
def delete_meter(mid):
    conn = get_db()
    m = conn.execute("SELECT id FROM meters WHERE id=?", (mid,)).fetchone()
    if not m:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Meter not found'}), 404
    conn.execute("DELETE FROM meters WHERE id=?", (mid,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Meter deleted'}), 200

@meters_bp.route('/<int:mid>/simulate-reading', methods=['POST'])
@jwt_required()
def simulate_reading(mid):
    from ml.data_simulator import simulate_single_reading
    result = simulate_single_reading(mid)
    if not result:
        return jsonify({'error': 'Not Found', 'message': 'Meter not found or inactive'}), 404
    return jsonify(result), 201

@meters_bp.route('/<int:mid>/readings', methods=['GET'])
@jwt_required()
def meter_readings(mid):
    conn = get_db()
    m = conn.execute("SELECT id FROM meters WHERE id=?", (mid,)).fetchone()
    if not m:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Meter not found'}), 404
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))
    offset = (page - 1) * per_page
    total = conn.execute("SELECT COUNT(*) FROM energy_readings WHERE meter_id=?", (mid,)).fetchone()[0]
    rows = conn.execute("""
        SELECT * FROM energy_readings WHERE meter_id=? ORDER BY timestamp DESC LIMIT ? OFFSET ?
    """, (mid, per_page, offset)).fetchall()
    conn.close()
    return jsonify({
        'readings': rows_to_list(rows),
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    }), 200
