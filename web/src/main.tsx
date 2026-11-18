import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './tokens.css';
import './styles.css';
import { installCueHook } from './cues';

// The rubric's audit hook for the synthesised cues; development, test and demo builds only.
// Written out in full (as cueHookEnabled) so a production build drops the call altogether.
if (import.meta.env.MODE !== 'production' || import.meta.env.VITE_DEMO === '1') installCueHook();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The sound cues are warmed by the keeper's home and the session player once the page is idle
// (src/sound.ts `useWarmCues`, story #98), never on the parent's phone.
