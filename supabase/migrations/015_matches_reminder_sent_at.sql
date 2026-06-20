ALTER TABLE matches ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz DEFAULT NULL;
