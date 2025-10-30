import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { getCurrentUser } from '../services/supabase-service';

// Mock the services
jest.mock('../services/supabase-service', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('../services/webrtc-service', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  checkStunConnectivity: jest.fn().mockResolvedValue(true),
  getPeerId: jest.fn().mockReturnValue('test-peer-id'),
}));

jest.mock('../services/ai-service', () => ({
  initialize: jest.fn().mockResolvedValue(true),
}));

jest.mock('../config/environment', () => ({
  default: {
    init: jest.fn(),
    validateRequiredConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  },
  config: {
    init: jest.fn(),
    validateRequiredConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  }
}));

// Mock components
jest.mock('../components/Landing', () => () => <div data-testid="landing-component">Landing</div>);
jest.mock('../components/Dashboard', () => () => <div data-testid="dashboard-component">Dashboard</div>);
jest.mock('../components/Sidebar', () => () => <div data-testid="sidebar-component">Sidebar</div>);

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders landing page when user is not authenticated', async () => {
    // Mock user not authenticated
    getCurrentUser.mockResolvedValue({ user: null, error: null });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for auth check to complete
    await waitFor(() => {
      expect(getCurrentUser).toHaveBeenCalled();
    });

    // Should render landing component
    expect(screen.getByTestId('landing-component')).toBeInTheDocument();
  });

  test('redirects to dashboard when user is authenticated', async () => {
    // Mock user authenticated
    getCurrentUser.mockResolvedValue({ 
      user: { 
        id: '123', 
        email: 'test@example.com',
        user_metadata: { name: 'Test User', avatar_url: 'avatar.jpg' }
      }, 
      error: null 
    });

    // Set initial route to root
    window.history.pushState({}, 'Test', '/');

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for auth check to complete
    await waitFor(() => {
      expect(getCurrentUser).toHaveBeenCalled();
    });

    // Should redirect to dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  });

  test('protected routes redirect to landing when not authenticated', async () => {
    // Mock user not authenticated
    getCurrentUser.mockResolvedValue({ user: null, error: null });

    // Set initial route to dashboard (protected)
    window.history.pushState({}, 'Test', '/dashboard');

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for auth check to complete
    await waitFor(() => {
      expect(getCurrentUser).toHaveBeenCalled();
    });

    // Should redirect to landing
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
  });
});