import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// IMMEDIATE SW RELOAD on detected update
registerSW({
  onNeedRefresh() {
    console.log('Update found! Forcing immediate reload.');
    window.location.reload(true);
  },
  onOfflineReady() {
    console.log('App ready for offline use.');
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
