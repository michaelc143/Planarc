# Application Template

[![Build, Test, and Lint Pipeline](https://github.com/michaelc143/Planarc/actions/workflows/build-test-lint-pipeline.yml/badge.svg)](https://github.com/michaelc143/Planarc/actions/workflows/build-test-lint-pipeline.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

This project is a starter template for applications to use a base to get a faster start on development.

## Requirements

* ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
* ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
* ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
* ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
* ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

## Running the application with Docker Compose

To run the application locally run the following command: `docker compose up -d --build`.

To stop running the application, run the following command: `docker compose down`.

### Running the application with Docker Compose Watch

To run the application while getting live updates for the frontend, run the following: `docker compose watch`.

Running the above command will reload the associated container anytime a change is made in the frontend or backend folders. This also requires that you reload the browser tab in order to see the updates content.

To  stop the running compose, run the same `docker compose down` command to stop all containers running within the compose.

## Components of the application

The app consists of a React TS frontend with Tailwind CSS, a Python Flask API, and a MySQL database.\
On startup, the MySQL engine creates a database called **app** and creates the **users** table inside of it.

### Frontend

On first run, run the following commands to start the frontend on its own:

```bash
cd ./frontend
npm install
npm start
```

To test the frontend, run the following command: `npm test`. This requires that `npm install` is ran within the `/frontend` folder beforehand so that all testing modules are imported.

### Backend

On first run, run the following commands to start the backend on its own:

```bash
cd ./backend
pip install -r requirements.txt
python3 ./api/api.py
```

### Database

To get into the database while it's running within the docker compose, run the following command: `docker exec -it db mysql -u root -p`

Then use the password in the .env file to get into the database.

## License

This project is licensed under the [MIT License](https://pitt.libguides.com/openlicensing/MIT).
For details, please see the [LICENSE](LICENSE) file.
