import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Service workers and caches will be handled by the Vite PWA plugin


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
