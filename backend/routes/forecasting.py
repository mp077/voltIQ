from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import pandas as pd
from database import get_db, rows_to_list, row_to_dict
from routes.auth import facility_manager_required

forecasting_bp = Blueprint('forecasting', __name__)

@forecasting_bp.route('/predict', methods=['GET'])
@jwt_required()
def predict():
    from ml.forecaster import get_forecaster
    building_id = request.args.get('building_id')
    forecaster = get_forecaster()
    conn = get_db()
    q = "SELECT timestamp, energy_kwh FROM energy_readings"
    params = []
    if building_id:
        q += " WHERE building_id=?"
        params.append(building_id)
    q += " ORDER BY timestamp"
    rows = conn.execute(q, params).fetchall()
    conn.close()

    if not rows:
        return jsonify({'error': 'No data', 'message': 'No readings available for forecasting'}), 400

    df = pd.DataFrame([dict(r) for r in rows])

    if not forecaster.trained:
        forecaster.train(df)

    next_day = forecaster.predict_next_day(df)
    next_week = forecaster.predict_next_week(df)

    return jsonify({
        'next_day': next_day,
        'next_week': next_week,
        'building_id': building_id
    }), 200

@forecasting_bp.route('/train', methods=['POST'])
@facility_manager_required
def train_model():
    from ml.forecaster import get_forecaster
    building_id = request.args.get('building_id')
    conn = get_db()
    q = "SELECT timestamp, energy_kwh FROM energy_readings"
    params = []
    if building_id:
        q += " WHERE building_id=?"
        params.append(building_id)
    q += " ORDER BY timestamp"
    rows = conn.execute(q, params).fetchall()
    conn.close()

    if not rows or len(rows) < 14:
        return jsonify({'error': 'Insufficient data', 'message': 'Need at least 14 readings to train'}), 400

    df = pd.DataFrame([dict(r) for r in rows])
    forecaster = get_forecaster()
    success = forecaster.train(df)
    if success:
        return jsonify({'message': 'Model trained successfully', 'rows_used': len(rows)}), 200
    return jsonify({'error': 'Training failed', 'message': 'Could not train model'}), 500

@forecasting_bp.route('/accuracy', methods=['GET'])
@jwt_required()
def accuracy():
    conn = get_db()
    rows = conn.execute("""
        SELECT forecast_type,
               AVG(mae) as avg_mae,
               COUNT(*) as forecast_count,
               AVG(ABS(predicted_kwh - actual_kwh)) as computed_mae
        FROM energy_forecasts
        WHERE actual_kwh IS NOT NULL
        GROUP BY forecast_type
    """).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200

@forecasting_bp.route('/history', methods=['GET'])
@jwt_required()
def history():
    conn = get_db()
    building_id = request.args.get('building_id')
    limit = int(request.args.get('limit', 60))
    q = """
        SELECT ef.*, b.name as building_name, m.meter_code
        FROM energy_forecasts ef
        LEFT JOIN buildings b ON ef.building_id=b.id
        LEFT JOIN meters m ON ef.meter_id=m.id
        WHERE 1=1
    """
    params = []
    if building_id:
        q += " AND ef.building_id=?"
        params.append(building_id)
    q += f" ORDER BY ef.forecast_date DESC LIMIT {limit}"
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows)), 200
