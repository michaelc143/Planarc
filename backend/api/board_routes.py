""" Board and Task routes for the API """
import json
from datetime import datetime
from typing import Tuple
import sqlalchemy.exc
from auth_middleware import token_required
from flask import Blueprint, jsonify, request, Response
from models import Board, BoardPriority, BoardStatus, BoardTask, UserDefaults, BoardMember, User, TaskDependency, ActivityLog, BoardSprint, db
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
                'id': board.id,
                'name': board.name,
                'description': board.description or '',
                'owner_id': board.owner_id,
                'created_at': board.created_at.isoformat(),
                'updated_at': board.updated_at.isoformat() if board.updated_at else None,
                'background_color': getattr(board, 'background_color', None)
            } for board in boards
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
        background_color: str | None = data.get('background_color')
        board = Board(name=name, description=description, owner_id=current_user.id, background_color=background_color)
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
            for username_to_invite in invite_usernames:
                if not isinstance(username_to_invite, str):
                    continue
                user_to_invite: User | None = User.query.filter_by(username=username_to_invite).first()
                if user_to_invite and user_to_invite.id != current_user.id:
                    if not BoardMember.query.filter_by(board_id=board.id, user_id=user_to_invite.id).first():
                        db.session.add(BoardMember(board_id=board.id, user_id=user_to_invite.id, role='member'))
        if isinstance(invite_ids, list):
            for user_to_invite_id in invite_ids:
                try:
                    user_to_invite_id_int: int = int(user_to_invite_id)
                except (TypeError, ValueError):
                    continue
                if user_to_invite_id_int != current_user.id:
                    if not BoardMember.query.filter_by(board_id=board.id, user_id=user_to_invite_id_int).first():
                        db.session.add(BoardMember(board_id=board.id, user_id=user_to_invite_id_int, role='member'))
        # seed default statuses for the board if none provided
        default_statuses: list[str] | None = data.get('statuses')
        if not default_statuses:
            # try per-user defaults
            user_defaults: UserDefaults | None = UserDefaults.query.filter_by(user_id=current_user.id).first()
            if user_defaults and user_defaults.default_statuses:
                try:
                    parsed_user_default_statuses: list[str] | None = json.loads(user_defaults.default_statuses)
                    if isinstance(parsed_user_default_statuses, list) and parsed_user_default_statuses:
                        default_statuses = [str(x) for x in parsed_user_default_statuses if isinstance(x, str) and x.strip()]
                except json.JSONDecodeError:
                    default_statuses = None
        if not default_statuses:
            default_statuses = ['todo', 'in_progress', 'review', 'done']
        try:
            for idx, s in enumerate(default_statuses):
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
                    parsed_user_default_priorities: list[str] | None = json.loads(user_defaults.default_priorities)
                    if isinstance(parsed_user_default_priorities, list) and parsed_user_default_priorities:
                        default_priorities: list[str] | None = [str(x) for x in parsed_user_default_priorities if isinstance(x, str) and x.strip()]
                except json.JSONDecodeError:
                    default_priorities = None
        if not default_priorities:
            default_priorities = ['low', 'medium', 'high', 'critical']
        try:
            for idx, priority in enumerate(default_priorities):
                db.session.add(BoardPriority(board_id=board.id, name=priority, position=idx))
            db.session.commit()
        except sqlalchemy.exc.SQLAlchemyError:
            db.session.rollback()
        return jsonify({
            'id': board.id,
            'name': board.name,
            'description': board.description or '',
            'owner_id': board.owner_id,
            'created_at': board.created_at.isoformat(),
            'updated_at': board.updated_at.isoformat() if board.updated_at else None,
            'background_color': getattr(board, 'background_color', None)
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
            'updated_at': board.updated_at.isoformat() if board.updated_at else None,
            'background_color': getattr(board, 'background_color', None)
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
        if 'background_color' in data:
            board.background_color = data['background_color']
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
                for username_to_add in add_usernames:
                    if not isinstance(username_to_add, str):
                        continue
                    user_to_add: User | None = User.query.filter_by(username=username_to_add).first()
                    if user_to_add and not BoardMember.query.filter_by(board_id=board.id, user_id=user_to_add.id).first():
                        db.session.add(BoardMember(board_id=board.id, user_id=user_to_add.id, role='member'))
            if isinstance(add_user_ids, list):
                for user_id_to_add in add_user_ids:
                    try:
                        user_id_to_add_int: int = int(user_id_to_add)
                    except (TypeError, ValueError):
                        continue
                    if not BoardMember.query.filter_by(board_id=board.id, user_id=user_id_to_add_int).first():
                        db.session.add(BoardMember(board_id=board.id, user_id=user_id_to_add_int, role='member'))
            if isinstance(remove_user_ids, list):
                for user_id_to_remove in remove_user_ids:
                    try:
                        user_id_to_remove_int: int = int(user_id_to_remove)
                    except (TypeError, ValueError):
                        continue
                    # prevent removing the owner
                    if user_id_to_remove_int == board.owner_id:
                        continue
                    board_member = BoardMember.query.filter_by(board_id=board.id, user_id=user_id_to_remove_int).first()
                    if board_member:
                        db.session.delete(board_member)
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
                'id': task.id,
                'title': task.title,
                'description': task.description or '',
                'status': task.status,
                'priority': task.priority,
                'board_id': task.board_id,
                'assigned_to': task.assigned_to,
                'labels': getattr(task, 'labels', None),
                'sprint_id': getattr(task, 'sprint_id', None),
                'created_by': task.created_by,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'estimate': task.estimate,
                'effort_used': task.effort_used,
                'position': task.position,
                'created_at': task.created_at.isoformat(),
                'updated_at': task.updated_at.isoformat() if task.updated_at else None
            } for task in tasks
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
            position=next_pos,
            estimate=(int(data['estimate']) if 'estimate' in data and isinstance(data['estimate'], (int, str)) and str(data['estimate']).isdigit() else None),
            effort_used=(int(data['effort_used']) if 'effort_used' in data and isinstance(data['effort_used'], (int, str)) and str(data['effort_used']).isdigit() else 0),
            labels=(",".join(data['labels']) if isinstance(data.get('labels'), list) else data.get('labels')),
            sprint_id=(int(data['sprint_id']) if 'sprint_id' in data and isinstance(data['sprint_id'], (int, str)) and str(data['sprint_id']).isdigit() else None)
        )
        db.session.add(task)
        db.session.commit()
        try:
            db.session.add(ActivityLog(board_id=board.id, user_id=current_user.id, action='create', entity_type='task', entity_id=task.id, before=None, after=json.dumps({'title': task.title})))
            db.session.commit()
        except sqlalchemy.exc.SQLAlchemyError:
            db.session.rollback()
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description or '',
            'status': task.status,
            'priority': task.priority,
            'board_id': task.board_id,
            'assigned_to': task.assigned_to,
            'labels': getattr(task, 'labels', None),
            'sprint_id': getattr(task, 'sprint_id', None),
            'created_by': task.created_by,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'estimate': task.estimate,
            'effort_used': task.effort_used,
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
        before_snapshot = {
            'title': task.title,
            'description': task.description,
            'status': task.status,
            'priority': task.priority,
            'assigned_to': task.assigned_to,
            'labels': getattr(task, 'labels', None),
            'estimate': task.estimate,
            'effort_used': task.effort_used
        }
        for field in ['title', 'description', 'status', 'priority', 'assigned_to', 'labels', 'estimate', 'effort_used']:
            if field in data:
                # if changing to a new status ensure it exists
                if field == 'status':
                    new_status: str = data[field]
                    status_row: BoardStatus | None = BoardStatus.query.filter_by(board_id=board.id, name=new_status).first()
                    if not status_row:
                        max_pos: int = db.session.query(db.func.max(BoardStatus.position)).filter_by(board_id=board.id).scalar() or 0
                        db.session.add(BoardStatus(board_id=board.id, name=new_status, position=max_pos + 1))
                        db.session.flush()
                elif field == 'priority':
                    new_prio: str = data[field]
                    prio_row: BoardPriority | None = BoardPriority.query.filter_by(board_id=board.id, name=new_prio).first()
                    if not prio_row:
                        max_pp: int = db.session.query(db.func.max(BoardPriority.position)).filter_by(board_id=board.id).scalar() or 0
                        db.session.add(BoardPriority(board_id=board.id, name=new_prio, position=max_pp + 1))
                        db.session.flush()
                elif field == 'estimate':
                    val = data[field]
                    task.estimate = int(val) if isinstance(val, (int, str)) and str(val).isdigit() else None
                elif field == 'effort_used':
                    val2 = data[field]
                    # Treat missing/invalid as 0
                    task.effort_used = int(val2) if isinstance(val2, (int, str)) and str(val2).isdigit() else 0
                elif field == 'labels':
                    val3 = data[field]
                    task.labels = ",".join(val3) if isinstance(val3, list) else val3
                else:
                    setattr(task, field, data[field])
        if 'sprint_id' in data:
            try:
                task.sprint_id = int(data['sprint_id']) if data['sprint_id'] is not None else None
            except (TypeError, ValueError):
                task.sprint_id = None
        if 'due_date' in data:
            task.due_date = _parse_date(data.get('due_date'))
        db.session.commit()
        try:
            db.session.add(ActivityLog(board_id=board.id, user_id=current_user.id, action='update', entity_type='task', entity_id=task.id, before=json.dumps(before_snapshot), after=json.dumps(data)))
            db.session.commit()
        except sqlalchemy.exc.SQLAlchemyError:
            db.session.rollback()
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
        try:
            db.session.add(ActivityLog(board_id=board.id, user_id=current_user.id, action='delete', entity_type='task', entity_id=task.id, before=json.dumps({'title': task.title}), after=None))
            db.session.commit()
        except sqlalchemy.exc.SQLAlchemyError:
            db.session.rollback()
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
        try:
            db.session.add(ActivityLog(board_id=board.id, user_id=current_user.id, action='reorder', entity_type='task', entity_id=None, before=None, after=json.dumps({'moves': moves})))
            db.session.commit()
        except sqlalchemy.exc.SQLAlchemyError:
            db.session.rollback()
        return jsonify({'message': 'Reordered'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

# Task dependencies
@board_bp.route('/boards/<int:board_id>/dependencies', methods=['GET'])
@token_required
def list_dependencies(current_user, board_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
        return jsonify({'message': 'Board not found'}), 404
    deps: list[TaskDependency] = TaskDependency.query.filter_by(board_id=board.id).all()
    return jsonify([
        {
            'id': d.id,
            'board_id': d.board_id,
            'blocker_task_id': d.blocker_task_id,
            'blocked_task_id': d.blocked_task_id,
            'created_at': d.created_at.isoformat() if d.created_at else None
        } for d in deps
    ]), 200

@board_bp.route('/boards/<int:board_id>/dependencies', methods=['POST'])
@token_required
def create_dependency(current_user, board_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    manager: BoardMember | None = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
    if not (board.owner_id == current_user.id or manager):
        return jsonify({'message': 'Board not found'}), 404
    data_obj = request.get_json() or {}
    blocker_raw = data_obj.get('blocker_task_id')
    blocked_raw = data_obj.get('blocked_task_id')
    try:
        blocker_id = int(blocker_raw)  # type: ignore[arg-type]
        blocked_id = int(blocked_raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return jsonify({'message': 'Invalid task IDs'}), 400
    if blocker_id == blocked_id:
        return jsonify({'message': 'A task cannot depend on itself'}), 400
    # ensure tasks exist and belong to board
    if not BoardTask.query.filter_by(id=blocker_id, board_id=board.id).first() or not BoardTask.query.filter_by(id=blocked_id, board_id=board.id).first():
        return jsonify({'message': 'Task not found'}), 404
    # prevent duplicate
    if TaskDependency.query.filter_by(board_id=board.id, blocker_task_id=blocker_id, blocked_task_id=blocked_id).first():
        return jsonify({'message': 'Dependency already exists'}), 400
    # Detect trivial cycle (blocked -> blocker already exists). Full cycle detection can be added later.
    if TaskDependency.query.filter_by(board_id=board.id, blocker_task_id=blocked_id, blocked_task_id=blocker_id).first():
        return jsonify({'message': 'Circular dependency not allowed'}), 400
    dep = TaskDependency(board_id=board.id, blocker_task_id=blocker_id, blocked_task_id=blocked_id)
    db.session.add(dep)
    db.session.commit()
    return jsonify({'id': dep.id, 'board_id': dep.board_id, 'blocker_task_id': dep.blocker_task_id, 'blocked_task_id': dep.blocked_task_id}), 201

@board_bp.route('/boards/<int:board_id>/dependencies/<int:dep_id>', methods=['DELETE'])
@token_required
def delete_dependency(current_user, board_id, dep_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    manager: BoardMember | None = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
    if not (board.owner_id == current_user.id or manager):
        return jsonify({'message': 'Board not found'}), 404
    dep: TaskDependency | None = TaskDependency.query.filter_by(id=dep_id, board_id=board.id).first()
    if not dep:
        return jsonify({'message': 'Dependency not found'}), 404
    db.session.delete(dep)
    db.session.commit()
    return jsonify({'message': 'Dependency removed'}), 200

# Bulk update tasks
@board_bp.route('/boards/<int:board_id>/tasks/bulk', methods=['POST'])
@token_required
def bulk_update_tasks(current_user, board_id) -> Tuple[Response, int]:
    try:
        board: Board | None = Board.query.filter_by(id=board_id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
            return jsonify({'message': 'Board not found'}), 404
        data = request.get_json() or {}
        task_ids = data.get('task_ids', [])
        changes = data.get('changes', {}) or {}
        if not isinstance(task_ids, list) or not task_ids:
            return jsonify({'message': 'task_ids required'}), 400
        updates = {}
        if 'status' in changes and changes['status']:
            if not BoardStatus.query.filter_by(board_id=board.id, name=changes['status']).first():
                max_pos: int = db.session.query(db.func.max(BoardStatus.position)).filter_by(board_id=board.id).scalar() or 0
                db.session.add(BoardStatus(board_id=board.id, name=changes['status'], position=max_pos + 1))
                db.session.flush()
            updates['status'] = changes['status']
        if 'assigned_to' in changes:
            updates['assigned_to'] = changes['assigned_to']
        if 'estimate' in changes:
            try:
                updates['estimate'] = int(changes['estimate']) if changes['estimate'] is not None else None
            except (TypeError, ValueError):
                pass
        if 'labels' in changes:
            updates['labels'] = (",".join(changes['labels']) if isinstance(changes['labels'], list) else changes['labels'])
        if updates:
            (BoardTask.query
                .filter(BoardTask.board_id==board.id, BoardTask.id.in_(task_ids))
                .update(updates, synchronize_session=False))
            db.session.commit()
            try:
                db.session.add(ActivityLog(board_id=board.id, user_id=current_user.id, action='bulk_update', entity_type='task', entity_id=None, before=None, after=json.dumps({'task_ids': task_ids, 'changes': changes})))
                db.session.commit()
            except sqlalchemy.exc.SQLAlchemyError:
                db.session.rollback()
        return jsonify({'message': 'Updated'}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

# Sprint persistence
@board_bp.route('/boards/<int:board_id>/sprint', methods=['PUT'])
@token_required
def update_board_sprint(current_user, board_id) -> Tuple[Response, int]:
    try:
        board: Board | None = Board.query.filter_by(id=board_id).first()
        if not board:
            return jsonify({'message': 'Board not found'}), 404
        if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
            return jsonify({'message': 'Board not found'}), 404
        data = request.get_json() or {}
        board.sprint_start = _parse_date(data.get('sprint_start'))
        board.sprint_end = _parse_date(data.get('sprint_end'))
        db.session.commit()
        try:
            db.session.add(ActivityLog(board_id=board.id, user_id=current_user.id, action='sprint_update', entity_type='board', entity_id=board.id, before=None, after=json.dumps({'sprint_start': data.get('sprint_start'), 'sprint_end': data.get('sprint_end')})))
            db.session.commit()
        except sqlalchemy.exc.SQLAlchemyError:
            db.session.rollback()
        return jsonify({'sprint_start': board.sprint_start.isoformat() if board.sprint_start else None, 'sprint_end': board.sprint_end.isoformat() if board.sprint_end else None}), 200
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

@board_bp.route('/boards/<int:board_id>/sprint', methods=['GET'])
@token_required
def get_board_sprint(current_user, board_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
        return jsonify({'message': 'Board not found'}), 404
    return jsonify({'sprint_start': board.sprint_start.isoformat() if board.sprint_start else None, 'sprint_end': board.sprint_end.isoformat() if board.sprint_end else None}), 200

# Reports
@board_bp.route('/boards/<int:board_id>/reports/burnup', methods=['GET'])
@token_required
def burnup_data(current_user, board_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    tasks: list[BoardTask] = BoardTask.query.filter_by(board_id=board.id).all()
    total = sum((t.estimate or 0) for t in tasks)
    done = sum((min(t.estimate or 0, t.effort_used or 0) if t.status == 'done' else 0) for t in tasks)
    return jsonify({'scope_total': total, 'completed_total': done, 'sprint_start': board.sprint_start.isoformat() if board.sprint_start else None, 'sprint_end': board.sprint_end.isoformat() if board.sprint_end else None}), 200

@board_bp.route('/boards/<int:board_id>/reports/cfd', methods=['GET'])
@token_required
def cfd_data(current_user, board_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    statuses: list[BoardStatus] = BoardStatus.query.filter_by(board_id=board.id).order_by(BoardStatus.position).all()
    counts = { s.name: BoardTask.query.filter_by(board_id=board.id, status=s.name).count() for s in statuses }
    return jsonify({'counts': counts}), 200

# Activity log listing
@board_bp.route('/boards/<int:board_id>/activity', methods=['GET'])
@token_required
def list_activity(current_user, board_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
        return jsonify({'message': 'Board not found'}), 404
    action = request.args.get('action')
    entity_type = request.args.get('entity_type')
    q = ActivityLog.query.filter_by(board_id=board.id)
    if action:
        q = q.filter_by(action=action)
    if entity_type:
        q = q.filter_by(entity_type=entity_type)
    q = q.order_by(ActivityLog.created_at.desc()).limit(200)
    items = q.all()
    return jsonify([
        {
            'id': a.id,
            'board_id': a.board_id,
            'user_id': a.user_id,
            'action': a.action,
            'entity_type': a.entity_type,
            'entity_id': a.entity_id,
            'before': a.before,
            'after': a.after,
            'created_at': a.created_at.isoformat() if a.created_at else None
        }
        for a in items
    ]), 200

# Multiple sprint management
@board_bp.route('/boards/<int:board_id>/sprints', methods=['GET'])
@token_required
def list_sprints(current_user, board_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
        return jsonify({'message': 'Board not found'}), 404
    sprints: list[BoardSprint] = BoardSprint.query.filter_by(board_id=board.id).order_by(BoardSprint.start_date.desc()).all()
    return jsonify([
        {
            'id': s.id,
            'name': s.name,
            'start_date': s.start_date.isoformat() if s.start_date else None,
            'end_date': s.end_date.isoformat() if s.end_date else None,
            'goal': s.goal,
            'is_active': bool(s.is_active)
        } for s in sprints
    ]), 200

@board_bp.route('/boards/<int:board_id>/sprints', methods=['POST'])
@token_required
def create_sprint(current_user, board_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    manager: BoardMember | None = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
    if not (board.owner_id == current_user.id or manager):
        return jsonify({'message': 'Board not found'}), 404
    data = request.get_json() or {}
    sd = _parse_date(data.get('start_date'))
    ed = _parse_date(data.get('end_date'))
    if not sd or not ed or sd > ed:
        return jsonify({'message': 'Invalid dates'}), 400
    sprint = BoardSprint(board_id=board.id, start_date=sd, end_date=ed, name=data.get('name'), goal=data.get('goal'), is_active=int(bool(data.get('is_active', False))))
    if sprint.is_active:
        BoardSprint.query.filter_by(board_id=board.id, is_active=1).update({'is_active': 0})
    db.session.add(sprint)
    db.session.commit()
    try:
        db.session.add(ActivityLog(board_id=board.id, user_id=current_user.id, action='sprint_create', entity_type='sprint', entity_id=sprint.id, before=None, after=json.dumps({'start_date': sprint.start_date.isoformat(), 'end_date': sprint.end_date.isoformat()})))
        db.session.commit()
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
    return jsonify({'id': sprint.id}), 201

@board_bp.route('/boards/<int:board_id>/sprints/<int:sprint_id>', methods=['PUT'])
@token_required
def update_sprint(current_user, board_id, sprint_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    manager: BoardMember | None = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
    if not (board.owner_id == current_user.id or manager):
        return jsonify({'message': 'Board not found'}), 404
    s: BoardSprint | None = BoardSprint.query.filter_by(id=sprint_id, board_id=board.id).first()
    if not s:
        return jsonify({'message': 'Sprint not found'}), 404
    data = request.get_json() or {}
    before = {'name': s.name, 'start_date': s.start_date.isoformat(), 'end_date': s.end_date.isoformat(), 'goal': s.goal, 'is_active': bool(s.is_active)}
    if 'name' in data:
        s.name = data['name']
    if 'goal' in data:
        s.goal = data['goal']
    if 'start_date' in data:
        sd = _parse_date(data.get('start_date'))
        if sd:
            s.start_date = sd
    if 'end_date' in data:
        ed = _parse_date(data.get('end_date'))
        if ed:
            s.end_date = ed
    if 'is_active' in data:
        s.is_active = 1 if data['is_active'] else 0
        if s.is_active:
            BoardSprint.query.filter_by(board_id=board.id, is_active=1).update({'is_active': 0})
            s.is_active = 1
    db.session.commit()
    try:
        db.session.add(ActivityLog(board_id=board.id, user_id=current_user.id, action='sprint_update', entity_type='sprint', entity_id=s.id, before=json.dumps(before), after=json.dumps({'name': s.name, 'start_date': s.start_date.isoformat(), 'end_date': s.end_date.isoformat(), 'goal': s.goal, 'is_active': bool(s.is_active)})))
        db.session.commit()
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
    return jsonify({'message': 'Sprint updated'}), 200

@board_bp.route('/boards/<int:board_id>/sprints/<int:sprint_id>', methods=['DELETE'])
@token_required
def delete_sprint(current_user, board_id, sprint_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    manager: BoardMember | None = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
    if not (board.owner_id == current_user.id or manager):
        return jsonify({'message': 'Board not found'}), 404
    s: BoardSprint | None = BoardSprint.query.filter_by(id=sprint_id, board_id=board.id).first()
    if not s:
        return jsonify({'message': 'Sprint not found'}), 404
    db.session.delete(s)
    db.session.commit()
    try:
        db.session.add(ActivityLog(board_id=board.id, user_id=current_user.id, action='sprint_delete', entity_type='sprint', entity_id=sprint_id, before=None, after=None))
        db.session.commit()
    except sqlalchemy.exc.SQLAlchemyError:
        db.session.rollback()
    return jsonify({'message': 'Sprint deleted'}), 200

@board_bp.route('/boards/<int:board_id>/sprints/active', methods=['GET'])
@token_required
def get_active_sprint(current_user, board_id) -> Tuple[Response, int]:
    board: Board | None = Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    if board.owner_id != current_user.id and not BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first():
        return jsonify({'message': 'Board not found'}), 404
    s: BoardSprint | None = BoardSprint.query.filter_by(board_id=board.id, is_active=1).order_by(BoardSprint.start_date.desc()).first()
    if not s:
        return jsonify({ 'sprint': None }), 200
    return jsonify({
        'sprint': {
            'id': s.id,
            'name': s.name,
            'start_date': s.start_date.isoformat(),
            'end_date': s.end_date.isoformat(),
            'goal': s.goal,
            'is_active': bool(s.is_active)
        }
    }), 200

# Board templates: simple payload of statuses and priorities
@board_bp.route('/boards/templates', methods=['GET'])
@token_required
def list_board_templates(current_user) -> Tuple[Response, int]:
    # TODO: Make so kanban basic and scrum sprint are defaults for every user, add sql table, add model if needed, wire up
    templates = [
        {
            'id': 'kanban-basic',
            'name': 'Kanban (Basic)',
            'statuses': ['todo', 'in_progress', 'review', 'done'],
            'priorities': ['low', 'medium', 'high']
        },
        {
            'id': 'scrum-sprint',
            'name': 'Scrum Sprint',
            'statuses': ['backlog', 'selected', 'in_progress', 'review', 'done'],
            'priorities': ['low', 'medium', 'high', 'critical']
        }
    ]
    return jsonify(templates), 200

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
        {'id': status.id, 'name': status.name, 'position': status.position, 'color': getattr(status, 'color', None)}
    for status in statuses]), 200

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
    status_color: str | None = data.get('color')
    status: BoardStatus = BoardStatus(board_id=board.id, name=name, position=max_pos + 1, color=status_color)
    db.session.add(status)
    db.session.commit()
    return jsonify({'id': status.id, 'name': status.name, 'position': status.position, 'color': getattr(status, 'color', None)}), 201

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
    if 'color' in data:
        status.color = data['color']
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
        {'id': priority.id, 'name': priority.name, 'position': priority.position}
    for priority in priorities]), 200

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
    # Bump the max index and set the new priority
    max_pos: int = db.session.query(db.func.max(BoardPriority.position)).filter_by(board_id=board.id).scalar() or 0
    board_priority: BoardPriority = BoardPriority(board_id=board.id, name=name, position=max_pos + 1)
    db.session.add(board_priority)
    db.session.commit()
    return jsonify({'id': board_priority.id, 'name': board_priority.name, 'position': board_priority.position}), 201

@board_bp.route('/boards/<int:board_id>/priorities/<int:priority_id>', methods=['PUT'])
@token_required
def update_priority(current_user, board_id, priority_id) -> Tuple[Response, int]:
    """
    Update a specific priority in a board.
    """
    board: Board | None = Board.query.filter_by(id=board_id, owner_id=current_user.id).first()
    if not board:
        return jsonify({'message': 'Board not found'}), 404
    board_priority: BoardPriority | None = BoardPriority.query.filter_by(id=priority_id, board_id=board.id).first()
    if not board_priority:
        return jsonify({'message': 'Priority not found'}), 404
    data: dict = request.get_json() or {}
    if 'name' in data:
        if BoardPriority.query.filter(BoardPriority.board_id==board.id, BoardPriority.name==data['name'], BoardPriority.id!=board_priority.id).first():
            return jsonify({'message': 'Priority name already used'}), 400
        old_name: str = board_priority.name
        board_priority.name = data['name']
        # update all tasks referencing old name
        BoardTask.query.filter_by(board_id=board.id, priority=old_name).update({BoardTask.priority: data['name']})
    if 'position' in data:
        board_priority.position = int(data['position'])
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
    board_priority: BoardPriority | None = BoardPriority.query.filter_by(id=priority_id, board_id=board.id).first()
    if not board_priority:
        return jsonify({'message': 'Priority not found'}), 404
    # move tasks with this priority to fallback (first priority) or 'medium'
    fallback: BoardPriority | None = BoardPriority.query.filter_by(board_id=board.id).order_by(BoardPriority.position).first()
    fallback_name: str = fallback.name if fallback and fallback.id != board_priority.id else 'medium'
    BoardTask.query.filter_by(board_id=board.id, priority=board_priority.name).update({BoardTask.priority: fallback_name})
    db.session.delete(board_priority)
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
            'id': member.id,
            'board_id': member.board_id,
            'user_id': member.user_id,
            'username': getattr(member.user, 'username', None),
            'role': member.role,
            'joined_at': member.joined_at.isoformat() if member.joined_at else None
        }
        for member in members
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
    user_to_add_id: int | None = None
    if user_id is not None:
        try:
            user_to_add_id = int(user_id)
        except (TypeError, ValueError):
            return jsonify({'message': 'Invalid user_id'}), 400
    elif username:
        user_to_add: User | None = User.query.filter_by(username=username).first()
        if not user_to_add:
            return jsonify({'message': 'User not found'}), 404
        user_to_add_id = user_to_add.id
    else:
        return jsonify({'message': 'user_id or username required'}), 400
    if BoardMember.query.filter_by(board_id=board.id, user_id=user_to_add_id).first():
        return jsonify({'message': 'Already a member'}), 400
    db.session.add(BoardMember(board_id=board.id, user_id=user_to_add_id, role=role))
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
    board_member_to_remove: BoardMember | None = BoardMember.query.filter_by(board_id=board.id, user_id=user_id).first()
    if not board_member_to_remove:
        return jsonify({'message': 'Not a member'}), 404
    db.session.delete(board_member_to_remove)
    db.session.commit()
    return jsonify({'message': 'Member removed'}), 200
