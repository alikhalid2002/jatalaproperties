import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

// ────────────────────────────────────────────────────────
// Force-clear ALL old service workers & caches on startup
// This ensures mobile PWA always gets the freshest version
// ────────────────────────────────────────────────────────
async function clearAndRegisterSW() {
  if (!('serviceWorker' in navigator)) return;

  try {
    // 1. Delete all old caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));

    // 2. Unregister all old service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));

    // 3. Register fresh service worker
    const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    
    // 4. Force immediate activation if waiting
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW installed, force page reload to get fresh content
            window.location.reload();
          }
        });
      }
    });

    console.log('[SW] Service worker registered successfully');
  } catch (err) {
    console.warn('[SW] Service worker setup notice:', err);
  }
}

clearAndRegisterSW();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
