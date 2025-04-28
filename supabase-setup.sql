-- Supabase SQL setup for ECHOLINK application

-- Table for storing AI settings
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model TEXT,
  temperature FLOAT DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table for storing GitHub information
CREATE TABLE IF NOT EXISTS github_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table for storing user settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  settings_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table for storing user profiles (if not already exists)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  github_access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table for persistent chat
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL,
  recipient_id UUID,  -- NULL for group messages
  group_id UUID,      -- NULL for direct messages
  encrypted_content TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,  -- For E2E encryption
  message_type VARCHAR(50) NOT NULL DEFAULT 'TEXT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  parent_message_id UUID,
  FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- Create chat groups table
CREATE TABLE IF NOT EXISTS chat_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create group members join table
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  role VARCHAR(50) DEFAULT 'member',
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create offline message queue table
CREATE TABLE IF NOT EXISTS offline_message_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create connection status tracking table
CREATE TABLE IF NOT EXISTS connection_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'offline',
  last_active TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Add Row Level Security (RLS) policies

-- AI Settings policies
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI settings"
  ON ai_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI settings"
  ON ai_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings"
  ON ai_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- GitHub Info policies
ALTER TABLE github_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own GitHub info"
  ON github_info FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GitHub info"
  ON github_info FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GitHub info"
  ON github_info FOR UPDATE
  USING (auth.uid() = user_id);

-- User Settings policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Profiles policies (if not already set)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- First drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
EXCEPTION
    WHEN undefined_object THEN 
    NULL;
END $$;

-- Then create the policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create RLS policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages sent to them or by them
CREATE POLICY "Users can read their own messages" 
  ON messages FOR SELECT 
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR 
         group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

-- Users can insert their own messages
CREATE POLICY "Users can insert their own messages" 
  ON messages FOR INSERT 
  WITH CHECK (sender_id = auth.uid());

-- Users can update only their own messages
CREATE POLICY "Users can update their own messages" 
  ON messages FOR UPDATE 
  USING (sender_id = auth.uid());