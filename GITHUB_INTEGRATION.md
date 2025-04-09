# Setting Up GitHub Integration for ECHOLINK

This guide will help you set up GitHub integration with your ECHOLINK application.

## Prerequisites

1. A GitHub account
2. Access to create a GitHub OAuth App

## Steps to Set Up GitHub Integration

### 1. Create a GitHub OAuth App

1. Go to your GitHub account settings
2. Navigate to **Developer settings** > **OAuth Apps** > **New OAuth App**
3. Fill in the application details:
   - **Application name**: ECHOLINK Chat
   - **Homepage URL**: http://localhost:3000 (or your production URL)
   - **Authorization callback URL**: http://localhost:3000/dashboard
4. Click **Register application**
5. After registration, you'll see your **Client ID**
6. Generate a new **Client Secret**

### 2. Configure Environment Variables

1. Open the `.env` file in the root of your project
2. Update the GitHub credentials with your OAuth App details:
   ```
   REACT_APP_GITHUB_CLIENT_ID=your_client_id_here
   REACT_APP_GITHUB_CLIENT_SECRET=your_client_secret_here
   ```

### 3. Set Up the Database

Ensure your Supabase database has a `profiles` table with the following columns:
- `id` (primary key, matches the auth user id)
- `github_access_token` (text, to store the GitHub access token)

### 4. Start the Application

1. Start the server:
   ```
   cd server
   npm install
   npm start
   ```

2. In a new terminal, start the React application:
   ```
   npm start
   ```

3. Navigate to http://localhost:3000/dashboard

## Troubleshooting

### GitHub Connection Not Working

1. Check that your `.env` file contains the correct GitHub OAuth credentials
2. Ensure the server is running and can handle the OAuth token exchange
3. Check browser console for any errors
4. Verify that the callback URL in your GitHub OAuth App settings matches your application's dashboard URL

### Access Token Issues

If you're having issues with the access token:

1. Make sure your Supabase database has the correct schema
2. Check that the GitHub OAuth flow is completing successfully
3. Verify that the token is being saved to your user's profile

## Features

Once connected, you'll be able to:

- Browse your GitHub repositories
- View repository contents and files
- See pull requests
- View commit history
- Use code review tools