"""Tests for the board routes in the Planarc application."""
import os
import sys
import unittest
from typing import Optional
import sqlalchemy

from flask import Flask

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
API_DIR = os.path.join(BACKEND_DIR, "api")
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

from models import db, User, Board, BoardMember, BoardStatus, BoardPriority, BoardTask, UserDefaults  # type: ignore  # pylint: disable=wrong-import-position
from auth_routes import auth_bp  # type: ignore  # pylint: disable=wrong-import-position
from board_routes import board_bp  # type: ignore  # pylint: disable=wrong-import-position


def create_test_app() -> Flask:
    """Create a Flask test application with the necessary configurations."""
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=os.getenv(
            "TEST_DATABASE_URI",
            "sqlite:///" + os.path.join(BACKEND_DIR, "tests", "test_board.sqlite3"),
        ),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    db.init_app(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(board_bp)
    return app


class BoardRouteTests(unittest.TestCase):
    """Tests for the board routes."""
    @classmethod
    def setUpClass(cls) -> None:
        """Set up the test class."""
        cls.app = create_test_app()
        cls.ctx = cls.app.app_context()
        cls.ctx.push()

    @classmethod
    def tearDownClass(cls) -> None:
        """Tear down the test class."""
        cls.ctx.pop()

    def setUp(self) -> None:
        """Set up the test database."""
        db.session.remove()
        # Create only the tables these tests require
        meta = db.Model.metadata
        tables = [
            User.metadata.tables.get("users"),
            Board.metadata.tables.get("boards"),
            BoardMember.metadata.tables.get("board_members"),
            BoardStatus.metadata.tables.get("board_statuses"),
            BoardPriority.metadata.tables.get("board_priorities"),
            BoardTask.metadata.tables.get("board_tasks"),
            UserDefaults.metadata.tables.get("user_defaults"),
        ]
        tables = [t for t in tables if t is not None]
        try:
            meta.drop_all(bind=db.engine, tables=tables)
        except sqlalchemy.exc.SQLAlchemyError:
            db.session.rollback()
        meta.create_all(bind=db.engine, tables=tables)
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        """Tear down the test database."""
        db.session.remove()
        meta = db.Model.metadata
        tables = [
            User.metadata.tables.get("users"),
            Board.metadata.tables.get("boards"),
            BoardMember.metadata.tables.get("board_members"),
            BoardStatus.metadata.tables.get("board_statuses"),
            BoardPriority.metadata.tables.get("board_priorities"),
            BoardTask.metadata.tables.get("board_tasks"),
            UserDefaults.metadata.tables.get("user_defaults"),
        ]
        tables = [t for t in tables if t is not None]
        try:
            meta.drop_all(bind=db.engine, tables=tables)
        except sqlalchemy.exc.SQLAlchemyError:
            db.session.rollback()

    def _register(self, username: str, email: str, password: str = "pw") -> tuple[str, int]:
        """Register a new user and return the token and user ID."""
        r = self.client.post(
            "/register",
            json={"username": username, "email": email, "password": password},
        )
        self.assertEqual(r.status_code, 201)
        body = r.get_json() or {}
        return body.get("token") or "", body.get("user", {}).get("id") or 0

    def _auth(self, token: Optional[str]) -> dict:
        """Return the Authorization header for a request."""
        return {"Authorization": f"Bearer {token}"} if token else {}

    def test_create_list_get_board(self) -> None:
        """Test creating, listing, and getting a board."""
        token, _ = self._register("owner", "owner@example.com")
        # create board
        r = self.client.post(
            "/boards",
            json={"name": "My Board", "description": "desc"},
            headers=self._auth(token),
        )
        self.assertEqual(r.status_code, 201)
        board_id = (r.get_json() or {}).get("id")
        self.assertTrue(board_id)
        # list boards
        r2 = self.client.get("/boards", headers=self._auth(token))
        self.assertEqual(r2.status_code, 200)
        self.assertTrue(any(b.get("id") == board_id for b in (r2.get_json() or [])))
        # get board
        r3 = self.client.get(f"/boards/{board_id}", headers=self._auth(token))
        self.assertEqual(r3.status_code, 200)

    def test_update_board_and_members(self) -> None:
        """Test updating a board and managing members."""
        owner_token, _ = self._register("owner2", "owner2@example.com")
        member_token, member_id = self._register("member", "member@example.com")
        # owner creates board
        r = self.client.post(
            "/boards",
            json={"name": "Board X"},
            headers=self._auth(owner_token),
        )
        board_id = (r.get_json() or {}).get("id")
        # owner adds member by id
        r2 = self.client.put(
            f"/boards/{board_id}",
            json={"add_user_ids": [member_id]},
            headers=self._auth(owner_token),
        )
        self.assertEqual(r2.status_code, 200)
        # member can now see board
        r3 = self.client.get(f"/boards/{board_id}", headers=self._auth(member_token))
        self.assertEqual(r3.status_code, 200)
        # owner removes member
        r4 = self.client.put(
            f"/boards/{board_id}",
            json={"remove_user_ids": [member_id]},
            headers=self._auth(owner_token),
        )
        self.assertEqual(r4.status_code, 200)
        # member no longer sees board
        r5 = self.client.get(f"/boards/{board_id}", headers=self._auth(member_token))
        self.assertEqual(r5.status_code, 404)

    def test_task_crud(self) -> None:
        """Test creating, reading, updating, and deleting tasks."""
        token, _ = self._register("tuser", "tuser@example.com")
        # create board
        r = self.client.post(
            "/boards",
            json={"name": "Tasks"},
            headers=self._auth(token),
        )
        board_id = (r.get_json() or {}).get("id")
        # add task
        r2 = self.client.post(
            f"/boards/{board_id}/tasks",
            json={"title": "T1", "status": "todo", "priority": "low", "estimate": 8, "effort_used": 3},
            headers=self._auth(token),
        )
        self.assertEqual(r2.status_code, 201)
        body = r2.get_json() or {}
        task_id = body.get("id")
        self.assertEqual(body.get("estimate"), 8)
        self.assertEqual(body.get("effort_used"), 3)
        # list tasks
        r3 = self.client.get(f"/boards/{board_id}/tasks", headers=self._auth(token))
        self.assertEqual(r3.status_code, 200)
        listed = r3.get_json() or []
        self.assertTrue(any(t.get("id") == task_id and t.get("effort_used") == 3 for t in listed))
        # update task
        r4 = self.client.put(
            f"/boards/{board_id}/tasks/{task_id}",
            json={"status": "in_progress", "priority": "high", "effort_used": 5},
            headers=self._auth(token),
        )
        self.assertEqual(r4.status_code, 200)
        # confirm updated value present
        r4b = self.client.get(f"/boards/{board_id}/tasks", headers=self._auth(token))
        self.assertEqual(r4b.status_code, 200)
        listed2 = r4b.get_json() or []
        self.assertTrue(any(t.get("id") == task_id and t.get("effort_used") == 5 for t in listed2))
        # delete task
        r5 = self.client.delete(
            f"/boards/{board_id}/tasks/{task_id}",
            headers=self._auth(token),
        )
        self.assertIn(r5.status_code, (200, 204))


if __name__ == "__main__":
    unittest.main(verbosity=2)
