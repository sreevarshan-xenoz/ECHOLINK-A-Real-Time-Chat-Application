import { signIn, signUp, signOut, getCurrentUser } from '../supabase-service';

// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => {
  const mockAuth = {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn()
  };
  
  return {
    createClient: jest.fn(() => ({
      auth: mockAuth
    }))
  };
});

describe('Supabase Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('signUp calls Supabase with correct parameters', async () => {
    const mockSupabase = require('@supabase/supabase-js').createClient();
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    
    const result = await signUp('test@example.com', 'password123');
    
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(result).toEqual({ user: { id: '123' }, error: null });
  });

  test('signIn calls Supabase with correct parameters', async () => {
    const mockSupabase = require('@supabase/supabase-js').createClient();
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    
    const result = await signIn('test@example.com', 'password123');
    
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(result).toEqual({ user: { id: '123' }, error: null });
  });

  test('signOut calls Supabase correctly', async () => {
    const mockSupabase = require('@supabase/supabase-js').createClient();
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    
    const result = await signOut();
    
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(result).toEqual({ error: null });
  });

  test('getCurrentUser returns user data when authenticated', async () => {
    const mockSupabase = require('@supabase/supabase-js').createClient();
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: '123', email: 'test@example.com' } }, 
      error: null 
    });
    
    const result = await getCurrentUser();
    
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(result).toEqual({ user: { id: '123', email: 'test@example.com' }, error: null });
  });

  test('getCurrentUser handles error when not authenticated', async () => {
    const mockSupabase = require('@supabase/supabase-js').createClient();
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: null }, 
      error: { message: 'Not authenticated' } 
    });
    
    const result = await getCurrentUser();
    
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(result).toEqual({ user: null, error: { message: 'Not authenticated' } });
  });
});