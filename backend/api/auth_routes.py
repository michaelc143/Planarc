""" Authentication routes for the API """
import os
import sqlalchemy.exc
import jwt
from flask import Blueprint, jsonify, request
from models import db, User
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """ Log in a user """
    try:
        # Parse the JSON request
        data = request.get_json()

        # Get the username and password from the request
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'message': 'Username and password required'}), 400

        # Find the user in the database by username
        user = User.query.filter_by(username=username).first()

        # If the user doesn't exist or the password is wrong, return an error
        if user is None or not check_password_hash(user.password, password):
            return jsonify({'message': 'Invalid email or password'}), 401

        # Generate JWT token
        token = jwt.encode({
            'user_id': user.id
        }, os.getenv('JWT_SECRET_KEY', 'default-secret'), algorithm='HS256')

        # If the email and password are correct, return data and token
        return jsonify({
            'message': 'Logged in successfully',
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'dateJoined': user.created_at.isoformat(),
                'role': getattr(user, 'role', 'user')  # Default to 'user' if role doesn't exist
            }
        }), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    """ Register a new user """
    try:
        # Parse the JSON request
        data = request.get_json()

        # Get the required fields from the request
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')

        if not all([username, password, email]):
            return jsonify({'message': 'Username, email, and password are required'}), 400

        # Check if a user with the provided username or email already exists
        existing_user = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()

        if existing_user is not None:
            return jsonify({'message': 'Username or email already taken'}), 409

        # Hash the password
        hashed_password = generate_password_hash(password)

        # Create a new user and save it to the database
        user = User(username=username, password=hashed_password, email=email)
        db.session.add(user)
        db.session.commit()
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': user.id
        }, os.getenv('JWT_SECRET_KEY', 'default-secret'), algorithm='HS256')

        # Return a success message
        return jsonify({
            'message': 'Registered successfully',
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'dateJoined': user.created_at.isoformat(),
                'role': getattr(user, 'role', 'user')
            }
        }), 201
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@auth_bp.route('/validate', methods=['GET'])
def validate_token():
    """ Validate JWT token """
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': 'No token provided'}), 401

    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]

        payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'default-secret'), algorithms=['HS256'])
        user = User.query.get(payload['user_id'])

        if not user:
            return jsonify({'message': 'Invalid token'}), 401

        return jsonify({'valid': True, 'user_id': user.id}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid token'}), 401
