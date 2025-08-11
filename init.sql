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
    sprint_start DATE NULL,
    sprint_end DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Board sprints (multiple per board)
-- Create this before board_tasks so we can reference it via FK
CREATE TABLE IF NOT EXISTS board_sprints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    name VARCHAR(100) NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    goal TEXT NULL,
    is_active TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_board_sprints_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Board tasks table
CREATE TABLE IF NOT EXISTS board_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(50) DEFAULT 'medium',
    board_id INT,
    sprint_id INT NULL,
    assigned_to INT,
    created_by INT,
    due_date DATE,
    estimate INT NULL,
    effort_used INT NULL DEFAULT 0,
    labels VARCHAR(255) NULL,
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_sprint FOREIGN KEY (sprint_id) REFERENCES board_sprints(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_board_column (board_id, status, position)
);

-- Optional index for ordering queries by status/position (script runs once on fresh DB)
CREATE INDEX idx_board_tasks_board_status_position ON board_tasks (board_id, status, position);

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

-- Task dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    blocker_task_id INT NOT NULL,
    blocked_task_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_task_dependency_edge (board_id, blocker_task_id, blocked_task_id),
    CONSTRAINT ck_no_self_dependency CHECK (blocker_task_id != blocked_task_id),
    CONSTRAINT fk_dep_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    CONSTRAINT fk_dep_blocker FOREIGN KEY (blocker_task_id) REFERENCES board_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_dep_blocked FOREIGN KEY (blocked_task_id) REFERENCES board_tasks(id) ON DELETE CASCADE
);

-- Optional helpful indexes for dependency lookups
-- Indexes (omit IF NOT EXISTS for MySQL compatibility; init script runs only once)
CREATE INDEX idx_task_deps_board ON task_dependencies (board_id);
CREATE INDEX idx_task_deps_blocker ON task_dependencies (blocker_task_id);
CREATE INDEX idx_task_deps_blocked ON task_dependencies (blocked_task_id);

-- Activity / Audit logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    user_id INT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NULL,
    before TEXT NULL,
    after TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_act_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    CONSTRAINT fk_act_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);