from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import bcrypt
from database import get_db, row_to_dict, rows_to_list
from routes.auth import admin_required, get_current_user

users_bp = Blueprint('users', __name__)

def _safe_user(u):
    if u:
        u.pop('password_hash', None)
    return u

@users_bp.route('/', methods=['GET'])
@jwt_required()
def list_users():
    role_filter = request.args.get('role')
    conn = get_db()
    if role_filter:
        rows = conn.execute("SELECT * FROM users WHERE role=? ORDER BY id", (role_filter,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM users ORDER BY id").fetchall()
    conn.close()
    users = [_safe_user(dict(r)) for r in rows]
    return jsonify(users), 200

@users_bp.route('/technicians', methods=['GET'])
@jwt_required()
def list_technicians():
    conn = get_db()
    rows = conn.execute("SELECT * FROM users WHERE role='technician' AND is_active=1 ORDER BY full_name").fetchall()
    conn.close()
    return jsonify([_safe_user(dict(r)) for r in rows]), 200

@users_bp.route('/', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json() or {}
    required = ['username', 'email', 'password', 'role']
    for f in required:
        if not data.get(f):
            return jsonify({'error': 'Bad Request', 'message': f'{f} is required'}), 400
    if data['role'] not in ('admin', 'facility_manager', 'consumer', 'technician'):
        return jsonify({'error': 'Bad Request', 'message': 'Invalid role'}), 400
    pw_hash = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO users (username, email, password_hash, role, full_name, contact) VALUES (?,?,?,?,?,?)",
            (data['username'], data['email'], pw_hash, data['role'],
             data.get('full_name', ''), data.get('contact', ''))
        )
        conn.commit()
        user = row_to_dict(conn.execute("SELECT * FROM users WHERE id=?", (cur.lastrowid,)).fetchone())
        conn.close()
        _safe_user(user)
        return jsonify(user), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': 'Conflict', 'message': str(e)}), 409

@users_bp.route('/<int:uid>', methods=['GET'])
@jwt_required()
def get_user(uid):
    conn = get_db()
    user = row_to_dict(conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone())
    conn.close()
    if not user:
        return jsonify({'error': 'Not Found', 'message': 'User not found'}), 404
    return jsonify(_safe_user(user)), 200

@users_bp.route('/<int:uid>', methods=['PUT'])
@jwt_required()
def update_user(uid):
    current = get_current_user()
    if current['role'] != 'admin' and current['id'] != uid:
        return jsonify({'error': 'Forbidden', 'message': 'Cannot update other users'}), 403
    conn = get_db()
    user = row_to_dict(conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone())
    if not user:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'User not found'}), 404
    data = request.get_json() or {}
    full_name = data.get('full_name', user['full_name'])
    contact = data.get('contact', user['contact'])
    email = data.get('email', user['email'])
    is_active = data.get('is_active', user['is_active'])
    role = data.get('role', user['role']) if current['role'] == 'admin' else user['role']
    conn.execute("UPDATE users SET full_name=?, contact=?, email=?, is_active=?, role=? WHERE id=?",
                 (full_name, contact, email, is_active, role, uid))
    conn.commit()
    updated = row_to_dict(conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone())
    conn.close()
    return jsonify(_safe_user(updated)), 200

@users_bp.route('/<int:uid>', methods=['DELETE'])
@admin_required
def delete_user(uid):
    conn = get_db()
    user = conn.execute("SELECT id FROM users WHERE id=?", (uid,)).fetchone()
    if not user:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'User not found'}), 404
    conn.execute("UPDATE users SET is_active=0 WHERE id=?", (uid,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User deactivated'}), 200
