// src/main.jsx
// This is the application entry point.
// It mounts the root React app and loads the global stylesheet.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);