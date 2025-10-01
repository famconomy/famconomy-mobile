import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createDebugLogger } from './utils/debug';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
const mainDebug = createDebugLogger('app-entry');

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/app/service-worker.js')
      .then(registration => {
        mainDebug.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        mainDebug.error('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/app">
      <App />
    </BrowserRouter>
  </StrictMode>
);
