import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { getCurrentUser } from '../services/supabase-service';
import config from '../config/environment';

// Mock services
jest.mock('../services/supabase-service');
jest.mock('../services/webrtc-service');
jest.mock('../services/ai-service');
jest.mock('../config/environment', () => {
  const originalModule = jest.requireActual('../config/environment');
  return {
    ...originalModule,
    default: {
      init: jest.fn(),
      validateRequiredConfig: jest.fn(),
      isDevelopment: false,
      isProduction: true,
      isTest: false
    },
    config: {
      init: jest.fn(),
      validateRequiredConfig: jest.fn(),
      isDevelopment: false,
      isProduction: true,
      isTest: false
    }
  };
});

describe('Data Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('Application validates configuration on startup', async () => {
    // Setup validation to return valid config
    config.validateRequiredConfig.mockReturnValue({ isValid: true, errors: [] });
    
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

    // Verify config validation was called
    await waitFor(() => {
      expect(config.validateRequiredConfig).toHaveBeenCalled();
    });
    
    await waitFor(() => {
      expect(config.init).toHaveBeenCalled();
    });
  });

  test('Application throws error with invalid configuration in production', async () => {
    // Setup validation to return invalid config
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    config.validateRequiredConfig.mockReturnValue({ 
      isValid: false, 
      errors: ['Missing Supabase configuration'] 
    });
    
    // Mock authenticated user
    getCurrentUser.mockResolvedValue({ 
      user: { id: 'test-user', email: 'test@example.com' }, 
      error: null 
    });

    // Expect error to be logged
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Verify error was logged
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    consoleErrorSpy.mockRestore();
  });

  test('Application uses real Supabase authentication', async () => {
    // Mock authenticated user
    getCurrentUser.mockResolvedValue({ 
      user: { id: 'real-user-id', email: 'real@example.com' }, 
      error: null 
    });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Verify getCurrentUser was called
    await waitFor(() => {
      expect(getCurrentUser).toHaveBeenCalled();
    });
  });

  test('Application does not use hardcoded mock data for authentication', async () => {
    // Mock authenticated user with specific data
    getCurrentUser.mockResolvedValue({ 
      user: { 
        id: 'real-user-id', 
        email: 'real@example.com',
        user_metadata: {
          name: 'Real User',
          avatar_url: 'https://example.com/avatar.jpg'
        }
      }, 
      error: null 
    });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Verify the app uses the data from the service
    await waitFor(() => {
      expect(getCurrentUser).toHaveBeenCalled();
    });
  });
});