""" Routes for the API """
import sqlalchemy.exc
from flask import Blueprint, jsonify, request
from models import db, User
from werkzeug.security import generate_password_hash, check_password_hash

api = Blueprint('api', __name__)

@api.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """ Get a user by ID """
    try:
        user = User.query.get(user_id)
        if user is None:
            return jsonify({'message': 'User not found'}), 404

        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'created_at': user.created_at
        }), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@api.route('/users/<string:username>', methods=['DELETE'])
def delete_user(username):
    """ Delete a user by username """
    try:
        # Find the user by username
        user = User.query.filter_by(username=username).first()

        if user is None:
            # If the user doesn't exist, return an error
            return jsonify({'message': 'User not found'}), 404

        # Delete the user and commit the changes
        db.session.delete(user)
        db.session.commit()

        # Return a success message
        return jsonify({'message': 'User deleted successfully'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@api.route('/login', methods=['POST'])
def login():
    """ Log in a user """
    try:
        # Parse the JSON request
        data = request.get_json()

        # Get the username and password from the request
        username = data.get('username')
        password = data.get('password')

        # Find the user in the database
        user = User.query.filter_by(username=username).first()

        # If the user doesn't exist or the password is wrong, return an error
        if user is None or not check_password_hash(user.password, password):
            return jsonify({'message': 'Invalid username or password'}), 401

        # If the username and password are correct, return data and 200 response
        return jsonify({
            'message': 'Logged in successfully',
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'date_joined': user.created_at
        }), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@api.route('/register', methods=['POST'])
def register():
    """ Register a new user """
    try:
        # Parse the JSON request
        data = request.get_json()

        # Get the username and password from the request
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')

        # Check if a user with the provided username already exists
        user = User.query.filter_by(username=username).first()
        user_email = User.query.filter_by(email=email).first()

        if user is not None or user_email is not None:
            # If a user with the provided username/email already exists, return an error
            return jsonify({'message': 'Username/Email already taken'}), 401

        # Hash the password
        hashed_password = generate_password_hash(password)

        # Create a new user and save it to the database
        user = User(username=username, password=hashed_password, email=email)
        db.session.add(user)
        db.session.commit()

        # Return a success message
        return jsonify({
            'message': 'Registered successfully',
            'username': user.username,
            'email': user.email,
            'date_joined': str(user.created_at)
        }), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@api.route('/users/<int:user_id>/username', methods=['PUT'])
def edit_username(user_id):
    """ Edit a user's username """
    try:
        data = request.get_json()

        # Get the new username from the request
        new_username = data.get('username')
        
        # Find the user by ID
        user = User.query.get(user_id)

        if user is None:
            # If the user doesn't exist, return an error
            return jsonify({'message': 'User not found'}), 404

        # Update the username and commit the changes
        user.username = new_username
        db.session.commit()

        # Return a success message
        return jsonify({
            'message': 'Username updated successfully',
            'username': user.username}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@api.route('/', methods=['GET'])
def test():
    """ Test message to ensure the API is working """
    return jsonify({'message': 'Hello, World!'}), 200
