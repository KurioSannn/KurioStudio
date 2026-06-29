import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { trackError } from './lib/analytics.ts';

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
