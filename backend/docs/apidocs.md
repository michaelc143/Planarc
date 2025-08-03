# Application API Documentation

This API provides endpoints for user authentication and registration in a application.

## Endpoints

### `GET /api/users/<int:user_id>`

Get a user by ID.

**URL Parameters**

- `user_id` (int): The id of the user to get data about.

**Response**

- `200 OK` on success, with the following JSON data:

```json
{
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "created_at": "2023-05-21T12:34:56.789Z"
}
```

- `404 Not found` if the user is not found

- `500 Internal Server Error` if there was an error processing the request.

### `POST /api/login`

Log in a user.

**Request Body**

```json
{
    "username": "john_doe",
    "password": "mypassword"
}
```

**Response**

- `200 OK` on successful login, with the following JSON data:

```json
{
    "date_joined": "date",
    "email": "email",
    "message": "Logged in successfully",
    "username": "username"
}
```

- `401 Unauthorized` if the username or password is invalid.

- `500 Internal Server Error` if there was an error processing the request.

### `POST /api/register`

Register a new user.

**Request Body**

```json
{
    "username": "john_doe",
    "password": "mypassword",
    "email": "john@example.com"
}
```

**Response**

- `200 OK` on successful registration, with the following JSON data:

```json
{
    "date_joined": "date",
    "email": "email",
    "message": "Registered successfully",
    "username": "username"
}
```

- `401 Unauthorized` if the username or email is already taken.

- `500 Internal Server Error` if there was an error processing the request.

### `DELETE /api/users/<username>`

Delete a user by username.

**URL Parameters**

- `username` (string): The username of the user to delete.

**Response**

- `200 OK` on successful deletion, with the following JSON data:

```json
{
    "message": "User deleted successfully"
}
```

- `404 Not Found` if the user does not exist.

- `500 Internal Server Error` if there was an error processing the request.

### `PUT /api/users/<int:user_id>/username`

Edit a user's username.

**URL Parameters**

- `user_id` (int): The ID of the user whose username is to be updated.

**Request Body**

```json
{
    "username": "new_username"
}
```

**Response**

- `200 OK` on successful update, with the following JSON data:

```json
{
    "message": "Username updated successfully",
    "username": "new_username"
}
```

- `404 Not Found` if the user does not exist.

- `500 Internal Server Error` if there was an error processing the request.

### `GET /api`

Test endpoint to ensure the API is working.

**Response**

- `200 OK` on success, with the following JSON data:

```json
{
    "message": "Hello, World!"
}
```

- `404 Not Found` If an endpoint is not found, a JSON response with a 404 status code and an error message is returned.

```json
{
    "message": "The requested URL was not found on the server. If you entered the URL manually please check your spelling and try again."
}
```
