import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuhdvhbievfvmpdpqvco.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGR2aGJpZXZmdm1wZHBxdmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MDU3NzYsImV4cCI6MjA1ODk4MTc3Nn0.oL4m-lkeSllQL4oari-LmGtwziKu7AFTe17zOZ_CFmQ';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const signUp = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Save user profile data to Supabase
export const saveUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        display_name: profileData.displayName,
        avatar_url: profileData.avatarUrl,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving user profile:', error);
    return { data: null, error };
  }
};

// Get user profile data from Supabase
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is the error code for no rows returned

    // Convert from snake_case to camelCase
    const profileData = data ? {
      displayName: data.display_name,
      avatarUrl: data.avatar_url
    } : null;

    return { profile: profileData, error: null };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { profile: null, error };
  }
};

// Save AI settings to Supabase
export const saveAISettings = async (userId, aiSettings) => {
  try {
    const { data, error } = await supabase
      .from('ai_settings')
      .upsert({
        user_id: userId,
        provider: aiSettings.provider,
        api_key: aiSettings.apiKey, // Note: In a production app, you should encrypt this
        model: aiSettings.model,
        temperature: aiSettings.temperature || 0.7,
        max_tokens: aiSettings.maxTokens || 2048,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving AI settings:', error);
    return { data: null, error };
  }
};

// Get AI settings from Supabase
export const getAISettings = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Convert from snake_case to camelCase
    const aiSettings = data ? {
      provider: data.provider,
      apiKey: data.api_key,
      model: data.model,
      temperature: data.temperature || 0.7,
      maxTokens: data.max_tokens || 2048
    } : null;

    return { settings: aiSettings, error: null };
  } catch (error) {
    console.error('Error getting AI settings:', error);
    return { settings: null, error };
  }
};

// Save user settings to Supabase
export const saveUserSettings = async (userId, settings) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings_data: settings, // Store the entire settings object as JSON
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving user settings:', error);
    return { data: null, error };
  }
};

// Get user settings from Supabase
export const getUserSettings = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return { settings: data?.settings_data || null, error: null };
  } catch (error) {
    console.error('Error getting user settings:', error);
    return { settings: null, error };
  }
};

// Save GitHub account information to Supabase
export const saveGitHubInfo = async (userId, githubInfo) => {
  try {
    const { data, error } = await supabase
      .from('github_info')
      .upsert({
        user_id: userId,
        access_token: githubInfo.accessToken,
        username: githubInfo.username,
        avatar_url: githubInfo.avatarUrl,
        name: githubInfo.name,
        email: githubInfo.email,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving GitHub info:', error);
    return { data: null, error };
  }
};

// Get GitHub account information from Supabase
export const getGitHubInfo = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('github_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Convert from snake_case to camelCase
    const githubInfo = data ? {
      accessToken: data.access_token,
      username: data.username,
      avatarUrl: data.avatar_url,
      name: data.name,
      email: data.email
    } : null;

    return { githubInfo, error: null };
  } catch (error) {
    console.error('Error getting GitHub info:', error);
    return { githubInfo: null, error };
  }
};

// Message persistence functions

// Save an encrypted message to the database
export const saveMessage = async (message) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: message.senderId,
        recipient_id: message.recipientId,
        group_id: message.groupId,
        encrypted_content: message.encryptedContent,
        encryption_iv: message.encryptionIv,
        message_type: message.type || 'TEXT',
        parent_message_id: message.parentMessageId || null,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving message:', error);
    return { data: null, error };
  }
};

// Get messages for a direct conversation
export const getDirectMessages = async (userId, peerId, limit = 50, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`)
      .is('group_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { messages: data, error: null };
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    return { messages: [], error };
  }
};

// Get messages for a group conversation
export const getGroupMessages = async (groupId, limit = 50, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { messages: data, error: null };
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return { messages: [], error };
  }
};

// Mark message as delivered
export const markMessageDelivered = async (messageId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ delivered: true })
      .eq('id', messageId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error marking message as delivered:', error);
    return { success: false, error };
  }
};

// Mark message as read
export const markMessageRead = async (messageId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error marking message as read:', error);
    return { success: false, error };
  }
};

// Group chat functions

// Create a new group
export const createGroup = async (name, createdBy, initialMembers = []) => {
  try {
    // First create the group
    const { data: group, error: groupError } = await supabase
      .from('chat_groups')
      .insert({
        name,
        created_by: createdBy
      })
      .select();

    if (groupError) throw groupError;

    // Now add all members including the creator
    const allMembers = [...new Set([createdBy, ...initialMembers])];
    const memberEntries = allMembers.map(userId => ({
      group_id: group[0].id,
      user_id: userId,
      role: userId === createdBy ? 'admin' : 'member'
    }));

    const { error: membersError } = await supabase
      .from('group_members')
      .insert(memberEntries);

    if (membersError) throw membersError;

    return { group: group[0], error: null };
  } catch (error) {
    console.error('Error creating group:', error);
    return { group: null, error };
  }
};

// Get user's groups
export const getUserGroups = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        role,
        chat_groups:group_id (
          id,
          name,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    
    // Transform the data to a more convenient format
    const groups = data.map(item => ({
      ...item.chat_groups,
      userRole: item.role
    }));
    
    return { groups, error: null };
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return { groups: [], error };
  }
};

// Offline message queue functions

// Add a message to offline queue
export const addToOfflineQueue = async (messageId, recipientId) => {
  try {
    const { data, error } = await supabase
      .from('offline_message_queue')
      .insert({
        message_id: messageId,
        recipient_id: recipientId
      });

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error adding to offline queue:', error);
    return { success: false, error };
  }
};

// Get offline messages for user
export const getOfflineMessages = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('offline_message_queue')
      .select(`
        id,
        message_id,
        created_at,
        messages:message_id (*)
      `)
      .eq('recipient_id', userId);

    if (error) throw error;
    return { messages: data, error: null };
  } catch (error) {
    console.error('Error fetching offline messages:', error);
    return { messages: [], error };
  }
};

// Remove message from offline queue
export const removeFromOfflineQueue = async (queueId) => {
  try {
    const { error } = await supabase
      .from('offline_message_queue')
      .delete()
      .eq('id', queueId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error removing from offline queue:', error);
    return { success: false, error };
  }
};

// Connection status functions

// Update user connection status
export const updateConnectionStatus = async (userId, status) => {
  try {
    const { error } = await supabase
      .from('connection_status')
      .upsert({
        user_id: userId,
        status,
        last_active: new Date().toISOString(),
        ip_address: null, // You might need to obtain this differently
        user_agent: navigator.userAgent
      });

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating connection status:', error);
    return { success: false, error };
  }
};

// Get user connection status
export const getUserConnectionStatus = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('connection_status')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { status: data, error: null };
  } catch (error) {
    console.error('Error getting connection status:', error);
    return { status: null, error };
  }
};