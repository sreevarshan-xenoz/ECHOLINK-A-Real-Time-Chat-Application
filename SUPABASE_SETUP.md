# Setting Up Supabase for ECHOLINK

This guide explains how to set up your Supabase database to store user AI API keys and GitHub account information for the ECHOLINK application.

## Database Tables

The application requires the following tables in your Supabase database:

### 1. AI Settings Table

Stores user AI provider preferences and API keys:

```sql
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
```

### 2. GitHub Information Table

Stores GitHub authentication and user details:

```sql
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
```

### 3. User Settings Table

Stores general user preferences:

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  settings_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 4. Profiles Table

Stores user profile information (this may already exist in your database):

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  github_access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setting Up in Supabase

1. **Log in to your Supabase dashboard**
2. **Navigate to the SQL Editor**
3. **Create a New Query**
4. **Copy and paste the SQL from the `supabase-setup.sql` file**
5. **Run the query**

## Row Level Security (RLS)

The SQL setup includes Row Level Security policies to ensure users can only access their own data. These policies are automatically applied when you run the setup SQL.

## API Key Security

**Important**: The current implementation stores API keys as plain text. In a production environment, you should implement proper encryption for sensitive data like API keys.

## Testing the Setup

After setting up the tables, you can test the functionality by:

1. Creating a user account in your application
2. Adding AI API keys in the AISettings component
3. Connecting to GitHub through the GitHub integration
4. Verifying that the data is properly stored in your Supabase tables

## Troubleshooting

If you encounter issues:

1. Check that all tables were created successfully
2. Verify that RLS policies are properly configured
3. Ensure your application's Supabase connection is working correctly
4. Check for any errors in the browser console or server logs