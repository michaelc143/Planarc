""" General API routes """
from flask import Blueprint, jsonify

api_bp = Blueprint('api', __name__)

@api_bp.route('/', methods=['GET'])
def test():
    """ Test message to ensure the API is working """
    return jsonify({'message': 'Planarc API is running!'}), 200

@api_bp.route('/health', methods=['GET'])
def health_check():
    """ Health check endpoint """
    return jsonify({
        'status': 'healthy',
        'message': 'API is operational'
    }), 200
