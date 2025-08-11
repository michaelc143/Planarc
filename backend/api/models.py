""" Models for the app backend """
from __future__ import annotations
from typing import Optional
from datetime import datetime, date
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Integer, Text, ForeignKey, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

db = SQLAlchemy()

class User(db.Model):
    """ User Model
        {
            id: int,
            username: str,
            email: str,
            dateJoined: datetime,
            role: str
        }
    """
    __tablename__: str = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=db.func.current_timestamp())

    def __init__(self, username, password, email):
        self.username = username
        self.password = password
        self.email = email

# New models for Boards and Tasks on Boards
class Board(db.Model):
    """ Board Model
        {
            id: int,
            name: str,
            description: str,
            owner_id: int,
            created_at: datetime,
            updated_at: datetime
        }
    """
    __tablename__: str = 'boards'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=db.func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    # Persist sprint date range for burndown/burn-up across devices
    sprint_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True, default=None)
    sprint_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True, default=None)
    # Optional background color for the board UI (e.g. hex like #ffffff)
    background_color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)

    owner: Mapped['User'] = relationship('User', backref=db.backref('boards', lazy=True))

    def __init__(self, name, description, owner_id, background_color: Optional[str] = None, sprint_start: Optional[date] = None, sprint_end: Optional[date] = None):
        self.name = name
        self.description = description
        self.owner_id = owner_id
        self.background_color = background_color
        self.sprint_start = sprint_start
        self.sprint_end = sprint_end

class UserDefaults(db.Model):
    """ Per-user defaults for new boards
        {
            id: int,
            user_id: int,
            default_statuses: list[str],
            default_priorities: list[str],
            created_at: datetime,
            updated_at: datetime
        }
    """
    __tablename__: str = 'user_defaults'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    # Store as JSON-encoded TEXT to work across MySQL/SQLite
    default_statuses: Mapped[str] = mapped_column(Text)
    default_priorities: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    user: Mapped['User'] = relationship('User', backref=db.backref('defaults', lazy=True, cascade="all, delete-orphan"))

    def __init__(self, user_id, default_statuses, default_priorities):
        self.user_id = user_id
        self.default_statuses = default_statuses
        self.default_priorities = default_priorities

class BoardStatus(db.Model):
    """ Custom statuses per board
        {
            id: int,
            board_id: int,
            name: str
        }
    """
    __tablename__: str = 'board_statuses'
    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)  # order of columns
    # Optional background color per status column (e.g. hex like #f3f4f6)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)

    __table_args__: tuple = (
        db.UniqueConstraint('board_id', 'name', name='uq_board_status_name'),
    )

    board: Mapped['Board'] = relationship('Board', backref=db.backref('statuses', lazy=True, cascade="all, delete-orphan"))

    def __init__(self, board_id, name, position, color: Optional[str] = None):
        self.board_id = board_id
        self.name = name
        self.position = position
        self.color = color

class BoardPriority(db.Model):
    """ Custom priorities per board
        {
            id: int,
            board_id: int,
            name: str
        }
    """
    __tablename__: str = 'board_priorities'
    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)  # order of priorities

    __table_args__: tuple = (
        db.UniqueConstraint('board_id', 'name', name='uq_board_priority_name'),
    )

    board: Mapped['Board'] = relationship('Board', backref=db.backref('priorities', lazy=True, cascade="all, delete-orphan"))

    def __init__(self, board_id, name, position):
        self.board_id = board_id
        self.name = name
        self.position = position

class BoardTask(db.Model):
    """ Task Model scoped to a Board
        {
            id: int,
            board_id: int,
            title: str,
            description: str,
            assigned_to: int,
            created_by: int,
            due_date: date,
            position: int,
            created_at: datetime,
            updated_at: datetime
        }
    """
    __tablename__: str = 'board_tasks'
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default='todo')  # free-form tied to BoardStatus.name
    # priority becomes a free-form string tied to BoardPriority.name
    priority: Mapped[str] = mapped_column(String(50), default='medium')
    board_id: Mapped[int] = mapped_column(ForeignKey('boards.id', ondelete='CASCADE'))
    # Optional sprint association
    sprint_id: Mapped[Optional[int]] = mapped_column(ForeignKey('board_sprints.id', ondelete='SET NULL'), nullable=True)
    assigned_to: Mapped[Optional[int]] = mapped_column(ForeignKey('users.id'), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey('users.id'))
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)  # Order within its status column
    # Optional estimate of effort (e.g., story points)
    estimate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=None)
    # Actual effort used (e.g., story points consumed)
    effort_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=db.func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    # optional labels stored as CSV for simplicity
    labels: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)

    board: Mapped['Board'] = relationship('Board', backref=db.backref('tasks', lazy=True, cascade="all, delete-orphan"))
    assignee: Mapped['User'] = relationship('User', foreign_keys=[assigned_to], backref=db.backref('assigned_board_tasks', lazy=True))
    creator: Mapped['User'] = relationship('User', foreign_keys=[created_by], backref=db.backref('created_board_tasks', lazy=True))

    def __init__(self, title, description, assigned_to, created_by, due_date, position, status, priority, board_id, estimate=None, effort_used: Optional[int] | None = 0, labels: Optional[str] = None, sprint_id: Optional[int] = None):
        self.title = title
        self.description = description
        self.assigned_to = assigned_to
        self.created_by = created_by
        self.due_date = due_date
        self.position = position
        self.status = status
        self.priority = priority
        self.board_id = board_id
        self.estimate = estimate
        self.effort_used = effort_used
        self.labels = labels
        self.sprint_id = sprint_id

class BoardMember(db.Model):
    """ Membership for boards
        {
            id: int,
            board_id: int,
            user_id: int
        }
    """
    __tablename__ = 'board_members'

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default='member')  # owner|admin|member|viewer
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=db.func.current_timestamp())

    __table_args__ = (
        db.UniqueConstraint('board_id', 'user_id', name='uq_board_user'),
    )

    board: Mapped['Board'] = relationship('Board', backref=db.backref('members', lazy=True, cascade="all, delete-orphan"))
    user: Mapped['User'] = relationship('User', backref=db.backref('board_memberships', lazy=True, cascade="all, delete-orphan"))
    def __init__(self, board_id, user_id, role):
        self.board_id = board_id
        self.user_id = user_id
        self.role = role

# Task dependency edges (blocker -> blocked)
class TaskDependency(db.Model):
    """ Directed dependency between tasks on the same board.
        blocker_task_id blocks blocked_task_id.
    """
    __tablename__ = 'task_dependencies'

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    blocker_task_id: Mapped[int] = mapped_column(ForeignKey('board_tasks.id', ondelete='CASCADE'), nullable=False)
    blocked_task_id: Mapped[int] = mapped_column(ForeignKey('board_tasks.id', ondelete='CASCADE'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=db.func.current_timestamp())

    __table_args__ = (
        db.UniqueConstraint('board_id', 'blocker_task_id', 'blocked_task_id', name='uq_task_dependency_edge'),
        db.CheckConstraint('blocker_task_id != blocked_task_id', name='ck_no_self_dependency'),
    )

    board: Mapped['Board'] = relationship('Board', backref=db.backref('dependencies', lazy=True, cascade="all, delete-orphan"))
    blocker: Mapped['BoardTask'] = relationship('BoardTask', foreign_keys=[blocker_task_id])
    blocked: Mapped['BoardTask'] = relationship('BoardTask', foreign_keys=[blocked_task_id])

    def __init__(self, board_id: int, blocker_task_id: int, blocked_task_id: int):
        self.board_id = board_id
        self.blocker_task_id = blocker_task_id
        self.blocked_task_id = blocked_task_id

class BoardSprint(db.Model):
    """Multiple sprints per board"""
    __tablename__ = 'board_sprints'

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    goal: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    is_active: Mapped[int] = mapped_column(Integer, default=0)  # 0/1
    created_at: Mapped[datetime] = mapped_column(DateTime, default=db.func.current_timestamp())

    board: Mapped['Board'] = relationship('Board', backref=db.backref('sprints', lazy=True, cascade="all, delete-orphan"))

    def __init__(self, board_id: int, start_date: date, end_date: date, name: Optional[str] = None, goal: Optional[str] = None, is_active: int = 0):
        self.board_id = board_id
        self.start_date = start_date
        self.end_date = end_date
        self.name = name
        self.goal = goal
        self.is_active = is_active

# Activity / Audit log
class ActivityLog(db.Model):
    """Audit trail for changes on boards and tasks"""
    __tablename__ = 'activity_logs'

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    before: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    after: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=db.func.current_timestamp())

    board: Mapped['Board'] = relationship('Board', backref=db.backref('activity_logs', lazy=True, cascade="all, delete-orphan"))
    user: Mapped['User'] = relationship('User')

    def __init__(self, board_id: int, user_id: Optional[int], action: str, entity_type: str, entity_id: Optional[int] = None, before: Optional[str] = None, after: Optional[str] = None):
        self.board_id = board_id
        self.user_id = user_id
        self.action = action
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.before = before
        self.after = after
