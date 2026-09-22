import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { soundEngine } from './audio/soundEngine';
import unmuteIosAudio from 'unmute-ios-audio';

// Automatically unmute WebAudio on iOS Safari & Chrome even when mute switch is on
try {
  unmuteIosAudio();
} catch (e) {
  console.warn('unmuteIosAudio init error:', e);
}

// Global unlock for mobile browsers (iOS Safari, Chrome, Android) on first user interaction
const unlockAudio = () => {
  soundEngine.unlock();
};
['touchstart', 'touchend', 'pointerdown', 'click'].forEach(evt => {
  window.addEventListener(evt, unlockAudio, { passive: true });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);

