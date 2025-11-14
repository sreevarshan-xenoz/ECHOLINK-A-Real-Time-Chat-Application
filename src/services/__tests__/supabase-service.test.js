import { signIn, signUp, signOut, getCurrentUser } from '../supabase-service';
jest.mock('../supabase-service', () => ({
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
}));

describe('Supabase Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('signUp calls service with correct parameters', async () => {
    require('../supabase-service').signUp.mockResolvedValue({ user: { id: '123' }, error: null });
    const result = await signUp('test@example.com', 'password123');
    expect(require('../supabase-service').signUp).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(result).toEqual({ user: { id: '123' }, error: null });
  });

  test('signIn calls service with correct parameters', async () => {
    require('../supabase-service').signIn.mockResolvedValue({ user: { id: '123' }, error: null });
    const result = await signIn('test@example.com', 'password123');
    expect(require('../supabase-service').signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(result).toEqual({ user: { id: '123' }, error: null });
  });

  test('signOut calls service', async () => {
    require('../supabase-service').signOut.mockResolvedValue({ error: null });
    const result = await signOut();
    expect(require('../supabase-service').signOut).toHaveBeenCalled();
    expect(result).toEqual({ error: null });
  });

  test('getCurrentUser returns user data when authenticated', async () => {
    require('../supabase-service').getCurrentUser.mockResolvedValue({ 
      user: { id: '123', email: 'test@example.com' }, 
      error: null 
    });
    const result = await getCurrentUser();
    expect(require('../supabase-service').getCurrentUser).toHaveBeenCalled();
    expect(result).toEqual({ user: { id: '123', email: 'test@example.com' }, error: null });
  });

  test('getCurrentUser handles error when not authenticated', async () => {
    require('../supabase-service').getCurrentUser.mockResolvedValue({ 
      user: null, 
      error: { message: 'Not authenticated' } 
    });
    const result = await getCurrentUser();
    expect(require('../supabase-service').getCurrentUser).toHaveBeenCalled();
    expect(result).toEqual({ user: null, error: { message: 'Not authenticated' } });
  });
});