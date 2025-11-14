import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  MemoryRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => element,
  Navigate: () => null,
}), { virtual: true });
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '../App';
import { getCurrentUser } from '../services/supabase-service';

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

// Mock components
jest.mock('../components/Landing', () => ({ onAuthSuccess }) => (
  <div data-testid="landing-component">
    <button onClick={() => onAuthSuccess({ id: 'test-user' })}>
      Mock Successful Login
    </button>
  </div>
));
jest.mock('../components/Dashboard', () => () => <div data-testid="dashboard-component">Dashboard</div>);
jest.mock('../components/Sidebar', () => () => <div data-testid="sidebar-component">Sidebar</div>);
jest.mock('../components/Chat', () => () => <div data-testid="chat-component">Chat</div>);
jest.mock('../components/EchoAIPage', () => () => <div data-testid="echoai-component">EchoAI</div>);

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, 'Test', '/');
  });

  test('Unauthenticated user flow: Landing -> Authentication -> Dashboard', async () => {
    // Mock user initially not authenticated, then authenticated after login
    getCurrentUser.mockResolvedValueOnce({ user: null, error: null });
    getCurrentUser.mockResolvedValueOnce({ 
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

    // Simulate successful authentication
    fireEvent.click(screen.getByText('Mock Successful Login'));

    // Verify dashboard component rendered
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
    });
  });

  test('Protected route redirects unauthenticated user to landing page', async () => {
    // Mock user not authenticated
    getCurrentUser.mockResolvedValue({ user: null, error: null });

    // Start at a protected route
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // Verify redirect to landing page
    await waitFor(() => {
      expect(screen.getByTestId('landing-component')).toBeInTheDocument();
    });
  });

  test('Authenticated user can access protected routes', async () => {
    // Mock authenticated user
    getCurrentUser.mockResolvedValue({ 
      user: { id: 'test-user', email: 'test@example.com' }, 
      error: null 
    });

    // Start at a protected route
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // Verify dashboard is shown
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
    });
  });

  test('Authentication state is preserved across navigation', async () => {
    // Mock authenticated user
    getCurrentUser.mockResolvedValue({ 
      user: { id: 'test-user', email: 'test@example.com' }, 
      error: null 
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // Verify dashboard is shown
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
    });

    // Navigate to another protected route
    window.history.pushState({}, 'Test', '/chat');
    
    // Verify no redirect to landing page
    await waitFor(() => {
      expect(screen.queryByTestId('landing-component')).not.toBeInTheDocument();
    });
  });
});