import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './styles/globals.css';
import App from './App.tsx';

// Paint the last-used store theme immediately; Layout re-applies the authoritative value
// from the profile once it loads.
try {
  const cached = localStorage.getItem('system:theme');
  if (cached) document.documentElement.dataset.theme = cached;
} catch {
  /* storage blocked */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Installable app + web push. Registered only in production builds so the service worker
// never caches stale modules while developing.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
