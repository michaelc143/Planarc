
# <img src="frontend/src/assets/planarc-logo.png" alt="Planarc Logo" height="40" style="vertical-align:middle;"/> Planarc

[![Build, Test, and Lint Pipeline](https://github.com/michaelc143/Planarc/actions/workflows/build-test-lint-pipeline.yml/badge.svg)](https://github.com/michaelc143/Planarc/actions/workflows/build-test-lint-pipeline.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Planarc is a full-stack project management and planning application. It features a modern React + TypeScript frontend, a Python Flask REST API backend, and a MySQL database, all orchestrated with Docker Compose for easy local development.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Python Flask (REST API)
- **Database:** MySQL
- **Containerization:** Docker, Docker Compose

## Features

- User authentication (register, login, logout, delete account)
- User profile management
- Dashboard for project/task management (extensible)
- Responsive, modern UI with Tailwind CSS
- Full local development with Docker Compose
- Unit and integration tests for frontend and backend

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Python 3.10+](https://www.python.org/)
- [Docker](https://www.docker.com/)

### Running with Docker Compose

To build and start all services:

```sh
docker compose up -d --build
```

To stop all services:

```sh
docker compose down
```

#### Live Reload (Frontend/Backend)

For live updates during development:

```sh
docker compose watch
```

Reload your browser to see frontend changes. Backend changes reload automatically.

### Running Frontend Only

```sh
cd frontend
npm install
npm start
```

To run frontend tests:

```sh
npm test
```

### Running Backend Only

```sh
cd backend
pip install -r requirements.txt
python3 ./api/api.py
```

### Database Access

To access the MySQL database inside Docker:

```sh
docker exec -it db mysql -u root -p
```

Use the password from your `.env` file.

On startup, the MySQL engine creates a database called **app** and a **users** table.
