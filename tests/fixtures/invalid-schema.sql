-- This schema contains intentional syntax errors for testing

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  subject TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- Missing closing parenthesis below
  CHECK (length(email) > 0
);

-- Invalid SQL syntax
CREAT TABLE invalid_table (
  id INTEGER
);

-- Missing semicolon
CREATE INDEX idx_messages_email ON messages(email)

-- Invalid constraint
CREATE TABLE test_constraints (
  id INTEGER PRIMARY KEY,
  value TEXT CHECK (invalid_function(value))
);

-- Invalid trigger syntax
CREATE TRIGGER invalid_trigger 
AFTER UPDATE ON nonexistent_table
FOR EACH ROW
BEGIN
  INVALID SQL STATEMENT;
END