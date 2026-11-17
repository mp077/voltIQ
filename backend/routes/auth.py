from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, get_jwt
)
import bcrypt
from database import get_db, row_to_dict
from functools import wraps

auth_bp = Blueprint('auth', __name__)

# ── Role decorators ───────────────────────────────────────────────────────────

def _role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            raw_id = get_jwt_identity()
            uid = int(raw_id) if str(raw_id).isdigit() else raw_id
            conn = get_db()
            user = row_to_dict(conn.execute(
                "SELECT * FROM users WHERE id=?", (uid,)).fetchone())
            conn.close()
            if not user or not user.get('is_active'):
                return jsonify({'error': 'Unauthorized', 'message': 'User not found or inactive'}), 401
            if user['role'] not in roles:
                return jsonify({'error': 'Forbidden', 'message': f'Requires role: {roles}'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def admin_required(fn):
    return _role_required('admin')(fn)

def facility_manager_required(fn):
    return _role_required('admin', 'facility_manager')(fn)

def technician_required(fn):
    return _role_required('admin', 'facility_manager', 'technician')(fn)

def consumer_required(fn):
    return _role_required('admin', 'facility_manager', 'consumer', 'technician')(fn)

def get_current_user():
    raw_id = get_jwt_identity()
    uid = int(raw_id) if str(raw_id).isdigit() else raw_id
    conn = get_db()
    user = row_to_dict(conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone())
    conn.close()
    return user

# ── Endpoints ─────────────────────────────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if not username or not password:
        return jsonify({'error': 'Bad Request', 'message': 'Username and password required'}), 400

    conn = get_db()
    user = row_to_dict(conn.execute(
        "SELECT * FROM users WHERE username=? AND is_active=1", (username,)).fetchone())
    conn.close()

    if not user:
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid credentials'}), 401

    if not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid credentials'}), 401

    token = create_access_token(identity=str(user['id']))
    user.pop('password_hash', None)
    return jsonify({'token': token, 'user': user}), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not Found', 'message': 'User not found'}), 404
    user.pop('password_hash', None)
    return jsonify(user), 200


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_me():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not Found', 'message': 'User not found'}), 404
    data = request.get_json() or {}
    full_name = data.get('full_name', user['full_name'])
    contact = data.get('contact', user['contact'])
    email = data.get('email', user['email'])
    conn = get_db()
    conn.execute("UPDATE users SET full_name=?, contact=?, email=? WHERE id=?",
                 (full_name, contact, email, user['id']))
    conn.commit()
    updated = row_to_dict(conn.execute("SELECT * FROM users WHERE id=?", (user['id'],)).fetchone())
    conn.close()
    updated.pop('password_hash', None)
    return jsonify(updated), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not Found', 'message': 'User not found'}), 404
    data = request.get_json() or {}
    old_pw = data.get('old_password', '')
    new_pw = data.get('new_password', '')
    if not old_pw or not new_pw:
        return jsonify({'error': 'Bad Request', 'message': 'old_password and new_password required'}), 400
    if not bcrypt.checkpw(old_pw.encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Unauthorized', 'message': 'Old password is incorrect'}), 401
    new_hash = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
    conn = get_db()
    conn.execute("UPDATE users SET password_hash=? WHERE id=?", (new_hash, user['id']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Password changed successfully'}), 200
