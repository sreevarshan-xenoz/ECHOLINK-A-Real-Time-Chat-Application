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
      model: data.model
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