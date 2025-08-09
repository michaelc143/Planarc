"""  API for the application """
import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from models import db
from auth_routes import auth_bp
from user_routes import user_bp
from routes import api_bp
from board_routes import board_bp
from sqlalchemy import text


load_dotenv()
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI')
db.init_app(app)


def ensure_schema():
    """Ensure new schema changes exist in the running DB (simple, idempotent)."""
    try:
        # Add position column to board_tasks if missing (use information_schema for maximum compatibility)
        result = db.session.execute(text(
            """
            SELECT COUNT(*) AS cnt
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'board_tasks' AND COLUMN_NAME = 'position'
            """
        )).first()
        has_position = bool(result and result[0] and int(result[0]) > 0)
        if not has_position:
            db.session.execute(text("ALTER TABLE board_tasks ADD COLUMN position INT DEFAULT 0"))
        db.session.commit()
    except Exception:
        db.session.rollback()

# Create all tables if they don't exist (ensures new models are applied)
with app.app_context():
    db.create_all()
    ensure_schema()

# Register blueprints first
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(api_bp, url_prefix='/api')
app.register_blueprint(board_bp, url_prefix='/api')

# Apply CORS to the app and all blueprints
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

# Ensure all routes handle OPTIONS requests
@app.before_request
def handle_options():
    """ Handle CORS preflight requests """
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        return response

@app.errorhandler(404)
def page_not_found(error):
    """ Handle 404 errors """
    return jsonify({
        'message': (
            error.description or
            'The requested URL was not found on the server. '
            'If you entered the URL manually please check your spelling and try again.'
        )
    }), 404

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)
