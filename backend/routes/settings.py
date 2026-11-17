from flask import Blueprint, request, jsonify
from database import get_db, row_to_dict, rows_to_list
from routes.auth import admin_required
from flask_jwt_extended import jwt_required

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_settings():
    conn = get_db()
    rows = conn.execute("SELECT * FROM system_settings").fetchall()
    conn.close()
    settings_dict = {r['key']: r['value'] for r in rows}
    return jsonify({'settings': settings_dict, 'list': rows_to_list(rows)}), 200

@settings_bp.route('/', methods=['PUT'])
@admin_required
def update_multiple_settings():
    data = request.get_json() or {}
    conn = get_db()
    for key, value in data.items():
        conn.execute("""
            INSERT INTO system_settings (key, value, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')
        """, (str(key), str(value)))
    conn.commit()
    rows = conn.execute("SELECT * FROM system_settings").fetchall()
    conn.close()
    settings_dict = {r['key']: r['value'] for r in rows}
    return jsonify({'message': 'Settings updated successfully', 'settings': settings_dict}), 200

@settings_bp.route('/<key>', methods=['GET'])
@jwt_required()
def get_single_setting(key):
    conn = get_db()
    row = conn.execute("SELECT * FROM system_settings WHERE key=?", (key,)).fetchone()
    conn.close()
    if not row:
        return jsonify({'error': 'Not Found', 'message': f'Setting {key} not found'}), 404
    return jsonify(row_to_dict(row)), 200

@settings_bp.route('/<key>', methods=['PUT'])
@admin_required
def update_single_setting(key):
    data = request.get_json() or {}
    val = data.get('value', '')
    conn = get_db()
    conn.execute("""
        INSERT INTO system_settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')
    """, (str(key), str(val)))
    conn.commit()
    row = conn.execute("SELECT * FROM system_settings WHERE key=?", (key,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row)), 200
