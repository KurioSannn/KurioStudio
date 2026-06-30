import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { trackError } from './lib/analytics.ts';
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

const updateSW = registerSW({
  onNeedRefresh() {
    toast('Update available', {
      description: 'A new version of Kurio Studio is available.',
      action: {
        label: 'Refresh',
        onClick: () => updateSW(true),
      },
      duration: 10000,
    });
  },
  onOfflineReady() {
    toast.success('Kurio Studio is ready to work offline!');
  },
});

window.addEventListener("error", (event) => {
  trackError(event.error || event.message, { source: "window_error", filename: event.filename, lineno: event.lineno });
});

window.addEventListener("unhandledrejection", (event) => {
  trackError(event.reason, { source: "unhandled_rejection" });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
