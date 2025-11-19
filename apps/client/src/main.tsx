/**
 * React Client Application - Main Entry Point
 * Modern Kayak-like travel booking interface
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SocketProvider } from './contexts/SocketContext';
import App from './App';
import RootErrorBoundary from './components/RootErrorBoundary';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Boot instrumentation to help diagnose blank screen issues
console.log('[client] boot start');
window.addEventListener('error', (e) => {
  console.error('[global error]', e.error || e.message || e);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandled rejection]', e.reason);
});

const container = document.getElementById('root');
if (!container) {
  console.error('[client] root element not found');
  throw new Error('Failed to find the root element');
}
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <BrowserRouter>
          <RootErrorBoundary>
            <App />
          </RootErrorBoundary>
        </BrowserRouter>
      </SocketProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
console.log('[client] render invoked');