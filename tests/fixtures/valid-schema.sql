CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  subject TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_archived ON messages(is_archived);

CREATE TRIGGER IF NOT EXISTS update_messages_timestamp 
AFTER UPDATE ON messages
FOR EACH ROW
BEGIN
  UPDATE messages SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;