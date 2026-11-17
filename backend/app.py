import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import config
from database import init_db

# Route blueprints
from routes.auth import auth_bp
from routes.users import users_bp
from routes.buildings import buildings_bp
from routes.consumers import consumers_bp
from routes.meters import meters_bp
from routes.energy_readings import readings_bp
from routes.anomalies import anomalies_bp
from routes.alerts import alerts_bp
from routes.maintenance import maintenance_bp
from routes.demand_response import dr_bp
from routes.analytics import analytics_bp
from routes.forecasting import forecasting_bp
from routes.dashboard import dashboard_bp
from routes.settings import settings_bp

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = config.SECRET_KEY
    app.config['JWT_SECRET_KEY'] = config.JWT_SECRET_KEY
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = config.JWT_ACCESS_TOKEN_EXPIRES

    # Setup CORS
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Setup JWT
    jwt = JWTManager(app)

    @jwt.unauthorized_loader
    def unauthorized_callback(callback):
        return jsonify({'error': 'Unauthorized', 'message': 'Missing or invalid authentication token'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(callback):
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid token'}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Unauthorized', 'message': 'Token has expired'}), 401

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(buildings_bp, url_prefix='/api/buildings')
    app.register_blueprint(consumers_bp, url_prefix='/api/consumers')
    app.register_blueprint(meters_bp, url_prefix='/api/meters')
    app.register_blueprint(readings_bp, url_prefix='/api/readings')
    app.register_blueprint(anomalies_bp, url_prefix='/api/anomalies')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    app.register_blueprint(maintenance_bp, url_prefix='/api/maintenance')
    app.register_blueprint(dr_bp, url_prefix='/api/demand-response')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(forecasting_bp, url_prefix='/api/forecasting')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'ok', 'app': 'AI-Assisted Smart Energy Management System'}), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not Found', 'message': 'Endpoint not found'}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500

    return app

# Initialize DB if not present
if not os.path.exists(config.DATABASE_PATH):
    init_db()
    try:
        from seed_data import seed
        seed()
    except Exception as e:
        print(f"Auto-seed exception: {e}")

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=config.DEBUG)
