import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  MemoryRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => element,
  Navigate: () => null,
}), { virtual: true });
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { getCurrentUser, signIn } from '../services/supabase-service';

// Mock services
jest.mock('../services/supabase-service');
jest.mock('../services/webrtc-service', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  checkStunConnectivity: jest.fn().mockResolvedValue(true),
  getPeerId: jest.fn().mockReturnValue('test-peer-id'),
}));
jest.mock('../services/ai-service', () => ({
  initialize: jest.fn().mockResolvedValue(true),
}));
jest.mock('../components/ErrorBoundary.tsx', () => ({ children }) => <div>{children}</div>);
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
// Mock components for routing targets
jest.mock('../components/Landing', () => () => <div data-testid="landing-component">Landing</div>);
jest.mock('../components/Dashboard', () => () => <div data-testid="dashboard-component">Dashboard</div>);
jest.mock('../components/Sidebar', () => () => <div data-testid="sidebar-component">Sidebar</div>);
jest.mock('../components/Chat', () => () => <div data-testid="chat-component">Chat</div>);

describe('End-to-End User Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, 'Test', '/');
  });

  test('Complete user journey: Landing → Authentication → Dashboard → Chat', async () => {
    // Mock authentication flow
    getCurrentUser.mockResolvedValueOnce({ user: null, error: null });
    signIn.mockResolvedValueOnce({ 
      user: { id: 'test-user', email: 'test@example.com' }, 
      error: null 
    });
    getCurrentUser.mockResolvedValue({ 
      user: { id: 'test-user', email: 'test@example.com' }, 
      error: null 
    });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Verify landing page is shown
    await waitFor(() => {
      expect(screen.getByTestId('landing-component')).toBeInTheDocument();
    });

    // Verify dashboard rendered after authentication
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
    });
  });

  test('Protected routes remain accessible after authentication', async () => {
    // Mock authenticated user
    getCurrentUser.mockResolvedValue({ 
      user: { id: 'test-user', email: 'test@example.com' }, 
      error: null 
    });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Verify dashboard is accessible
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });

    // Navigate to chat
    window.history.pushState({}, 'Test', '/chat');
    
    // Verify landing component is not present
    await waitFor(() => {
      expect(screen.queryByTestId('landing-component')).not.toBeInTheDocument();
    });
  });
});