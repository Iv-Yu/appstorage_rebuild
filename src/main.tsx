import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with auto-update and offline caching support
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('FieldOps IT: New content available, updating service worker...');
  },
  onOfflineReady() {
    console.log('FieldOps IT: App is ready for offline operation.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
