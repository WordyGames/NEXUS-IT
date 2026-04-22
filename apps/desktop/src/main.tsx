import React from 'react';
import ReactDOM from 'react-dom/client';
import { installWebGlobalErrorHandlers, logRuntimeError } from '@nexus-it/shared';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import './index.css';

const isFileProtocol = window.location.protocol === 'file:';

installWebGlobalErrorHandlers('desktop');

if (import.meta.env.PROD && !isFileProtocol && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      logRuntimeError('desktop', 'Service worker registration failed', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
