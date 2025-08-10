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

# Create all tables if they don't exist (ensures new models are applied)
with app.app_context():
    db.create_all()
    # Best-effort migration for missing columns/index (idempotent via try/except)
    try:
        db.session.execute(text("ALTER TABLE board_tasks ADD COLUMN position INT DEFAULT 0"))
        db.session.commit()
    except Exception:
        db.session.rollback()
    try:
        db.session.execute(text("CREATE INDEX idx_board_tasks_board_status_position ON board_tasks (board_id, status, position)"))
        db.session.commit()
    except Exception:
        db.session.rollback()
        # Best-effort migrations for Kanban position + index and custom statuses
        try:
            db.session.execute(text("ALTER TABLE board_tasks ADD COLUMN position INT DEFAULT 0"))
            db.session.commit()
        except Exception:
            db.session.rollback()
        # ensure user_defaults table exists
        try:
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS user_defaults (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL UNIQUE,
                    default_statuses TEXT,
                    default_priorities TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    CONSTRAINT fk_user_defaults_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()
        # ensure board_priorities table exists
        try:
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS board_priorities (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    board_id INT NOT NULL,
                    name VARCHAR(50) NOT NULL,
                    position INT DEFAULT 0,
                    UNIQUE KEY uq_board_priority_name (board_id, name),
                    CONSTRAINT fk_priority_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()
        # alter priority to VARCHAR for custom priorities
        try:
            db.session.execute(text("ALTER TABLE board_tasks MODIFY COLUMN priority VARCHAR(50) DEFAULT 'medium'"))
            db.session.commit()
        except Exception:
            db.session.rollback()
        # ensure board_statuses table exists
        try:
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS board_statuses (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    board_id INT NOT NULL,
                    name VARCHAR(50) NOT NULL,
                    position INT DEFAULT 0,
                    UNIQUE KEY uq_board_status_name (board_id, name),
                    CONSTRAINT fk_status_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()
        # try to alter status to VARCHAR(50) in case it's an ENUM from earlier versions
        try:
            db.session.execute(text("ALTER TABLE board_tasks MODIFY COLUMN status VARCHAR(50) DEFAULT 'todo'"))
            db.session.commit()
        except Exception:
            db.session.rollback()

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
