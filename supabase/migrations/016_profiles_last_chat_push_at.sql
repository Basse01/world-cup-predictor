ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_chat_push_at timestamptz DEFAULT NULL;
