import React from 'react';
import ReactDOM from 'react-dom/client'; // Use createRoot from react-dom/client
import './index.css'; // This file will be created next
import App from './App'; // Import your App component

// Get the root element from index.html
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component into the root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
