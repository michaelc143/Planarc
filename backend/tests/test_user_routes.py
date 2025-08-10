"""Tests for the user routes in the Flask application."""
import os
import sys
import unittest
from typing import Optional
from flask import Flask

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
API_DIR = os.path.join(BACKEND_DIR, "api")
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

from models import db, User  # type: ignore  # pylint: disable=wrong-import-position
from auth_routes import auth_bp  # type: ignore  # pylint: disable=wrong-import-position
from user_routes import user_bp  # type: ignore  # pylint: disable=wrong-import-position

def create_test_app() -> Flask:
    """Create a Flask test application with the necessary configurations."""
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=os.getenv(
            "TEST_DATABASE_URI",
            f"sqlite:///" + os.path.join(BACKEND_DIR, "tests", "test_user.sqlite3"),
        ),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    db.init_app(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    return app


class UserRouteTests(unittest.TestCase):
    """Tests for the user routes in the Flask application."""
    @classmethod
    def setUpClass(cls) -> None:
        """Set up the test application context."""
        cls.app = create_test_app()
        cls.ctx = cls.app.app_context()
        cls.ctx.push()

    @classmethod
    def tearDownClass(cls) -> None:
        """Tear down the test application context."""
        cls.ctx.pop()

    def setUp(self) -> None:
        """Set up the test database."""
        db.session.remove()
        # Only create the users table to keep tests lightweight
        try:
            users_table = User.metadata.tables.get("users")
            if users_table is not None:
                db.Model.metadata.drop_all(bind=db.engine, tables=[users_table])
        except Exception:
            db.session.rollback()
        users_table = User.metadata.tables.get("users")
        if users_table is not None:
            db.Model.metadata.create_all(bind=db.engine, tables=[users_table])
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        """Tear down the test database."""
        db.session.remove()
        try:
            users_table = User.metadata.tables.get("users")
            if users_table is not None:
                db.Model.metadata.drop_all(bind=db.engine, tables=[users_table])
        except Exception:
            db.session.rollback()

    def _register(self, username: str, email: str, password: str = "pw") -> tuple[int, dict]:
        """Register a new user."""
        r = self.client.post(
            "/register",
            json={"username": username, "email": email, "password": password},
        )
        return r.status_code, (r.get_json() or {})

    def _auth_header(self, token: Optional[str]) -> dict:
        """Return the Authorization header for a request."""
        return {"Authorization": f"Bearer {token}"} if token else {}

    def test_get_user_requires_token(self) -> None:
        """Test that getting a user requires a token."""
        resp = self.client.get("/users/1")
        self.assertEqual(resp.status_code, 401)

    def test_get_user_success(self) -> None:
        """Test getting a user successfully."""
        status, body = self._register("alice", "alice@example.com")
        self.assertEqual(status, 201)
        token = body.get("token")
        user_id = body.get("user", {}).get("id")
        self.assertTrue(token)
        self.assertTrue(user_id)
        r = self.client.get(f"/users/{user_id}", headers=self._auth_header(token))
        self.assertEqual(r.status_code, 200)
        data = r.get_json() or {}
        self.assertEqual(data.get("username"), "alice")

    def test_edit_username_self(self) -> None:
        """Test editing a user's username by themselves."""
        status, body = self._register("bob", "bob@example.com")
        self.assertEqual(status, 201)
        token = body.get("token")
        user_id = body.get("user", {}).get("id")
        r = self.client.put(
            f"/users/{user_id}/username",
            json={"username": "bobby"},
            headers=self._auth_header(token),
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.get_json() or {}).get("user", {}).get("username"), "bobby")

    def test_delete_user_self(self) -> None:
        """Test deleting a user by themselves."""
        status, body = self._register("carol", "carol@example.com")
        self.assertEqual(status, 201)
        token = body.get("token")
        username = body.get("user", {}).get("username")
        r = self.client.delete(f"/users/{username}", headers=self._auth_header(token))
        self.assertEqual(r.status_code, 200)
        # Verify it's gone
        user_id = body.get("user", {}).get("id")
        r2 = self.client.get(f"/users/{user_id}", headers=self._auth_header(token))
        self.assertEqual(r2.status_code, 404)


if __name__ == "__main__":
    unittest.main(verbosity=2)
