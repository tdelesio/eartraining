# Cadence — Duolingo-Style Ear Training App 🎵

**Cadence** is a mobile-first, native-responsive ear training web application inspired by Duolingo. It gamifies pitch recognition, solfège, scales, and chord qualities through streak tracking, daily XP quotas, life hearts, gem rewards, mistake audio comparison, and interactive Web Audio synthesis.

---

## ✨ Features

- **Pedagogical Progression (Units 0–6)**:
  - **Unit 0: Pitch Direction** — Detect whether a second note is higher ⬆️ or lower ⬇️ (before Do-Re-Mi).
  - **Unit 1: Solfège Foundation (Do-Re-Mi)** — Key of C scale degree recognition with Kodály color pads.
  - **Unit 2: Pentachord (Do-Re-Mi-Fa-Sol)** — 5-note framework and stepwise melodic contours.
  - **Unit 3: Full Diatonic Scale** — All 8 scale degrees with continuous tonic drone anchor ⚓.
  - **Unit 4: Changing Keys / Transposition** — Cadence groundings ($I\text{--}IV\text{--}V\text{--}I$) across multiple keys.
  - **Unit 5: Triad Harmony** — Major vs. Minor (Happy vs. Sad), Diminished, and Augmented triads.
  - **Unit 6: 7th Chords Master** — Maj7, Dom7, Min7, Dim7, Half-Diminished ($m7\flat 5$), and Aug7.
- **Selectable Practice Mode**:
  - Switch freely between **Note Training** and **Chord Training** with custom drills.
- **Duolingo Gamification Engine**:
  - Daily Streak counter (🔥) with streak freezes.
  - Daily XP quota (🎯) with progress ring.
  - Hearts system (❤️) with refill drills.
  - Gem economy (💎) with an in-app music shop (🏪).
  - Mistake Rehear & Sound Comparison (👂).
  - Weekly Ruby League leaderboards (🏆).
  - Confetti fanfare celebration on completions (🎉).
- **Zero-Dependency Web Audio Synthesizer**:
  - Physical acoustic modeling for Grand Piano, Vintage Rhodes, Warm Analog Synth, and Marimba.
- **Persistence & Frictionless Onboarding**:
  - Built with Node.js native `node:sqlite`.
  - 1-click guest mode with seamless upgrade/claim to permanent account.

---

## 🚀 Quick Start

### Prerequisites
- Node.js LTS (v20+ or v24+)
- npm

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/tdelesio/eartraining.git
cd eartraining

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### Running the App
```bash
# Build the client bundle
npm run build

# Start the full-stack server (serves API and UI on port 3001)
npm start
```
Visit **`http://localhost:3001`** in your browser.

### Development Mode (with Vite HMR)
In two separate terminals:
```bash
# Terminal 1: Backend API
npm run server

# Terminal 2: Vite Dev Server (port 5173 with proxy to 3001)
npm run client
```

### Running Tests
```bash
npm test
```

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Canvas Confetti, Web Audio API.
- **Backend**: Node.js, Express, `node:sqlite` (native SQLite), JWT (`jsonwebtoken`), `bcryptjs`.
- **Bundler**: Vite.
