import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Temporary A/B switch: `?style=classic` brings back the previous palette so
// the redesign can be compared against a real log on a real phone.
// `?style=` (empty) clears it. Delete this block once the look is settled.
const requested = new URLSearchParams(location.search).get('style');
if (requested !== null) {
  if (requested) localStorage.setItem('mcas-tracker.style', requested);
  else localStorage.removeItem('mcas-tracker.style');
}
const style = localStorage.getItem('mcas-tracker.style');
if (style) document.documentElement.dataset.theme = style;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
