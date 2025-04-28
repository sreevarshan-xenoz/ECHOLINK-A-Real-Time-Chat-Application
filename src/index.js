import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';
import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.process = { env: { ...process.env } };

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 