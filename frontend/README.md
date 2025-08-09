# Commands for running frontend

This project uses React Typescript with Tailwind CSS.

## Boards feature

The app includes a Boards feature (similar to a lightweight Kanban):

- List and create boards at `/boards`.
- View a board at `/boards/:boardId`.
- Create tasks, drag-and-drop between columns, edit task title/description/priority/status, and delete tasks.
- Manage per-board statuses (columns): add, rename, and delete statuses from the board view. Columns render dynamically per board.
- Edit board name/description and delete a board.

Environment: ensure `REACT_APP_API_URL` points to the backend base URL (e.g., `http://localhost:5000/api`).

## `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.\
Runs hot-refreshes

## `npm test`

Runs all tests in the /tests folder.

## npm test -- --coverage

Runs all tests in the /tests folder and generates a coverage report.

To run tests for the Boards feature only:

```bash
npm test -- Boards
```

## `npm run build`

Builds the app for production to the `build` folder.
