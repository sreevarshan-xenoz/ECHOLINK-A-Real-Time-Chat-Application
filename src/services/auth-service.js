import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuhdvhbievfvmpdpqvco.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGR2aGJpZXZmdm1wZHBxdmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MDU3NzYsImV4cCI6MjA1ODk4MTc3Nn0.oL4m-lkeSllQL4oari-LmGtwziKu7AFTe17zOZ_CFmQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class AuthService {
  async signup(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      return { success: true, message: 'Verification email sent' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getCurrentUser() {
    return supabase.auth.getUser();
  }

  async getAuthState() {
    try {
      const { data: { user }, error } = await this.getCurrentUser();
      return user || null;
    } catch (error) {
      console.error('Error getting auth state:', error);
      return null;
    }
  }
}

export default new AuthService();