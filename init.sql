CREATE DATABASE IF NOT EXISTS app;

USE app;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INT NOT NULL,
    background_color VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Board tasks table
CREATE TABLE IF NOT EXISTS board_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(50) DEFAULT 'medium',
    board_id INT,
    assigned_to INT,
    created_by INT,
    due_date DATE,
    estimate INT NULL,
    effort_used INT NULL DEFAULT 0,
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_board_column (board_id, status, position)
);

-- Optional index for ordering queries by status/position
CREATE INDEX IF NOT EXISTS idx_board_tasks_board_status_position ON board_tasks (board_id, status, position);

-- Board statuses table (custom per board)
CREATE TABLE IF NOT EXISTS board_statuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    position INT DEFAULT 0,
    color VARCHAR(20) NULL,
    UNIQUE KEY uq_board_status_name (board_id, name),
    CONSTRAINT fk_status_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Board priorities table (custom per board)
CREATE TABLE IF NOT EXISTS board_priorities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    position INT DEFAULT 0,
    UNIQUE KEY uq_board_priority_name (board_id, name),
    CONSTRAINT fk_priority_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Board members table
CREATE TABLE IF NOT EXISTS board_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_board_user (board_id, user_id),
    CONSTRAINT fk_board_member_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    CONSTRAINT fk_board_member_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Per-user defaults for new boards
CREATE TABLE IF NOT EXISTS user_defaults (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    default_statuses TEXT,
    default_priorities TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_defaults_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);