"""Tests for the authentication routes in the Flask application."""
import os
import sys
import unittest
from typing import Optional
import sqlalchemy.exc

from flask import Flask

# Ensure we can import from the backend/api package
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
API_DIR = os.path.join(BACKEND_DIR, "api")
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

# Now we can import the app modules
from models import db, User  # type: ignore  # pylint: disable=wrong-import-position
from auth_routes import auth_bp  # type: ignore  # pylint: disable=wrong-import-position


def create_test_app() -> Flask:
    # Use in-memory SQLite by default to keep tests fast and hermetic.
    # You can override with TEST_DATABASE_URI (e.g., a dedicated MySQL DB) if desired.
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
    database_uri = os.getenv(
        "TEST_DATABASE_URI",
        f"sqlite:///" + os.path.join(BACKEND_DIR, "tests", "test_auth.sqlite3"),
    )

    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=database_uri,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )

    db.init_app(app)
    app.register_blueprint(auth_bp)
    return app


class AuthRouteTests(unittest.TestCase):
    """ Tests for the auth routes """
    @classmethod
    def setUpClass(cls) -> None:
        cls.app = create_test_app()
        cls.app_context = cls.app.app_context()
        cls.app_context.push()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.app_context.pop()

    def setUp(self) -> None:
        # Create only the tables we need for these tests to avoid engine/type issues
        # with other models (e.g., vendor-specific column types).
        db.session.remove()
        # Drop in case a previous test left state (works for non in-memory DBs)
        try:
            users_table = User.metadata.tables.get("users")
            if users_table is not None:
                db.Model.metadata.drop_all(bind=db.engine, tables=[users_table])
        except sqlalchemy.exc.SQLAlchemyError:  # pragma: no cover - best effort drop
            db.session.rollback()
        users_table = User.metadata.tables.get("users")
        if users_table is not None:
            db.Model.metadata.create_all(bind=db.engine, tables=[users_table])
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        db.session.remove()
        try:
            users_table = User.metadata.tables.get("users")
            if users_table is not None:
                db.Model.metadata.drop_all(bind=db.engine, tables=[users_table])
        except sqlalchemy.exc.SQLAlchemyError:  # pragma: no cover - best effort drop
            db.session.rollback()

    def test_register_success(self) -> None:
        """ Register a new user successfully """
        resp = self.client.post(
            "/register",
            json={
                "username": "alice",
                "password": "password123",
                "email": "alice@example.com",
            },
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json() or {}
        self.assertIn("token", data)
        self.assertEqual(data.get("user", {}).get("username"), "alice")

    def test_register_duplicate(self) -> None:
        """ Attempt to register a user with a duplicate username """
        first = self.client.post(
            "/register",
            json={
                "username": "bob",
                "password": "pw",
                "email": "bob@example.com",
            },
        )
        self.assertEqual(first.status_code, 201)
        dup = self.client.post(
            "/register",
            json={
                "username": "bob",
                "password": "pw",
                "email": "bob@example.com",
            },
        )
        self.assertEqual(dup.status_code, 409)

    def test_login_and_validate(self) -> None:
        """ Log in a user and validate the token """
        reg = self.client.post(
            "/register",
            json={
                "username": "carol",
                "password": "pw",
                "email": "carol@example.com",
            },
        )
        self.assertEqual(reg.status_code, 201)

        login = self.client.post(
            "/login",
            json={"username": "carol", "password": "pw"},
        )
        self.assertEqual(login.status_code, 200)
        token: Optional[str] = (login.get_json() or {}).get("token")
        self.assertTrue(token)

        val = self.client.get(
            "/validate", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(val.status_code, 200)
        self.assertTrue((val.get_json() or {}).get("valid"))

    def test_login_invalid(self) -> None:
        """ Attempt to log in with invalid credentials """
        resp = self.client.post(
            "/login", json={"username": "nouser", "password": "nope"}
        )
        self.assertEqual(resp.status_code, 401)


if __name__ == "__main__":
    unittest.main(verbosity=2)
