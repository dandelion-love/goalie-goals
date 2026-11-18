import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './tokens.css';
import './styles.css';

// The rubric's audit hook for the synthesised cues; development, test and demo builds only.
// Written out in full (as cueHookEnabled) so a production build drops the call altogether. The
// cues are fetched with it rather than in the first script (story 101 AC2).
if (import.meta.env.MODE !== 'production' || import.meta.env.VITE_DEMO === '1') void import('./cues').then((m) => m.installCueHook());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The sound cues are warmed by the keeper's home and the session player once the page is idle
// (src/sound.ts `useWarmCues`, story #98), never on the parent's phone.
