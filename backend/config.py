import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD') or 'admin2024'
    DATA_FOLDER = os.path.join(os.path.dirname(__file__), 'data')
    
    @staticmethod
    def init_app(app):
        pass

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
