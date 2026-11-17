from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db, row_to_dict, rows_to_list
from routes.auth import admin_required, facility_manager_required

consumers_bp = Blueprint('consumers', __name__)

def consumer_detail(conn, cid):
    c = row_to_dict(conn.execute("SELECT * FROM consumers WHERE id=?", (cid,)).fetchone())
    if not c:
        return None
    if c.get('assigned_building_id'):
        c['building'] = row_to_dict(conn.execute(
            "SELECT id, name FROM buildings WHERE id=?", (c['assigned_building_id'],)).fetchone())
    if c.get('tariff_category_id'):
        c['tariff'] = row_to_dict(conn.execute(
            "SELECT * FROM tariff_categories WHERE id=?", (c['tariff_category_id'],)).fetchone())
    return c

@consumers_bp.route('/', methods=['GET'])
@jwt_required()
def list_consumers():
    building_id = request.args.get('building_id')
    conn = get_db()
    if building_id:
        rows = conn.execute("SELECT * FROM consumers WHERE assigned_building_id=? ORDER BY id", (building_id,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM consumers ORDER BY id").fetchall()
    result = []
    for r in rows:
        c = dict(r)
        if c.get('assigned_building_id'):
            b = row_to_dict(conn.execute(
                "SELECT id, name FROM buildings WHERE id=?", (c['assigned_building_id'],)).fetchone())
            c['building'] = b
        result.append(c)
    conn.close()
    return jsonify(result), 200

@consumers_bp.route('/', methods=['POST'])
@facility_manager_required
def create_consumer():
    data = request.get_json() or {}
    if not data.get('name'):
        return jsonify({'error': 'Bad Request', 'message': 'name is required'}), 400
    import random, string
    code = 'C' + ''.join(random.choices(string.digits, k=6))
    conn = get_db()
    try:
        cur = conn.execute("""
            INSERT INTO consumers (user_id, name, email, contact, assigned_building_id, tariff_category_id, consumer_code)
            VALUES (?,?,?,?,?,?,?)
        """, (data.get('user_id'), data['name'], data.get('email'), data.get('contact'),
              data.get('assigned_building_id'), data.get('tariff_category_id'), code))
        conn.commit()
        c = consumer_detail(conn, cur.lastrowid)
        conn.close()
        return jsonify(c), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': 'Error', 'message': str(e)}), 400

@consumers_bp.route('/<int:cid>', methods=['GET'])
@jwt_required()
def get_consumer(cid):
    conn = get_db()
    c = consumer_detail(conn, cid)
    conn.close()
    if not c:
        return jsonify({'error': 'Not Found', 'message': 'Consumer not found'}), 404
    return jsonify(c), 200

@consumers_bp.route('/<int:cid>', methods=['PUT'])
@facility_manager_required
def update_consumer(cid):
    conn = get_db()
    c = row_to_dict(conn.execute("SELECT * FROM consumers WHERE id=?", (cid,)).fetchone())
    if not c:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Consumer not found'}), 404
    data = request.get_json() or {}
    conn.execute("""
        UPDATE consumers SET name=?, email=?, contact=?, assigned_building_id=?, tariff_category_id=? WHERE id=?
    """, (data.get('name', c['name']), data.get('email', c['email']),
          data.get('contact', c['contact']),
          data.get('assigned_building_id', c['assigned_building_id']),
          data.get('tariff_category_id', c['tariff_category_id']), cid))
    conn.commit()
    updated = consumer_detail(conn, cid)
    conn.close()
    return jsonify(updated), 200

@consumers_bp.route('/<int:cid>', methods=['DELETE'])
@admin_required
def delete_consumer(cid):
    conn = get_db()
    c = conn.execute("SELECT id FROM consumers WHERE id=?", (cid,)).fetchone()
    if not c:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Consumer not found'}), 404
    conn.execute("DELETE FROM consumers WHERE id=?", (cid,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Consumer deleted'}), 200
