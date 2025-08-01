
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Debug
console.log('index.js loaded');
console.log('Root element:', document.getElementById('root'));

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
