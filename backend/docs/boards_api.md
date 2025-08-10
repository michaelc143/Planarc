# Boards API

All endpoints require Authorization: Bearer \<token\> unless noted.
Base path: `/api`

## Boards

- GET `/boards` — list boards for current user.
- POST `/boards` — create a board.
  - Body: `{ name: string, description?: string }`
- GET `/boards/:board_id` — get a board by id.
- PUT `/boards/:board_id` — update board name/description.
  - Body: `{ name?: string, description?: string }`
- DELETE `/boards/:board_id` — delete a board and its tasks.

Board response shape:

```json
{
  id: number,
  name: string,
  description?: string,
  owner_id: number,
  created_at: string,
  updated_at?: string
}
```

## Board Tasks

- GET `/boards/:board_id/tasks` — list tasks ordered by status and position.
- POST `/boards/:board_id/tasks` — create a task.
  - Body: `{ title: string, description?: string, status?: string, priority?: 'low'|'medium'|'high'|'critical', assigned_to?: number, due_date?: string }`
- PUT `/boards/:board_id/tasks/:task_id` — update task fields.
  - Body: any subset of `{ title, description, status, priority, assigned_to, due_date, position }`
- DELETE `/boards/:board_id/tasks/:task_id` — delete a task.
- POST `/boards/:board_id/tasks/reorder` — move/reorder tasks within/between columns.
  - Body: `{ moves: Array<{ task_id: number, to_status: string, to_position: number }> }`

Task response shape:

```json
{
  id: number,
  title: string,
  description?: string,
  status: string,
  priority: 'low'|'medium'|'high'|'critical',
  board_id: number,
  assigned_to?: number,
  created_by: number,
  due_date?: string,
  position?: number,
  created_at: string,
  updated_at?: string
}
```

Notes:

- Task listing is grouped and ordered by `(status, position, id)`.
- Creating a task assigns `position` at the end of its status column.
- Reorder API reindexes the destination column to keep gaps small.

## Board Statuses (Per-board custom columns)

- GET `/boards/:board_id/statuses` — list statuses for a board, ordered by position.
- POST `/boards/:board_id/statuses` — create a new status (column).
  - Body: `{ name: string }` — must be unique per board.
- PUT `/boards/:board_id/statuses/:status_id` — rename or reposition a status.
  - Body: `{ name?: string, position?: number }` — renaming enforces per-board uniqueness; tasks with the old name are updated.
- DELETE `/boards/:board_id/statuses/:status_id` — delete a status. Tasks are moved to a fallback (first status or `todo`).

Response shape:

```json
{
  id: number,
  name: string,
  position: number
}
```

## Board Priorities (Per-board custom priorities)

- GET `/boards/:board_id/priorities` — list priorities for a board, ordered by position.
- POST `/boards/:board_id/priorities` — create a new priority.
  - Body: `{ name: string }` — must be unique per board.
- PUT `/boards/:board_id/priorities/:priority_id` — rename or reposition a priority.
  - Body: `{ name?: string, position?: number }` — renaming updates tasks using the old name.
- DELETE `/boards/:board_id/priorities/:priority_id` — delete a priority. Tasks are moved to a fallback (first priority or `medium`).

Response shape:

```json
{
  id: number,
  name: string,
  position: number
}
```

## User Defaults for New Boards

- GET `/users/defaults` — get current user's default statuses and priorities used when creating new boards.
- PUT `/users/defaults` — set default lists.
  - Body: `{ statuses: string[], priorities: string[] }` — empty arrays allowed.
