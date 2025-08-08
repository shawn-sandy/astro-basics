-- Migration: Create messages table
-- Created: 2025-08-08

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  subject TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email);

-- Create index for unread messages queries
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);