const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or key is missing. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Message persistence functions

// Save a message to the database
async function saveMessage(message) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: message.senderId,
        recipient_id: message.recipientId,
        group_id: message.groupId,
        content: message.content,
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
}

// Get messages for a direct conversation
async function getDirectMessages(userId, peerId, limit = 50, offset = 0) {
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
}

// Get messages for a group conversation
async function getGroupMessages(groupId, limit = 50, offset = 0) {
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
}

// Create a new group
async function createGroup(name, createdBy, initialMembers = []) {
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
}

// Get user's groups
async function getUserGroups(userId) {
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
}

// Get group members
async function getGroupMembers(groupId) {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        user_id,
        role,
        joined_at
      `)
      .eq('group_id', groupId);

    if (error) throw error;
    return { members: data, error: null };
  } catch (error) {
    console.error('Error fetching group members:', error);
    return { members: [], error };
  }
}

module.exports = {
  supabase,
  saveMessage,
  getDirectMessages,
  getGroupMessages,
  createGroup,
  getUserGroups,
  getGroupMembers
};