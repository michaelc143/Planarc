""" Models for the app backend """
from __future__ import annotations
from typing import Optional
from datetime import datetime
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

    owner: Mapped['User'] = relationship('User', backref=db.backref('boards', lazy=True))

    def __init__(self, name, description, owner_id):
        self.name = name
        self.description = description
        self.owner_id = owner_id

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

    __table_args__: tuple = (
        db.UniqueConstraint('board_id', 'name', name='uq_board_status_name'),
    )

    board: Mapped['Board'] = relationship('Board', backref=db.backref('statuses', lazy=True, cascade="all, delete-orphan"))

    def __init__(self, board_id, name, position):
        self.board_id = board_id
        self.name = name
        self.position = position

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
    assigned_to: Mapped[Optional[int]] = mapped_column(ForeignKey('users.id'), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey('users.id'))
    due_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)  # Order within its status column
    # Optional estimate of effort (e.g., story points)
    estimate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=None)
    # Actual effort used (e.g., story points consumed)
    effort_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=db.func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    board: Mapped['Board'] = relationship('Board', backref=db.backref('tasks', lazy=True, cascade="all, delete-orphan"))
    assignee: Mapped['User'] = relationship('User', foreign_keys=[assigned_to], backref=db.backref('assigned_board_tasks', lazy=True))
    creator: Mapped['User'] = relationship('User', foreign_keys=[created_by], backref=db.backref('created_board_tasks', lazy=True))

    def __init__(self, title, description, assigned_to, created_by, due_date, position, status, priority, board_id, estimate=None, effort_used: Optional[int] | None = 0):
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
