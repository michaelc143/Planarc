""" User management routes for the API """
import sqlalchemy.exc
from flask import Blueprint, jsonify, request
from models import db, User, UserDefaults
import json
from auth_middleware import token_required

user_bp = Blueprint('users', __name__)

@user_bp.route('/users/<int:user_id>', methods=['GET'])
@token_required
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
            'dateJoined': user.created_at.isoformat(),
            'role': getattr(user, 'role', 'user')
        }), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@user_bp.route('/users/<string:username>', methods=['DELETE'])
@token_required
def delete_user(current_user, username):
    """ Delete a user by username """
    try:
        # Only allow admins or the user themselves to delete
        user_to_delete = User.query.filter_by(username=username).first()

        if user_to_delete is None:
            return jsonify({'message': 'User not found'}), 404

        # Check permissions
        if current_user.id != user_to_delete.id and getattr(current_user, 'role', 'user') != 'admin':
            return jsonify({'message': 'Insufficient permissions'}), 403

        # Delete the user and commit the changes
        db.session.delete(user_to_delete)
        db.session.commit()

        return jsonify({'message': 'User deleted successfully'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@user_bp.route('/users/<int:user_id>/username', methods=['PUT'])
@token_required
def edit_username(current_user, user_id):
    """ Edit a user's username """
    try:
        data = request.get_json()
        new_username = data.get('username')

        if not new_username:
            return jsonify({'message': 'Username is required'}), 400

        # Find the user by ID
        user = User.query.get(user_id)

        if user is None:
            return jsonify({'message': 'User not found'}), 404

        # Check permissions - only allow the user themselves or admin
        if current_user.id != user.id and getattr(current_user, 'role', 'user') != 'admin':
            return jsonify({'message': 'Insufficient permissions'}), 403

        # Check if username is already taken
        existing_user = User.query.filter_by(username=new_username).first()
        if existing_user and existing_user.id != user.id:
            return jsonify({'message': 'Username already taken'}), 409

        # Update the username and commit the changes
        user.username = new_username
        db.session.commit()

        return jsonify({
            'message': 'Username updated successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'dateJoined': user.created_at.isoformat(),
                'role': getattr(user, 'role', 'user')
            }
        }), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@user_bp.route('/users/profile', methods=['GET'])
@token_required
def get_current_user_profile(current_user):
    """ Get current user's profile """
    try:
        return jsonify({
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'dateJoined': current_user.created_at.isoformat(),
            'role': getattr(current_user, 'role', 'user')
        }), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@user_bp.route('/users/defaults', methods=['GET'])
@token_required
def get_user_defaults(current_user):
    """Get current user's default statuses and priorities for new boards"""
    try:
        uds = UserDefaults.query.filter_by(user_id=current_user.id).first()
        statuses = []
        priorities = []
        if uds and uds.default_statuses:
            try:
                parsed = json.loads(uds.default_statuses)
                if isinstance(parsed, list):
                    statuses = [str(x) for x in parsed]
            except Exception:
                statuses = []
        if uds and uds.default_priorities:
            try:
                parsed = json.loads(uds.default_priorities)
                if isinstance(parsed, list):
                    priorities = [str(x) for x in parsed]
            except Exception:
                priorities = []
        return jsonify({ 'statuses': statuses, 'priorities': priorities }), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@user_bp.route('/users/defaults', methods=['PUT'])
@token_required
def set_user_defaults(current_user):
    """Set current user's default statuses and priorities for new boards"""
    try:
        payload = request.get_json() or {}
        statuses = payload.get('statuses')
        priorities = payload.get('priorities')
        # sanitize lists
        def sanitize(lst, max_len=50, max_items=20):
            if not isinstance(lst, list):
                return []
            out = []
            for x in lst:
                if isinstance(x, str):
                    s = x.strip()
                    if s:
                        out.append(s[:max_len])
                if len(out) >= max_items:
                    break
            return out
        statuses_s = sanitize(statuses)
        priorities_s = sanitize(priorities)
        uds = UserDefaults.query.filter_by(user_id=current_user.id).first()
        if not uds:
            uds = UserDefaults(user_id=current_user.id)
            db.session.add(uds)
        uds.default_statuses = json.dumps(statuses_s)
        uds.default_priorities = json.dumps(priorities_s)
        db.session.commit()
        return jsonify({'message': 'Defaults saved'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500
