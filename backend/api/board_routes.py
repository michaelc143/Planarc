""" Board and Task routes for the API """
import sqlalchemy.exc
from flask import Blueprint, jsonify, request
from models import db, Board, BoardTask
from auth_middleware import token_required
from datetime import datetime

board_bp = Blueprint('boards', __name__)


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            try:
                return datetime.strptime(value, "%Y-%m-%d").date()
            except ValueError:
                return None
    return value

# Boards
@board_bp.route('/boards', methods=['GET'])
@token_required
def list_boards(current_user):
    try:
        boards = Board.query.filter_by(owner_id=current_user.id).all()
        return jsonify([
            {
                'id': b.id,
                'name': b.name,
                'description': b.description or '',
                'owner_id': b.owner_id,
                'created_at': b.created_at.isoformat(),
                'updated_at': b.updated_at.isoformat() if b.updated_at else None
            } for b in boards
        ]), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@board_bp.route('/boards', methods=['POST'])
@token_required
def create_board(current_user):
    try:
        data = request.get_json() or {}
        name = data.get('name')
        description = data.get('description')
        if not name:
            return jsonify({'message': 'Name is required'}), 400
        board = Board(name=name, description=description, owner_id=current_user.id)
        db.session.add(board)
        db.session.commit()
        return jsonify({
            'id': board.id,
            'name': board.name,
            'description': board.description or '',
            'owner_id': board.owner_id,
            'created_at': board.created_at.isoformat(),
            'updated_at': board.updated_at.isoformat() if board.updated_at else None
        }), 201
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

@board_bp.route('/boards/<int:board_id>', methods=['GET'])
@token_required
def get_board(current_user, board_id):
    try:
        board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        return jsonify({
            'id': board.id,
            'name': board.name,
            'description': board.description or '',
            'owner_id': board.owner_id,
            'created_at': board.created_at.isoformat(),
            'updated_at': board.updated_at.isoformat() if board.updated_at else None
        }), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@board_bp.route('/boards/<int:board_id>', methods=['PUT'])
@token_required
def update_board(current_user, board_id):
    try:
        board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        data = request.get_json() or {}
        if 'name' in data:
            board.name = data['name']
        if 'description' in data:
            board.description = data['description']
        db.session.commit()
        return jsonify({'message': 'Board updated'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

@board_bp.route('/boards/<int:board_id>', methods=['DELETE'])
@token_required
def delete_board(current_user, board_id):
    try:
        board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        db.session.delete(board)
        db.session.commit()
        return jsonify({'message': 'Board deleted'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

# Tasks under a board
@board_bp.route('/boards/<int:board_id>/tasks', methods=['GET'])
@token_required
def list_board_tasks(current_user, board_id):
    try:
        board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        tasks = BoardTask.query.filter_by(board_id=board.id).order_by(BoardTask.status, BoardTask.position.asc(), BoardTask.id.asc()).all()
        return jsonify([
            {
                'id': t.id,
                'title': t.title,
                'description': t.description or '',
                'status': t.status,
                'priority': t.priority,
                'board_id': t.board_id,
                'assigned_to': t.assigned_to,
                'created_by': t.created_by,
                'due_date': t.due_date.isoformat() if t.due_date else None,
                'position': t.position,
                'created_at': t.created_at.isoformat(),
                'updated_at': t.updated_at.isoformat() if t.updated_at else None
            } for t in tasks
        ]), 200
    except sqlalchemy.exc.SQLAlchemyError:
        return jsonify({'message': 'Internal server error'}), 500

@board_bp.route('/boards/<int:board_id>/tasks', methods=['POST'])
@token_required
def create_board_task(current_user, board_id):
    try:
        board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        data = request.get_json() or {}
        title = data.get('title')
        if not title:
            return jsonify({'message': 'Title is required'}), 400
        status = data.get('status', 'todo')
        # Determine next position at end of target column
        max_pos = db.session.query(db.func.max(BoardTask.position)).filter_by(board_id=board.id, status=status).scalar()
        next_pos = (max_pos if max_pos is not None else -1) + 1
        task = BoardTask(
            title=title,
            description=data.get('description'),
            status=status,
            priority=data.get('priority', 'medium'),
            board_id=board.id,
            assigned_to=data.get('assigned_to'),
            created_by=current_user.id,
            due_date=_parse_date(data.get('due_date')),
            position=next_pos
        )
        db.session.add(task)
        db.session.commit()
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description or '',
            'status': task.status,
            'priority': task.priority,
            'board_id': task.board_id,
            'assigned_to': task.assigned_to,
            'created_by': task.created_by,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'position': task.position,
            'created_at': task.created_at.isoformat(),
            'updated_at': task.updated_at.isoformat() if task.updated_at else None
        }), 201
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

@board_bp.route('/boards/<int:board_id>/tasks/<int:task_id>', methods=['PUT'])
@token_required
def update_board_task(current_user, board_id, task_id):
    try:
        board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        task = BoardTask.query.filter_by(id=task_id, board_id=board.id).first()
        if not task:
            return jsonify({'message': 'Task not found'}), 404
        data = request.get_json() or {}
        for field in ['title', 'description', 'status', 'priority', 'assigned_to']:
            if field in data:
                setattr(task, field, data[field])
        if 'due_date' in data:
            task.due_date = _parse_date(data.get('due_date'))
        db.session.commit()
        return jsonify({'message': 'Task updated'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

@board_bp.route('/boards/<int:board_id>/tasks/<int:task_id>', methods=['DELETE'])
@token_required
def delete_board_task(current_user, board_id, task_id):
    try:
        board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        task = BoardTask.query.filter_by(id=task_id, board_id=board.id).first()
        if not task:
            return jsonify({'message': 'Task not found'}), 404
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

@board_bp.route('/boards/<int:board_id>/tasks/reorder', methods=['POST'])
@token_required
def reorder_tasks(current_user, board_id):
    """Reorder tasks within or across status columns.
    Payload: { moves: [{ task_id, to_status, to_position }] }
    """
    try:
        board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        data = request.get_json() or {}
        moves = data.get('moves', [])
        if not isinstance(moves, list) or not moves:
            return jsonify({'message': 'moves array required'}), 400

        for m in moves:
            task_id = m.get('task_id')
            to_status = m.get('to_status')
            to_position = m.get('to_position')
            if task_id is None or to_status is None or to_position is None:
                continue
            task = BoardTask.query.filter_by(id=task_id, board_id=board.id).first()
            if not task:
                continue
            to_position = int(to_position)
            from_status = task.status
            from_position = task.position or 0

            if from_status == to_status:
                if to_position == from_position:
                    continue
                if to_position < from_position:
                    # moving up: shift down items in [to_position, from_position-1]
                    BoardTask.query.filter_by(board_id=board.id, status=from_status).filter(
                        BoardTask.position >= to_position, BoardTask.position < from_position
                    ).update({BoardTask.position: BoardTask.position + 1}, synchronize_session=False)
                else:
                    # moving down: shift up items in (from_position, to_position]
                    BoardTask.query.filter_by(board_id=board.id, status=from_status).filter(
                        BoardTask.position > from_position, BoardTask.position <= to_position
                    ).update({BoardTask.position: BoardTask.position - 1}, synchronize_session=False)
                task.position = to_position
            else:
                # compact old column
                BoardTask.query.filter_by(board_id=board.id, status=from_status).filter(
                    BoardTask.position > from_position
                ).update({BoardTask.position: BoardTask.position - 1}, synchronize_session=False)
                # make room in target column
                BoardTask.query.filter_by(board_id=board.id, status=to_status).filter(
                    BoardTask.position >= to_position
                ).update({BoardTask.position: BoardTask.position + 1}, synchronize_session=False)
                task.status = to_status
                task.position = to_position

        db.session.commit()
        return jsonify({'message': 'Reordered'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500
