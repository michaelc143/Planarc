""" Board and Task routes for the API """
from datetime import datetime
import sqlalchemy.exc
from auth_middleware import token_required
from flask import Blueprint, jsonify, request
from models import Board, BoardPriority, BoardStatus, BoardTask, db

board_bp = Blueprint('boards', __name__)

# helpers

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
    """
    List all boards for the current user.
    """
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
    """
    Create a new board for the current user.
    """
    try:
        data = request.get_json() or {}
        name = data.get('name')
        description = data.get('description')
        if not name:
            return jsonify({'message': 'Name is required'}), 400
        board = Board(name=name, description=description, owner_id=current_user.id)
        db.session.add(board)
        db.session.commit()
        # seed default statuses for the board if none provided
        defaults = data.get('statuses') or ['todo', 'in_progress', 'review', 'done']
        for idx, s in enumerate(defaults):
            db.session.add(BoardStatus(board_id=board.id, name=s, position=idx))
        # seed default priorities for the board if none provided
        default_priorities = data.get('priorities') or ['low', 'medium', 'high', 'critical']
        for idx, p in enumerate(default_priorities):
            db.session.add(BoardPriority(board_id=board.id, name=p, position=idx))
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
    """
    Get a specific board by ID.
    """
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
    """
    Update a specific board by ID.
    """
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
    """
    Delete a specific board by ID.
    """
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
    """
    List all tasks for a specific board.
    """
    try:
        board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        # order tasks by status column order then position then id
        status_order = {s.name: s.position for s in BoardStatus.query.filter_by(board_id=board.id).order_by(BoardStatus.position).all()}
        tasks = BoardTask.query.filter_by(board_id=board.id).all()
        tasks.sort(key=lambda t: (status_order.get(t.status, 9999), t.position or 0, t.id))
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
    """
    Create a new task in a specific board.
    """
    try:
        board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        data = request.get_json() or {}
        title = data.get('title')
        if not title:
            return jsonify({'message': 'Title is required'}), 400
        # next position in the column (status)
        status = data.get('status', 'todo')
        # ensure status exists in this board, else add it at end
        status_row = BoardStatus.query.filter_by(board_id=board.id, name=status).first()
        if not status_row:
            max_pos = db.session.query(db.func.max(BoardStatus.position)).filter_by(board_id=board.id).scalar() or 0
            db.session.add(BoardStatus(board_id=board.id, name=status, position=max_pos + 1))
            db.session.flush()
        last = (BoardTask.query
                .filter_by(board_id=board.id, status=status)
                .order_by(BoardTask.position.desc())
                .first())
        next_pos = (last.position + 1) if last and last.position is not None else 0
        # ensure priority exists in board priorities
        prio = data.get('priority', 'medium')
        if not BoardPriority.query.filter_by(board_id=board.id, name=prio).first():
            max_pp = db.session.query(db.func.max(BoardPriority.position)).filter_by(board_id=board.id).scalar() or 0
            db.session.add(BoardPriority(board_id=board.id, name=prio, position=max_pp + 1))
            db.session.flush()
        task = BoardTask(
            title=title,
            description=data.get('description'),
            status=status,
            priority=prio,
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
    """
    Update a specific task in a board.
    """
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
                # if changing to a new status ensure it exists
                if field == 'status':
                    new_status = data[field]
                    status_row = BoardStatus.query.filter_by(board_id=board.id, name=new_status).first()
                    if not status_row:
                        max_pos = db.session.query(db.func.max(BoardStatus.position)).filter_by(board_id=board.id).scalar() or 0
                        db.session.add(BoardStatus(board_id=board.id, name=new_status, position=max_pos + 1))
                        db.session.flush()
                if field == 'priority':
                    new_prio = data[field]
                    prio_row = BoardPriority.query.filter_by(board_id=board.id, name=new_prio).first()
                    if not prio_row:
                        max_pp = db.session.query(db.func.max(BoardPriority.position)).filter_by(board_id=board.id).scalar() or 0
                        db.session.add(BoardPriority(board_id=board.id, name=new_prio, position=max_pp + 1))
                        db.session.flush()
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
    """Delete a specific task in a board."""
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
    """Reorder tasks within a board. Body: { moves: [{ task_id, to_status, to_position }] }"""
    try:
        board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        data = request.get_json() or {}
        moves = data.get('moves', [])
        if not isinstance(moves, list):
            return jsonify({'message': 'Invalid payload'}), 400

        for mv in moves:
            task_id = mv.get('task_id')
            to_status = mv.get('to_status')
            to_position = mv.get('to_position')
            if task_id is None or to_status is None or to_position is None:
                return jsonify({'message': 'Invalid move'}), 400
            task = BoardTask.query.filter_by(id=task_id, board_id=board.id).first()
            if not task:
                return jsonify({'message': f'Task {task_id} not found'}), 404
            # ensure destination status exists
            if not BoardStatus.query.filter_by(board_id=board.id, name=to_status).first():
                max_pos = db.session.query(db.func.max(BoardStatus.position)).filter_by(board_id=board.id).scalar() or 0
                db.session.add(BoardStatus(board_id=board.id, name=to_status, position=max_pos + 1))
                db.session.flush()
            # gather tasks in destination column (including the task if already there)
            col_tasks = (BoardTask.query
                         .filter_by(board_id=board.id, status=to_status)
                         .order_by(BoardTask.position, BoardTask.id)
                         .all())
            # if moving from different status, remove from old column list by not including
            if task.status == to_status:
                # remove the task from its current spot in the list to reinsert
                col_tasks = [t for t in col_tasks if t.id != task.id]
            # clamp position
            insert_at = max(0, min(int(to_position), len(col_tasks)))
            # build new order and reindex
            new_order = col_tasks[:insert_at] + [task] + col_tasks[insert_at:]
            # update task status
            task.status = to_status
            for idx, t in enumerate(new_order):
                t.position = idx
        db.session.commit()
        return jsonify({'message': 'Reordered'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

# Status management endpoints
@board_bp.route('/boards/<int:board_id>/statuses', methods=['GET'])
@token_required
def list_statuses(current_user, board_id):
    """List all statuses for a specific board."""
    board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    statuses = BoardStatus.query.filter_by(board_id=board.id).order_by(BoardStatus.position, BoardStatus.id).all()
    return jsonify([
        {'id': s.id, 'name': s.name, 'position': s.position}
    for s in statuses]), 200

@board_bp.route('/boards/<int:board_id>/statuses', methods=['POST'])
@token_required
def create_status(current_user, board_id):
    """Create a new status for a specific board."""
    board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'message': 'Name is required'}), 400
    if BoardStatus.query.filter_by(board_id=board.id, name=name).first():
        return jsonify({'message': 'Status already exists'}), 400
    max_pos = db.session.query(db.func.max(BoardStatus.position)).filter_by(board_id=board.id).scalar() or 0
    status = BoardStatus(board_id=board.id, name=name, position=max_pos + 1)
    db.session.add(status)
    db.session.commit()
    return jsonify({'id': status.id, 'name': status.name, 'position': status.position}), 201

@board_bp.route('/boards/<int:board_id>/statuses/<int:status_id>', methods=['PUT'])
@token_required
def update_status(current_user, board_id, status_id):
    """
    Update a specific status in a board.
    """
    board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    status = BoardStatus.query.filter_by(id=status_id, board_id=board.id).first()
    if not status:
        return jsonify({'message': 'Status not found'}), 404
    data = request.get_json() or {}
    if 'name' in data:
        # enforce uniqueness per board
        if BoardStatus.query.filter(BoardStatus.board_id==board.id, BoardStatus.name==data['name'], BoardStatus.id!=status.id).first():
            return jsonify({'message': 'Status name already used'}), 400
        # update all tasks referencing old name
        old = status.name
        status.name = data['name']
        BoardTask.query.filter_by(board_id=board.id, status=old).update({BoardTask.status: data['name']})
    if 'position' in data:
        status.position = int(data['position'])
    db.session.commit()
    return jsonify({'message': 'Status updated'}), 200

@board_bp.route('/boards/<int:board_id>/statuses/<int:status_id>', methods=['DELETE'])
@token_required
def delete_status(current_user, board_id, status_id):
    """
    Delete a specific status in a board.
    """
    board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    status = BoardStatus.query.filter_by(id=status_id, board_id=board.id).first()
    if not status:
        return jsonify({'message': 'Status not found'}), 404
    # move tasks in this status to fallback (first status) or 'todo'
    fallback = BoardStatus.query.filter_by(board_id=board.id).order_by(BoardStatus.position).first()
    fallback_name = fallback.name if fallback and fallback.id != status.id else 'todo'
    BoardTask.query.filter_by(board_id=board.id, status=status.name).update({BoardTask.status: fallback_name, BoardTask.position: 0})
    db.session.delete(status)
    db.session.commit()
    return jsonify({'message': 'Status deleted'}), 200

# Priority management endpoints
@board_bp.route('/boards/<int:board_id>/priorities', methods=['GET'])
@token_required
def list_priorities(current_user, board_id):
    """
    List all priorities for a specific board.
    """
    board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    priorities = BoardPriority.query.filter_by(board_id=board.id).order_by(BoardPriority.position, BoardPriority.id).all()
    return jsonify([
        {'id': p.id, 'name': p.name, 'position': p.position}
    for p in priorities]), 200

@board_bp.route('/boards/<int:board_id>/priorities', methods=['POST'])
@token_required
def create_priority(current_user, board_id):
    """
    Create a new priority for a specific board.
    """
    board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'message': 'Name is required'}), 400
    if BoardPriority.query.filter_by(board_id=board.id, name=name).first():
        return jsonify({'message': 'Priority already exists'}), 400
    max_pos = db.session.query(db.func.max(BoardPriority.position)).filter_by(board_id=board.id).scalar() or 0
    pr = BoardPriority(board_id=board.id, name=name, position=max_pos + 1)
    db.session.add(pr)
    db.session.commit()
    return jsonify({'id': pr.id, 'name': pr.name, 'position': pr.position}), 201

@board_bp.route('/boards/<int:board_id>/priorities/<int:priority_id>', methods=['PUT'])
@token_required
def update_priority(current_user, board_id, priority_id):
    """
    Update a specific priority in a board.
    """
    board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    pr = BoardPriority.query.filter_by(id=priority_id, board_id=board.id).first()
    if not pr:
        return jsonify({'message': 'Priority not found'}), 404
    data = request.get_json() or {}
    if 'name' in data:
        if BoardPriority.query.filter(BoardPriority.board_id==board.id, BoardPriority.name==data['name'], BoardPriority.id!=pr.id).first():
            return jsonify({'message': 'Priority name already used'}), 400
        old = pr.name
        pr.name = data['name']
        # update all tasks referencing old name
        BoardTask.query.filter_by(board_id=board.id, priority=old).update({BoardTask.priority: data['name']})
    if 'position' in data:
        pr.position = int(data['position'])
    db.session.commit()
    return jsonify({'message': 'Priority updated'}), 200

@board_bp.route('/boards/<int:board_id>/priorities/<int:priority_id>', methods=['DELETE'])
@token_required
def delete_priority(current_user, board_id, priority_id):
    """
    Delete a specific priority in a board.
    """
    board = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    pr = BoardPriority.query.filter_by(id=priority_id, board_id=board.id).first()
    if not pr:
        return jsonify({'message': 'Priority not found'}), 404
    # move tasks with this priority to fallback (first priority) or 'medium'
    fallback = BoardPriority.query.filter_by(board_id=board.id).order_by(BoardPriority.position).first()
    fallback_name = fallback.name if fallback and fallback.id != pr.id else 'medium'
    BoardTask.query.filter_by(board_id=board.id, priority=pr.name).update({BoardTask.priority: fallback_name})
    db.session.delete(pr)
    db.session.commit()
    return jsonify({'message': 'Priority deleted'}), 200
