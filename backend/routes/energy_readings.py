from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db, row_to_dict, rows_to_list
from routes.auth import facility_manager_required

readings_bp = Blueprint('readings', __name__)

@readings_bp.route('/', methods=['GET'])
@jwt_required()
def list_readings():
    conn = get_db()
    building_id = request.args.get('building_id')
    meter_id = request.args.get('meter_id')
    start_date = request.args.get('start_date', '2000-01-01')
    end_date = request.args.get('end_date', '2100-01-01')
    limit = int(request.args.get('limit', 500))

    q = "SELECT * FROM energy_readings WHERE timestamp BETWEEN ? AND ?"
    params = [start_date, end_date]
    if building_id:
        q += " AND building_id=?"
        params.append(building_id)
    if meter_id:
        q += " AND meter_id=?"
        params.append(meter_id)
    q += f" ORDER BY timestamp DESC LIMIT {limit}"
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@readings_bp.route('/', methods=['POST'])
@jwt_required()
def add_reading():
    data = request.get_json() or {}
    required = ['meter_id', 'building_id', 'timestamp', 'energy_kwh']
    for f in required:
        if data.get(f) is None:
            return jsonify({'error': 'Bad Request', 'message': f'{f} is required'}), 400
    conn = get_db()
    cur = conn.execute("""
        INSERT INTO energy_readings (meter_id, building_id, timestamp, energy_kwh,
                                      peak_demand_kw, voltage, power_factor)
        VALUES (?,?,?,?,?,?,?)
    """, (data['meter_id'], data['building_id'], data['timestamp'], data['energy_kwh'],
          data.get('peak_demand_kw'), data.get('voltage'), data.get('power_factor')))
    conn.commit()
    reading = row_to_dict(conn.execute(
        "SELECT * FROM energy_readings WHERE id=?", (cur.lastrowid,)).fetchone())
    conn.close()
    return jsonify(reading), 201

@readings_bp.route('/latest', methods=['GET'])
@jwt_required()
def latest_readings():
    conn = get_db()
    rows = conn.execute("""
        SELECT er.*, m.meter_code, b.name as building_name
        FROM energy_readings er
        JOIN meters m ON er.meter_id = m.id
        JOIN buildings b ON er.building_id = b.id
        WHERE er.id IN (
            SELECT MAX(id) FROM energy_readings GROUP BY meter_id
        )
        ORDER BY er.timestamp DESC
    """).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@readings_bp.route('/simulate', methods=['POST'])
@facility_manager_required
def simulate_all():
    data = request.get_json() or {}
    hours_back = data.get('hours_back', 720)
    from ml.data_simulator import run_simulation
    readings = run_simulation(hours_back=hours_back)
    return jsonify({'message': f'Simulated {len(readings)} readings', 'count': len(readings)}), 201

@readings_bp.route('/stats', methods=['GET'])
@jwt_required()
def readings_stats():
    conn = get_db()
    building_id = request.args.get('building_id')
    params = []
    where = ""
    if building_id:
        where = "WHERE building_id=?"
        params.append(building_id)
    stats = conn.execute(f"""
        SELECT COUNT(*) as count, SUM(energy_kwh) as total_kwh,
               AVG(energy_kwh) as avg_kwh, MAX(peak_demand_kw) as max_demand,
               AVG(power_factor) as avg_pf
        FROM energy_readings {where}
    """, params).fetchone()
    conn.close()
    return jsonify(row_to_dict(stats)), 200
