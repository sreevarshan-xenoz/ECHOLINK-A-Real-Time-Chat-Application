import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppProviders from './providers/AppProviders';
import './App.css';
import { Buffer } from 'buffer';

// Global definitions
declare global {
  interface Window {
    Buffer: typeof Buffer;
    process: any; // Using any type to avoid complex type issues
  }
}

// Set up global variables
window.Buffer = Buffer;

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);