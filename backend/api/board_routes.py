""" Board and Task routes for the API """
import json
from datetime import datetime
from typing import Tuple
import sqlalchemy.exc
from auth_middleware import token_required
from flask import Blueprint, jsonify, request, Response
from models import Board, BoardPriority, BoardStatus, BoardTask, UserDefaults, BoardMember, User, db
from sqlalchemy import select, or_

board_bp = Blueprint('boards', __name__)

# helpers

def _parse_date(value):
    """
    Parse a date from a string or datetime object.
    """
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
def list_boards(current_user) -> Tuple[Response, int]:
    """
    List all boards for the current user.
    """
    try:
        # boards owned by the user OR where the user is a member
        member_board_ids = select(BoardMember.board_id).where(BoardMember.user_id == current_user.id)
        stmt = (
            select(Board)
            .where(or_(Board.owner_id == current_user.id, Board.id.in_(member_board_ids)))
            .order_by(Board.created_at.desc())
        )
        boards = db.session.scalars(stmt).all()
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
def create_board(current_user) -> Tuple[Response, int]:
    """
    Create a new board for the current user.
    """
    try:
        data: dict = request.get_json() or {}
        name: str | None = data.get('name')
        description: str | None = data.get('description')
        if not name:
            return jsonify({'message': 'Name is required'}), 400
        board = Board(name=name, description=description, owner_id=current_user.id)
        db.session.add(board)
        db.session.commit()
        # add owner as member (owner role) and commit so membership is visible in subsequent requests
        try:
            db.session.add(BoardMember(board_id=board.id, user_id=current_user.id, role='owner'))
            db.session.commit()
        except sqlalchemy.exc.SQLAlchemyError:
            db.session.rollback()
        # invited users by username or ids
        invite_usernames: list[str] = data.get('invite_usernames') or []
        invite_ids: list[int] = data.get('invite_user_ids') or []
        if isinstance(invite_usernames, list):
            for uname in invite_usernames:
                if not isinstance(uname, str):
                    continue
                u: User | None = User.query.filter_by(username=uname).first()
                if u and u.id != current_user.id:
                    if not BoardMember.query.filter_by(board_id=board.id, user_id=u.id).first():
                        db.session.add(BoardMember(board_id=board.id, user_id=u.id, role='member'))
        if isinstance(invite_ids, list):
            for uid in invite_ids:
                try:
                    uid_int: int = int(uid)
                except (TypeError, ValueError):
                    continue
                if uid_int != current_user.id:
                    if not BoardMember.query.filter_by(board_id=board.id, user_id=uid_int).first():
                        db.session.add(BoardMember(board_id=board.id, user_id=uid_int, role='member'))
        # seed default statuses for the board if none provided
        defaults: list[str] | None = data.get('statuses')
        if not defaults:
            # try per-user defaults
            user_defaults: UserDefaults | None = UserDefaults.query.filter_by(user_id=current_user.id).first()
            if user_defaults and user_defaults.default_statuses:
                try:
                    parsed: list[str] | None = json.loads(user_defaults.default_statuses)
                    if isinstance(parsed, list) and parsed:
                        defaults = [str(x) for x in parsed if isinstance(x, str) and x.strip()]
                except json.JSONDecodeError:
                    defaults = None
        if not defaults:
            defaults = ['todo', 'in_progress', 'review', 'done']
        try:
            for idx, s in enumerate(defaults):
                db.session.add(BoardStatus(board_id=board.id, name=s, position=idx))
            db.session.commit()
        except sqlalchemy.exc.SQLAlchemyError:
            db.session.rollback()
        # seed default priorities for the board if none provided
        default_priorities: list[str] | None = data.get('priorities')
        if not default_priorities:
            user_defaults: UserDefaults | None = UserDefaults.query.filter_by(user_id=current_user.id).first()
            if user_defaults and user_defaults.default_priorities:
                try:
                    parsed: list[str] | None = json.loads(user_defaults.default_priorities)
                    if isinstance(parsed, list) and parsed:
                        default_priorities: list[str] | None = [str(x) for x in parsed if isinstance(x, str) and x.strip()]
                except json.JSONDecodeError:
                    default_priorities = None
        if not default_priorities:
            default_priorities = ['low', 'medium', 'high', 'critical']
        try:
            for idx, p in enumerate(default_priorities):
                db.session.add(BoardPriority(board_id=board.id, name=p, position=idx))
            db.session.commit()
        except sqlalchemy.exc.SQLAlchemyError:
            db.session.rollback()
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
def get_board(current_user, board_id) -> Tuple[Response, int]:
    """
    Get a specific board by ID.
    """
    try:
        # Allow if owner or member
        board: Board | None = Board.query.filter_by(id=board_id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
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
def update_board(current_user, board_id) -> Tuple[Response, int]:
    """
    Update a specific board by ID.
    """
    try:
        board: Board | None = Board.query.filter_by(id=board_id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        data: dict = request.get_json() or {}
        if 'name' in data:
            board.name = data['name']
        if 'description' in data:
            board.description = data['description']
        # handle invitations add/remove
        add_usernames: list[str] = data.get('add_usernames') or []
        add_user_ids: list[int] = data.get('add_user_ids') or []
        remove_user_ids: list[int] = data.get('remove_user_ids') or []
        # Only owner/admin can manage members
        manager: BoardMember | None = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
        if not manager and board.owner_id == current_user.id:
            # ensure owner membership exists
            db.session.add(BoardMember(board_id=board.id, user_id=current_user.id, role='owner'))
            db.session.flush()
            manager = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
        if (board.owner_id == current_user.id) or (manager and manager.role in ('owner', 'admin')):
            if isinstance(add_usernames, list):
                for uname in add_usernames:
                    if not isinstance(uname, str):
                        continue
                    u: User | None = User.query.filter_by(username=uname).first()
                    if u and not BoardMember.query.filter_by(board_id=board.id, user_id=u.id).first():
                        db.session.add(BoardMember(board_id=board.id, user_id=u.id, role='member'))
            if isinstance(add_user_ids, list):
                for uid in add_user_ids:
                    try:
                        uid_int: int = int(uid)
                    except (TypeError, ValueError):
                        continue
                    if not BoardMember.query.filter_by(board_id=board.id, user_id=uid_int).first():
                        db.session.add(BoardMember(board_id=board.id, user_id=uid_int, role='member'))
            if isinstance(remove_user_ids, list):
                for uid in remove_user_ids:
                    try:
                        uid_int: int = int(uid)
                    except (TypeError, ValueError):
                        continue
                    # prevent removing the owner
                    if uid_int == board.owner_id:
                        continue
                    bm = BoardMember.query.filter_by(board_id=board.id, user_id=uid_int).first()
                    if bm:
                        db.session.delete(bm)
        db.session.commit()
        return jsonify({'message': 'Board updated'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

@board_bp.route('/boards/<int:board_id>', methods=['DELETE'])
@token_required
def delete_board(current_user, board_id) -> Tuple[Response, int]:
    """
    Delete a specific board by ID.
    """
    try:
        board: Board | None = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
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
def list_board_tasks(current_user, board_id) -> Tuple[Response, int]:
    """
    List all tasks for a specific board.
    """
    try:
        board: Board | None = Board.query.filter_by(id=board_id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
            return jsonify({'message': 'Board not found'}), 404
        # order tasks by status column order then position then id
        status_order: dict[str, int] = {s.name: s.position for s in BoardStatus.query.filter_by(board_id=board.id).order_by(BoardStatus.position).all()}
        tasks: list[BoardTask] = BoardTask.query.filter_by(board_id=board.id).all()
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
def create_board_task(current_user, board_id) -> Tuple[Response, int]:
    """
    Create a new task in a specific board.
    """
    try:
        board: Board | None = Board.query.filter_by(id=board_id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        manager: BoardMember | None = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
        if not (board.owner_id == current_user.id or manager):
            return jsonify({'message': 'Board not found'}), 404
        data: dict = request.get_json() or {}
        title: str | None = data.get('title')
        if not title:
            return jsonify({'message': 'Title is required'}), 400
        # next position in the column (status)
        status: str | None = data.get('status', 'todo')
        # ensure status exists in this board, else add it at end
        status_row: BoardStatus | None = BoardStatus.query.filter_by(board_id=board.id, name=status).first()
        if not status_row:
            max_pos: int = db.session.query(db.func.max(BoardStatus.position)).filter_by(board_id=board.id).scalar() or 0
            db.session.add(BoardStatus(board_id=board.id, name=status, position=max_pos + 1))
            db.session.flush()
        last: BoardTask | None = (BoardTask.query
                .filter_by(board_id=board.id, status=status)
                .order_by(BoardTask.position.desc())
                .first())
        next_pos: int = (last.position + 1) if last and last.position is not None else 0
        # ensure priority exists in board priorities
        prio: str | None = data.get('priority', 'medium')
        if not BoardPriority.query.filter_by(board_id=board.id, name=prio).first():
            max_pp: int = db.session.query(db.func.max(BoardPriority.position)).filter_by(board_id=board.id).scalar() or 0
            db.session.add(BoardPriority(board_id=board.id, name=prio, position=max_pp + 1))
            db.session.flush()
        task: BoardTask = BoardTask(
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
def update_board_task(current_user, board_id, task_id) -> Tuple[Response, int]:
    """
    Update a specific task in a board.
    """
    try:
        board: Board | None = Board.query.filter_by(id=board_id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
            return jsonify({'message': 'Board not found'}), 404
        task: BoardTask | None = BoardTask.query.filter_by(id=task_id, board_id=board.id).first()
        if not task:
            return jsonify({'message': 'Task not found'}), 404
        data: dict = request.get_json() or {}
        for field in ['title', 'description', 'status', 'priority', 'assigned_to']:
            if field in data:
                # if changing to a new status ensure it exists
                if field == 'status':
                    new_status: str = data[field]
                    status_row: BoardStatus | None = BoardStatus.query.filter_by(board_id=board.id, name=new_status).first()
                    if not status_row:
                        max_pos: int = db.session.query(db.func.max(BoardStatus.position)).filter_by(board_id=board.id).scalar() or 0
                        db.session.add(BoardStatus(board_id=board.id, name=new_status, position=max_pos + 1))
                        db.session.flush()
                if field == 'priority':
                    new_prio: str = data[field]
                    prio_row: BoardPriority | None = BoardPriority.query.filter_by(board_id=board.id, name=new_prio).first()
                    if not prio_row:
                        max_pp: int = db.session.query(db.func.max(BoardPriority.position)).filter_by(board_id=board.id).scalar() or 0
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
def delete_board_task(current_user, board_id, task_id) -> Tuple[Response, int]:
    """Delete a specific task in a board."""
    try:
        board: Board | None = Board.query.filter_by(id=board_id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
            return jsonify({'message': 'Board not found'}), 404
        task: BoardTask | None = BoardTask.query.filter_by(id=task_id, board_id=board.id).first()
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
def reorder_tasks(current_user, board_id) -> Tuple[Response, int]:
    """Reorder tasks within a board. Body: { moves: [{ task_id, to_status, to_position }] }"""
    try:
        board: Board | None = Board.query.filter_by(id=board_id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
            return jsonify({'message': 'Board not found'}), 404
        data: dict = request.get_json() or {}
        moves: list[dict] = data.get('moves', [])
        if not isinstance(moves, list):
            return jsonify({'message': 'Invalid payload'}), 400

        for mv in moves:
            task_id: int | None = mv.get('task_id')
            to_status: str | None = mv.get('to_status')
            to_position: int | None = mv.get('to_position')
            if task_id is None or to_status is None or to_position is None:
                return jsonify({'message': 'Invalid move'}), 400
            task: BoardTask | None = BoardTask.query.filter_by(id=task_id, board_id=board.id).first()
            if not task:
                return jsonify({'message': f'Task {task_id} not found'}), 404
            # ensure destination status exists
            if not BoardStatus.query.filter_by(board_id=board.id, name=to_status).first():
                max_pos: int = db.session.query(db.func.max(BoardStatus.position)).filter_by(board_id=board.id).scalar() or 0
                db.session.add(BoardStatus(board_id=board.id, name=to_status, position=max_pos + 1))
                db.session.flush()
            # gather tasks in destination column (including the task if already there)
            col_tasks: list[BoardTask] = (BoardTask.query
                         .filter_by(board_id=board.id, status=to_status)
                         .order_by(BoardTask.position, BoardTask.id)
                         .all())
            # if moving from different status, remove from old column list by not including
            if task.status == to_status:
                # remove the task from its current spot in the list to reinsert
                col_tasks = [t for t in col_tasks if t.id != task.id]
            # clamp position
            insert_at: int = max(0, min(int(to_position), len(col_tasks)))
            # build new order and reindex
            new_order: list[BoardTask] = col_tasks[:insert_at] + [task] + col_tasks[insert_at:]
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
def list_statuses(current_user, board_id) -> Tuple[Response, int]:
    """List all statuses for a specific board."""
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
        return jsonify({'message': 'Board not found'}), 404
    statuses: list[BoardStatus] = BoardStatus.query.filter_by(board_id=board.id).order_by(BoardStatus.position, BoardStatus.id).all()
    return jsonify([
        {'id': s.id, 'name': s.name, 'position': s.position}
    for s in statuses]), 200

@board_bp.route('/boards/<int:board_id>/statuses', methods=['POST'])
@token_required
def create_status(current_user, board_id) -> Tuple[Response, int]:
    """Create a new status for a specific board."""
    board: Board | None = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    data: dict = request.get_json() or {}
    name: str | None = data.get('name')
    if not name:
        return jsonify({'message': 'Name is required'}), 400
    if BoardStatus.query.filter_by(board_id=board.id, name=name).first():
        return jsonify({'message': 'Status already exists'}), 400
    max_pos: int = db.session.query(db.func.max(BoardStatus.position)).filter_by(board_id=board.id).scalar() or 0
    status: BoardStatus = BoardStatus(board_id=board.id, name=name, position=max_pos + 1)
    db.session.add(status)
    db.session.commit()
    return jsonify({'id': status.id, 'name': status.name, 'position': status.position}), 201

@board_bp.route('/boards/<int:board_id>/statuses/<int:status_id>', methods=['PUT'])
@token_required
def update_status(current_user, board_id, status_id) -> Tuple[Response, int]:
    """
    Update a specific status in a board.
    """
    board: Board | None = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    status: BoardStatus | None = BoardStatus.query.filter_by(id=status_id, board_id=board.id).first()
    if not status:
        return jsonify({'message': 'Status not found'}), 404
    data: dict = request.get_json() or {}
    if 'name' in data:
        # enforce uniqueness per board
        if BoardStatus.query.filter(BoardStatus.board_id==board.id, BoardStatus.name==data['name'], BoardStatus.id!=status.id).first():
            return jsonify({'message': 'Status name already used'}), 400
        # update all tasks referencing old name
        old_name: str = status.name
        status.name = data['name']
        BoardTask.query.filter_by(board_id=board.id, status=old_name).update({BoardTask.status: data['name']})
    if 'position' in data:
        status.position = int(data['position'])
    db.session.commit()
    return jsonify({'message': 'Status updated'}), 200

@board_bp.route('/boards/<int:board_id>/statuses/<int:status_id>', methods=['DELETE'])
@token_required
def delete_status(current_user, board_id, status_id) -> Tuple[Response, int]:
    """
    Delete a specific status in a board.
    """
    board: Board | None = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    status: BoardStatus | None = BoardStatus.query.filter_by(id=status_id, board_id=board.id).first()
    if not status:
        return jsonify({'message': 'Status not found'}), 404
    # move tasks in this status to fallback (first status) or 'todo'
    fallback: BoardStatus | None = BoardStatus.query.filter_by(board_id=board.id).order_by(BoardStatus.position).first()
    fallback_name: str = fallback.name if fallback and fallback.id != status.id else 'todo'
    BoardTask.query.filter_by(board_id=board.id, status=status.name).update({BoardTask.status: fallback_name, BoardTask.position: 0})
    db.session.delete(status)
    db.session.commit()
    return jsonify({'message': 'Status deleted'}), 200

# Priority management endpoints
@board_bp.route('/boards/<int:board_id>/priorities', methods=['GET'])
@token_required
def list_priorities(current_user, board_id) -> Tuple[Response, int]:
    """
    List all priorities for a specific board.
    """
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
        return jsonify({'message': 'Board not found'}), 404
    priorities: list[BoardPriority] = BoardPriority.query.filter_by(board_id=board.id).order_by(BoardPriority.position, BoardPriority.id).all()
    return jsonify([
        {'id': p.id, 'name': p.name, 'position': p.position}
    for p in priorities]), 200

@board_bp.route('/boards/<int:board_id>/priorities', methods=['POST'])
@token_required
def create_priority(current_user, board_id) -> Tuple[Response, int]:
    """
    Create a new priority for a specific board.
    """
    board: Board | None = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    data: dict = request.get_json() or {}
    name: str | None = data.get('name')
    if not name:
        return jsonify({'message': 'Name is required'}), 400
    if BoardPriority.query.filter_by(board_id=board.id, name=name).first():
        return jsonify({'message': 'Priority already exists'}), 400
    max_pos: int = db.session.query(db.func.max(BoardPriority.position)).filter_by(board_id=board.id).scalar() or 0
    pr: BoardPriority = BoardPriority(board_id=board.id, name=name, position=max_pos + 1)
    db.session.add(pr)
    db.session.commit()
    return jsonify({'id': pr.id, 'name': pr.name, 'position': pr.position}), 201

@board_bp.route('/boards/<int:board_id>/priorities/<int:priority_id>', methods=['PUT'])
@token_required
def update_priority(current_user, board_id, priority_id) -> Tuple[Response, int]:
    """
    Update a specific priority in a board.
    """
    board: Board | None = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    pr: BoardPriority | None = BoardPriority.query.filter_by(id=priority_id, board_id=board.id).first()
    if not pr:
        return jsonify({'message': 'Priority not found'}), 404
    data: dict = request.get_json() or {}
    if 'name' in data:
        if BoardPriority.query.filter(BoardPriority.board_id==board.id, BoardPriority.name==data['name'], BoardPriority.id!=pr.id).first():
            return jsonify({'message': 'Priority name already used'}), 400
        old_name: str = pr.name
        pr.name = data['name']
        # update all tasks referencing old name
        BoardTask.query.filter_by(board_id=board.id, priority=old_name).update({BoardTask.priority: data['name']})
    if 'position' in data:
        pr.position = int(data['position'])
    db.session.commit()
    return jsonify({'message': 'Priority updated'}), 200

@board_bp.route('/boards/<int:board_id>/priorities/<int:priority_id>', methods=['DELETE'])
@token_required
def delete_priority(current_user, board_id, priority_id) -> Tuple[Response, int]:
    """
    Delete a specific priority in a board.
    """
    board: Board | None = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    pr: BoardPriority | None = BoardPriority.query.filter_by(id=priority_id, board_id=board.id).first()
    if not pr:
        return jsonify({'message': 'Priority not found'}), 404
    # move tasks with this priority to fallback (first priority) or 'medium'
    fallback: BoardPriority | None = BoardPriority.query.filter_by(board_id=board.id).order_by(BoardPriority.position).first()
    fallback_name: str = fallback.name if fallback and fallback.id != pr.id else 'medium'
    BoardTask.query.filter_by(board_id=board.id, priority=pr.name).update({BoardTask.priority: fallback_name})
    db.session.delete(pr)
    db.session.commit()
    return jsonify({'message': 'Priority deleted'}), 200

# Membership endpoints
@board_bp.route('/boards/<int:board_id>/members', methods=['GET'])
@token_required
def list_board_members(current_user, board_id) -> Tuple[Response, int]:
    """List all members of a specific board."""
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board_id, user_id=current_user.id).first():
        return jsonify({'message': 'Board not found'}), 404
    members = BoardMember.query.filter_by(board_id=board_id).all()
    return jsonify([
        {
            'id': m.id,
            'board_id': m.board_id,
            'user_id': m.user_id,
            'username': getattr(m.user, 'username', None),
            'role': m.role,
            'joined_at': m.joined_at.isoformat() if m.joined_at else None
        }
        for m in members
    ]), 200

@board_bp.route('/boards/<int:board_id>/members', methods=['POST'])
@token_required
def add_board_member(current_user, board_id) -> Tuple[Response, int]:
    """Add a member to a specific board."""
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    manager: BoardMember | None = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
    # If current user is the board owner, treat as owner and ensure membership exists
    if current_user.id == board.owner_id:
        if not manager:
            db.session.add(BoardMember(board_id=board.id, user_id=current_user.id, role='owner'))
            db.session.flush()
    else:
        if not manager or manager.role not in ('owner','admin'):
            return jsonify({'message': 'Insufficient permissions'}), 403
    data: dict = request.get_json() or {}
    user_id: str | None = data.get('user_id')
    username: str | None = data.get('username')
    role: str = data.get('role', 'member')
    uid: int | None = None
    if user_id is not None:
        try:
            uid = int(user_id)
        except (TypeError, ValueError):
            return jsonify({'message': 'Invalid user_id'}), 400
    elif username:
        u: User | None = User.query.filter_by(username=username).first()
        if not u:
            return jsonify({'message': 'User not found'}), 404
        uid = u.id
    else:
        return jsonify({'message': 'user_id or username required'}), 400
    if BoardMember.query.filter_by(board_id=board.id, user_id=uid).first():
        return jsonify({'message': 'Already a member'}), 400
    db.session.add(BoardMember(board_id=board.id, user_id=uid, role=role))
    db.session.commit()
    return jsonify({'message': 'Member added'}), 201

@board_bp.route('/boards/<int:board_id>/members/<int:user_id>', methods=['DELETE'])
@token_required
def remove_board_member(current_user, board_id, user_id) -> Tuple[Response, int]:
    """Remove a member from a specific board."""
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    manager: BoardMember | None = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
    # Allow board owner to manage even if membership row is missing; ensure it's present
    if current_user.id == board.owner_id:
        if not manager:
            db.session.add(BoardMember(board_id=board.id, user_id=current_user.id, role='owner'))
            db.session.flush()
    else:
        if not manager or manager.role not in ('owner','admin'):
            return jsonify({'message': 'Insufficient permissions'}), 403
    if user_id == board.owner_id:
        return jsonify({'message': 'Cannot remove owner'}), 400
    bm: BoardMember | None = BoardMember.query.filter_by(board_id=board.id, user_id=user_id).first()
    if not bm:
        return jsonify({'message': 'Not a member'}), 404
    db.session.delete(bm)
    db.session.commit()
    return jsonify({'message': 'Member removed'}), 200
