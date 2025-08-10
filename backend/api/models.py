""" Models for the app backend """
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    """ User Model """
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __init__(self, username, password, email):
        self.username = username
        self.password = password
        self.email = email

# New models for Boards and Tasks on Boards
class Board(db.Model):
    """ Board Model """
    __tablename__ = 'boards'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    owner = db.relationship('User', backref=db.backref('boards', lazy=True))

class UserDefaults(db.Model):
    """ Per-user defaults for new boards """
    __tablename__ = 'user_defaults'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    default_statuses = db.Column(db.Text)  # JSON encoded list of strings
    default_priorities = db.Column(db.Text)  # JSON encoded list of strings
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    user = db.relationship('User', backref=db.backref('defaults', lazy=True, cascade="all, delete-orphan"))

class BoardStatus(db.Model):
    """ Custom statuses per board """
    __tablename__ = 'board_statuses'
    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    position = db.Column(db.Integer, default=0)  # order of columns

    __table_args__ = (
        db.UniqueConstraint('board_id', 'name', name='uq_board_status_name'),
    )

    board = db.relationship('Board', backref=db.backref('statuses', lazy=True, cascade="all, delete-orphan"))

class BoardPriority(db.Model):
    """ Custom priorities per board """
    __tablename__ = 'board_priorities'
    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    position = db.Column(db.Integer, default=0)  # order of priorities

    __table_args__ = (
        db.UniqueConstraint('board_id', 'name', name='uq_board_priority_name'),
    )

    board = db.relationship('Board', backref=db.backref('priorities', lazy=True, cascade="all, delete-orphan"))

class BoardTask(db.Model):
    """ Task Model scoped to a Board """
    __tablename__ = 'board_tasks'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(50), default='todo')  # free-form tied to BoardStatus.name
    # priority becomes a free-form string tied to BoardPriority.name
    priority = db.Column(db.String(50), default='medium')
    board_id = db.Column(db.Integer, db.ForeignKey('boards.id', ondelete='CASCADE'))
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    due_date = db.Column(db.Date)
    position = db.Column(db.Integer, default=0)  # Order within its status column
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    board = db.relationship('Board', backref=db.backref('tasks', lazy=True, cascade="all, delete-orphan"))
    assignee = db.relationship('User', foreign_keys=[assigned_to], backref=db.backref('assigned_board_tasks', lazy=True))
    creator = db.relationship('User', foreign_keys=[created_by], backref=db.backref('created_board_tasks', lazy=True))

class BoardMember(db.Model):
    """ Membership for boards """
    __tablename__ = 'board_members'
    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.String(20), default='member')  # owner|admin|member|viewer
    joined_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    __table_args__ = (
        db.UniqueConstraint('board_id', 'user_id', name='uq_board_user'),
    )

    board = db.relationship('Board', backref=db.backref('members', lazy=True, cascade="all, delete-orphan"))
    user = db.relationship('User', backref=db.backref('board_memberships', lazy=True, cascade="all, delete-orphan"))
