import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './tokens.css';
import './styles.css';
import { installCueHook } from './cues';
import { sound } from './sound';

// The rubric's audit hook for the synthesised cues; development, test and demo builds only.
// Written out in full (as cueHookEnabled) so a production build drops the call altogether.
if (import.meta.env.MODE !== 'production' || import.meta.env.VITE_DEMO === '1') installCueHook();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Compute the sound cues once the page is idle, in short slices, so the first cue (the Start
// tap's) is ready by the time the keeper taps Start (story #97). The Start tap warms them too.
if ('requestIdleCallback' in window) window.requestIdleCallback(() => sound.warm(), { timeout: 2000 });
else setTimeout(() => sound.warm(), 500);
