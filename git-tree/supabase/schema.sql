-- Create a table to store chat history
CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner text NOT NULL,
  repo text NOT NULL,
  user_id text NOT NULL,
  messages jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Chat history is written only by the server using the service-role key.
-- Do not expose one user's conversations through the public Supabase API.
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Index for quickly retrieving history by repository and user
CREATE INDEX IF NOT EXISTS idx_chat_history_lookup ON chat_history (owner, repo, user_id);
