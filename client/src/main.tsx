import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { soundEngine } from './audio/soundEngine';

// Global unlock for mobile browsers (iOS Safari, Android Chrome) on first user interaction
const unlockAudio = () => {
  soundEngine.unlock();
};
window.addEventListener('touchstart', unlockAudio, { passive: true });
window.addEventListener('touchend', unlockAudio, { passive: true });
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('click', unlockAudio, { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);

