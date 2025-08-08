-- Messages table for contact form submissions
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) <= 255),
  email TEXT NOT NULL CHECK(email LIKE '%_@_%._%'),
  subject TEXT CHECK(length(subject) <= 500),
  message TEXT NOT NULL CHECK(length(message) <= 5000),
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  ip_address TEXT CHECK(length(ip_address) <= 45),
  user_agent TEXT CHECK(length(user_agent) <= 500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_archived ON messages(is_archived);

-- Trigger to update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_messages_timestamp
AFTER UPDATE ON messages
FOR EACH ROW
BEGIN
  UPDATE messages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;