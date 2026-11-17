from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db, row_to_dict, rows_to_list
from routes.auth import facility_manager_required, get_current_user

maintenance_bp = Blueprint('maintenance', __name__)

def task_detail(conn, tid):
    t = row_to_dict(conn.execute("""
        SELECT mt.*,
               b.name as building_name,
               m.meter_code,
               u1.full_name as assigned_to_name,
               u2.full_name as assigned_by_name
        FROM maintenance_tasks mt
        LEFT JOIN buildings b ON mt.building_id=b.id
        LEFT JOIN meters m ON mt.meter_id=m.id
        LEFT JOIN users u1 ON mt.assigned_to=u1.id
        LEFT JOIN users u2 ON mt.assigned_by=u2.id
        WHERE mt.id=?
    """, (tid,)).fetchone())
    return t

@maintenance_bp.route('/', methods=['GET'])
@jwt_required()
def list_tasks():
    conn = get_db()
    status = request.args.get('status')
    assigned_to = request.args.get('assigned_to')
    building_id = request.args.get('building_id')
    priority = request.args.get('priority')

    q = """
        SELECT mt.*, b.name as building_name, m.meter_code,
               u1.full_name as assigned_to_name, u2.full_name as assigned_by_name
        FROM maintenance_tasks mt
        LEFT JOIN buildings b ON mt.building_id=b.id
        LEFT JOIN meters m ON mt.meter_id=m.id
        LEFT JOIN users u1 ON mt.assigned_to=u1.id
        LEFT JOIN users u2 ON mt.assigned_by=u2.id
        WHERE 1=1
    """
    params = []
    if status:
        q += " AND mt.status=?"
        params.append(status)
    if assigned_to:
        q += " AND mt.assigned_to=?"
        params.append(assigned_to)
    if building_id:
        q += " AND mt.building_id=?"
        params.append(building_id)
    if priority:
        q += " AND mt.priority=?"
        params.append(priority)
    q += " ORDER BY mt.created_at DESC"
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@maintenance_bp.route('/my-tasks', methods=['GET'])
@jwt_required()
def my_tasks():
    user = get_current_user()
    conn = get_db()
    rows = conn.execute("""
        SELECT mt.*, b.name as building_name, m.meter_code
        FROM maintenance_tasks mt
        LEFT JOIN buildings b ON mt.building_id=b.id
        LEFT JOIN meters m ON mt.meter_id=m.id
        WHERE mt.assigned_to=?
        ORDER BY mt.created_at DESC
    """, (user['id'],)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@maintenance_bp.route('/', methods=['POST'])
@facility_manager_required
def create_task():
    data = request.get_json() or {}
    if not data.get('title') or not data.get('building_id'):
        return jsonify({'error': 'Bad Request', 'message': 'title and building_id are required'}), 400
    user = get_current_user()
    conn = get_db()
    cur = conn.execute("""
        INSERT INTO maintenance_tasks (alert_id, anomaly_id, building_id, meter_id,
            assigned_to, assigned_by, title, description, priority, status, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    """, (data.get('alert_id'), data.get('anomaly_id'), data['building_id'],
          data.get('meter_id'), data.get('assigned_to'), user['id'],
          data['title'], data.get('description'), data.get('priority', 'medium'),
          'assigned' if data.get('assigned_to') else 'pending',
          data.get('notes')))
    conn.commit()
    t = task_detail(conn, cur.lastrowid)
    conn.close()
    return jsonify(t), 201

@maintenance_bp.route('/<int:tid>', methods=['GET'])
@jwt_required()
def get_task(tid):
    conn = get_db()
    t = task_detail(conn, tid)
    conn.close()
    if not t:
        return jsonify({'error': 'Not Found', 'message': 'Task not found'}), 404
    return jsonify(t), 200

@maintenance_bp.route('/<int:tid>', methods=['PUT'])
@jwt_required()
def update_task(tid):
    user = get_current_user()
    conn = get_db()
    t = row_to_dict(conn.execute("SELECT * FROM maintenance_tasks WHERE id=?", (tid,)).fetchone())
    if not t:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Task not found'}), 404
    # Technicians can only update their own tasks
    if user['role'] == 'technician' and t['assigned_to'] != user['id']:
        conn.close()
        return jsonify({'error': 'Forbidden', 'message': 'Can only update your own tasks'}), 403
    data = request.get_json() or {}
    new_status = data.get('status', t['status'])
    completed_at = "datetime('now')" if new_status == 'completed' and t['status'] != 'completed' else None
    if completed_at:
        conn.execute("""
            UPDATE maintenance_tasks SET status=?, notes=?, priority=?,
            assigned_to=?, updated_at=datetime('now'), completed_at=datetime('now') WHERE id=?
        """, (new_status, data.get('notes', t['notes']),
              data.get('priority', t['priority']), data.get('assigned_to', t['assigned_to']), tid))
    else:
        conn.execute("""
            UPDATE maintenance_tasks SET status=?, notes=?, priority=?,
            assigned_to=?, updated_at=datetime('now') WHERE id=?
        """, (new_status, data.get('notes', t['notes']),
              data.get('priority', t['priority']), data.get('assigned_to', t['assigned_to']), tid))
    conn.commit()
    updated = task_detail(conn, tid)
    conn.close()
    return jsonify(updated), 200

@maintenance_bp.route('/<int:tid>', methods=['DELETE'])
@facility_manager_required
def delete_task(tid):
    conn = get_db()
    t = conn.execute("SELECT id FROM maintenance_tasks WHERE id=?", (tid,)).fetchone()
    if not t:
        conn.close()
        return jsonify({'error': 'Not Found', 'message': 'Task not found'}), 404
    conn.execute("DELETE FROM maintenance_tasks WHERE id=?", (tid,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Task deleted'}), 200
