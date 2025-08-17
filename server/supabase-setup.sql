-- Messages table for storing all messages (direct and group)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id TEXT NOT NULL,
  recipient_id TEXT,
  group_id TEXT,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'TEXT',
  parent_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  
  -- Ensure either recipient_id or group_id is set, but not both
  CONSTRAINT either_recipient_or_group CHECK (
    (recipient_id IS NULL AND group_id IS NOT NULL) OR
    (recipient_id IS NOT NULL AND group_id IS NULL)
  )
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Chat groups table
CREATE TABLE IF NOT EXISTS chat_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique user per group
  CONSTRAINT unique_user_per_group UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

-- Offline message queue table
CREATE TABLE IF NOT EXISTS offline_message_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_recipient_id ON offline_message_queue(recipient_id);

-- Connection status table
CREATE TABLE IF NOT EXISTS connection_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'offline',
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_connection_status_user_id ON connection_status(user_id);

-- Row Level Security Policies

-- Messages: Users can read messages they sent or received
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own messages" 
  ON messages FOR SELECT 
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR 
         group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own messages" 
  ON messages FOR INSERT 
  WITH CHECK (sender_id = auth.uid());

-- Groups: Users can read groups they are members of
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read groups they belong to" 
  ON chat_groups FOR SELECT 
  USING (id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create groups" 
  ON chat_groups FOR INSERT 
  WITH CHECK (created_by = auth.uid());

-- Group members: Users can read members of groups they belong to
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read members of their groups" 
  ON group_members FOR SELECT 
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can add themselves to groups" 
  ON group_members FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove themselves from groups" 
  ON group_members FOR DELETE 
  USING (user_id = auth.uid());

-- Group admins can manage their groups
CREATE POLICY "Group admins can manage group members" 
  ON group_members FOR ALL 
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'));