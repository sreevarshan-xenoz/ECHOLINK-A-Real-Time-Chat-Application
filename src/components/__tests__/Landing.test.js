import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  MemoryRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => element,
  Navigate: () => null,
}), { virtual: true });
import { BrowserRouter } from 'react-router-dom';
import Landing from '../Landing';
import { signIn, signUp } from '../../services/supabase-service';

// Mock the authentication service
jest.mock('../../services/supabase-service', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
}));

describe('Landing Component', () => {
  const mockOnAuthSuccess = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders landing page with authentication options', () => {
    render(
      <BrowserRouter>
        <Landing onAuthSuccess={mockOnAuthSuccess} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Welcome to ECHOLINK/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
  });

  test('handles sign in correctly', async () => {
    signIn.mockResolvedValue({ user: { id: '123' }, error: null });

    render(
      <BrowserRouter>
        <Landing onAuthSuccess={mockOnAuthSuccess} />
      </BrowserRouter>
    );

    // Click sign in tab if not already active
    const signInTab = screen.getByText(/Sign In/i);
    fireEvent.click(signInTab);

    // Fill in form
    const emailInput = screen.getByPlaceholderText(/Email/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitButton);

    // Verify service was called
    expect(signIn).toHaveBeenCalledWith('test@example.com', 'password123');

    // Wait for callback
    await waitFor(() => {
      expect(mockOnAuthSuccess).toHaveBeenCalledWith({ id: '123' });
    });
  });

  test('handles sign up correctly', async () => {
    signUp.mockResolvedValue({ user: { id: '456' }, error: null });

    render(
      <BrowserRouter>
        <Landing onAuthSuccess={mockOnAuthSuccess} />
      </BrowserRouter>
    );

    // Click sign up tab
    const signUpTab = screen.getByText(/Sign Up/i);
    fireEvent.click(signUpTab);

    // Fill in form
    const emailInput = screen.getByPlaceholderText(/Email/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Sign Up/i });
    fireEvent.click(submitButton);

    // Verify service was called
    expect(signUp).toHaveBeenCalledWith('new@example.com', 'newpassword123');

    // Wait for callback
    await waitFor(() => {
      expect(mockOnAuthSuccess).toHaveBeenCalledWith({ id: '456' });
    });
  });

  test('displays error message on authentication failure', async () => {
    signIn.mockResolvedValue({ user: null, error: { message: 'Invalid credentials' } });

    render(
      <BrowserRouter>
        <Landing onAuthSuccess={mockOnAuthSuccess} />
      </BrowserRouter>
    );

    // Fill and submit form
    const emailInput = screen.getByPlaceholderText(/Email/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    const submitButton = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitButton);

    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });

    // Verify callback was not called
    expect(mockOnAuthSuccess).not.toHaveBeenCalled();
  });
});