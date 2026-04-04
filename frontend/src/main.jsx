// main.jsx is the ENTRY POINT of the React application
// It's the first file that runs when someone opens your website

// StrictMode is a React development tool that:
// - Warns about unsafe practices
// - Runs components twice to detect side effects
// - Only active in development, does nothing in production
import { StrictMode } from 'react';

// createRoot is the modern way to render React (React 18+)
// It enables new features like automatic batching and concurrent rendering
import { createRoot } from 'react-dom/client';

// Import our root component
import App from './App.jsx';

// Import global styles (we'll set this up with Tailwind next)
import './index.css';

// Find the HTML element with id="root" in index.html
// and render our entire React app inside it
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);