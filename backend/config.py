import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'smart-energy-secret-key-2024-ooad-platform-production')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-energy-mgmt-2024-secure-key-32chars')
    DATABASE_PATH = os.path.join(BASE_DIR, 'energy.db')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours in seconds
    CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', '*']
    ML_MODELS_DIR = os.path.join(BASE_DIR, 'ml', 'models')
    DEBUG = True

config = Config()
