import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// EMERGENCY: Kill all Service Workers and Clear All Caches once and for all
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      console.log('Unregistering Service Worker:', reg.active?.scriptURL);
      reg.unregister().then(() => {
        console.log('SW Unregistration Success');
        // Force reload from server
        window.location.reload(true);
      });
    });
  });
}

if ('caches' in window) {
  caches.keys().then(names => {
    Promise.all(names.map(name => {
      console.log('Clearing Cache:', name);
      return caches.delete(name);
    })).then(() => {
      console.log('All caches cleared.');
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
