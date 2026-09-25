import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register Service Worker with instant auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, updating automatically...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  immediate: true
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
