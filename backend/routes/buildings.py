from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db, row_to_dict, rows_to_list
from routes.auth import admin_required, facility_manager_required

buildings_bp = Blueprint('buildings', __name__)

def building_detail(conn, bid):
    b = row_to_dict(conn.execute("SELECT * FROM buildings WHERE id=?", (bid,)).fetchone())
    if not b:
        return None
    fm = row_to_dict(conn.execute(
        "SELECT id, full_name, username, email FROM users WHERE id=?",
        (b['facility_manager_id'],)).fetchone()) if b.get('facility_manager_id') else None
    b['facility_manager'] = fm
    meter_count = conn.execute("SELECT COUNT(*) FROM meters WHERE building_id=?", (bid,)).fetchone()[0]
    b['meter_count'] = meter_count
    return b

@buildings_bp.route('/', methods=['GET'])
@jwt_required()
def list_buildings():
    conn = get_db()
    rows = conn.execute("SELECT * FROM buildings ORDER BY id").fetchall()
    result = []
    for r in rows:
        b = dict(r)
        fm = row_to_dict(conn.execute(
            "SELECT id, full_name, username FROM users WHERE id=?",
            (b.get('facility_manager_id'),)).fetchone()) if b.get('facility_manager_id') else None
        b['facility_manager'] = fm
        b['meter_count'] = conn.execute(
            "SELECT COUNT(*) FROM meters WHERE building_id=?", (b['id'],)).fetchone()[0]
        result.append(b)
    conn.close()
    return jsonify(result), 200

@buildings_bp.route('/', methods=['POST'])
@facility_manager_required
def create_building():
    data = request.get_json() or {}
    if not data.get('name'):
        return jsonify({'error': 'Bad Request', 'message': 'name is required'}), 400
    conn = get_db()
    cur = conn.execute("""
        INSERT INTO buildings (name, location, building_type, floor_count, total_area, facility_manager_id)
        VALUES (?,?,?,?,?,?)
    """, (data['name'], data.get('location'), data.get('building_type'),
          data.get('floor_count'), data.get('total_area'), data.get('facility_manager_id')))
    conn.commit()
    b = building_detail(conn, cur.lastrowid)
    conn.close()
    return jsonify(b), 201

@buildings_bp.route('/<int:bid>', methods=['GET'])
@jwt_required()
def get_building(bid):
    conn = get_db()
    b = building_detail(conn, bid)
    if not b:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Building not found'}), 404
    meters = rows_to_list(conn.execute(
        "SELECT * FROM meters WHERE building_id=?", (bid,)).fetchall())
    b['meters'] = meters
    conn.close()
    return jsonify(b), 200

@buildings_bp.route('/<int:bid>', methods=['PUT'])
@facility_manager_required
def update_building(bid):
    conn = get_db()
    b = row_to_dict(conn.execute("SELECT * FROM buildings WHERE id=?", (bid,)).fetchone())
    if not b:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Building not found'}), 404
    data = request.get_json() or {}
    conn.execute("""
        UPDATE buildings SET name=?, location=?, building_type=?, floor_count=?,
        total_area=?, facility_manager_id=?, updated_at=datetime('now') WHERE id=?
    """, (
        data.get('name', b['name']), data.get('location', b['location']),
        data.get('building_type', b['building_type']), data.get('floor_count', b['floor_count']),
        data.get('total_area', b['total_area']),
        data.get('facility_manager_id', b['facility_manager_id']), bid
    ))
    conn.commit()
    updated = building_detail(conn, bid)
    conn.close()
    return jsonify(updated), 200

@buildings_bp.route('/<int:bid>', methods=['DELETE'])
@admin_required
def delete_building(bid):
    conn = get_db()
    b = conn.execute("SELECT id FROM buildings WHERE id=?", (bid,)).fetchone()
    if not b:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Building not found'}), 404
    conn.execute("DELETE FROM buildings WHERE id=?", (bid,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Building deleted'}), 200

@buildings_bp.route('/<int:bid>/consumption', methods=['GET'])
@jwt_required()
def building_consumption(bid):
    conn = get_db()
    b = conn.execute("SELECT id FROM buildings WHERE id=?", (bid,)).fetchone()
    if not b:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Building not found'}), 404
    start_date = request.args.get('start_date', '2000-01-01')
    end_date = request.args.get('end_date', '2100-01-01')
    rows = conn.execute("""
        SELECT date(timestamp) as day, SUM(energy_kwh) as total_kwh,
               MAX(peak_demand_kw) as peak_demand, AVG(power_factor) as avg_pf
        FROM energy_readings
        WHERE building_id=? AND timestamp BETWEEN ? AND ?
        GROUP BY day ORDER BY day
    """, (bid, start_date, end_date)).fetchall()
    total = conn.execute(
        "SELECT SUM(energy_kwh) FROM energy_readings WHERE building_id=?", (bid,)).fetchone()[0]
    conn.close()
    return jsonify({
        'building_id': bid,
        'daily': rows_to_list(rows),
        'total_kwh': total or 0
    }), 200
