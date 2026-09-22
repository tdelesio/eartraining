// Complete Curriculum & Music Theory Definition for Cadence Ear Training

const NOTE_FREQUENCIES = {
  // Octave 3
  'C3': 130.81, 'C#3': 138.59, 'Db3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'Eb3': 155.56,
  'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'Gb3': 185.00, 'G3': 196.00, 'G#3': 207.65,
  'Ab3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'Bb3': 233.08, 'B3': 246.94,
  // Octave 4
  'C4': 261.63, 'C#4': 277.18, 'Db4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'Eb4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'Gb4': 369.99, 'G4': 392.00, 'G#4': 415.30,
  'Ab4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'Bb4': 466.16, 'B4': 493.88,
  // Octave 5
  'C5': 523.25, 'C#5': 554.37, 'Db5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'Eb5': 622.25,
  'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'Gb5': 739.99, 'G5': 783.99, 'G#5': 830.61,
  'Ab5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'Bb5': 932.33, 'B5': 987.77,
  // Octave 6
  'C6': 1046.50
};

// Chord interval definitions (semitones from root)
const CHORD_FORMULAS = {
  // Triads
  major: { name: 'Major', label: 'Major Triad', intervals: [0, 4, 7], mood: 'Bright, happy, stable' },
  minor: { name: 'Minor', label: 'Minor Triad', intervals: [0, 3, 7], mood: 'Dark, sad, introspective' },
  diminished: { name: 'Diminished', label: 'Diminished Triad', intervals: [0, 3, 6], mood: 'Tense, suspenseful, unresolved' },
  augmented: { name: 'Augmented', label: 'Augmented Triad', intervals: [0, 4, 8], mood: 'Dreamy, mysterious, floating' },
  // 7th Chords
  maj7: { name: 'Maj7', label: 'Major 7th', intervals: [0, 4, 7, 11], mood: 'Lush, nostalgic, jazzy' },
  dom7: { name: 'Dom7', label: 'Dominant 7th', intervals: [0, 4, 7, 10], mood: 'Bluesy, funk, tension needing resolution' },
  min7: { name: 'Min7', label: 'Minor 7th', intervals: [0, 3, 7, 10], mood: 'Mellow, soulful, cozy' },
  minmaj7: { name: 'MinMaj7', label: 'Minor Major 7th', intervals: [0, 3, 7, 11], mood: 'Spy thriller, cinematic, James Bond' },
  halfdim7: { name: 'm7b5', label: 'Half-Diminished 7th', intervals: [0, 3, 6, 10], mood: 'Bittersweet, classic jazz minor ii' },
  dim7: { name: 'Dim7', label: 'Diminished 7th', intervals: [0, 3, 6, 9], mood: 'Haunting, sudden shock, suspense' },
  aug7: { name: 'Aug7', label: 'Augmented 7th', intervals: [0, 4, 8, 10], mood: 'Whole-tone wonder, futuristic, unstable' }
};

// Solfège syllables in Major Scale
const SOLFEGE_SCALE = [
  { syllable: 'Do', degree: 1, semitones: 0, noteC: 'C4', color: '#ff4b4b' },
  { syllable: 'Re', degree: 2, semitones: 2, noteC: 'D4', color: '#ff9600' },
  { syllable: 'Mi', degree: 3, semitones: 4, noteC: 'E4', color: '#ffc800' },
  { syllable: 'Fa', degree: 4, semitones: 5, noteC: 'F4', color: '#58cc02' },
  { syllable: 'Sol', degree: 5, semitones: 7, noteC: 'G4', color: '#1cb0f6' },
  { syllable: 'La', degree: 6, semitones: 9, noteC: 'A4', color: '#ce82ff' },
  { syllable: 'Ti', degree: 7, semitones: 11, noteC: 'B4', color: '#f772b2' },
  { syllable: 'High Do', degree: 8, semitones: 12, noteC: 'C5', color: '#ff4b4b' }
];

const UNITS = [
  {
    id: 0,
    title: 'Unit 0: Pitch Direction',
    subtitle: 'The first step: Hear if a note went higher or lower',
    icon: '🧭',
    color: '#58cc02',
    levels: [
      {
        id: 0,
        title: 'Wide Leaps',
        description: 'Listen to two notes with big intervals (5ths & Octaves). Is the 2nd note Higher or Lower?',
        type: 'pitch_direction_wide',
        xpReward: 20
      },
      {
        id: 1,
        title: 'Medium Leaps',
        description: 'Identify direction for 3rds and 4ths. Focus on the pitch contour.',
        type: 'pitch_direction_medium',
        xpReward: 20
      },
      {
        id: 2,
        title: 'Close Steps',
        description: 'Subtle shifts: Whole tones and half steps. Sharpen your sensitivity.',
        type: 'pitch_direction_close',
        xpReward: 25
      },
      {
        id: 3,
        title: 'Direction Master Challenge',
        description: 'Mixed pitch direction test with varying speeds. Pass to unlock Solfège!',
        type: 'pitch_direction_boss',
        xpReward: 30
      }
    ]
  },
  {
    id: 1,
    title: 'Unit 1: Solfège Starter (Key of C)',
    subtitle: 'Master the first 3 notes: Do, Re, Mi',
    icon: '🌱',
    color: '#1cb0f6',
    levels: [
      {
        id: 0,
        title: 'Do & Re',
        description: 'Hear the fundamental tonic Do (C4) and the step Re (D4).',
        type: 'solfege_do_re',
        xpReward: 20
      },
      {
        id: 1,
        title: 'Do, Re, Mi',
        description: 'Add the bright major 3rd, Mi (E4). Identify individual notes.',
        type: 'solfege_do_re_mi',
        xpReward: 25
      },
      {
        id: 2,
        title: '3-Note Melody Dictation',
        description: 'Listen to a short 3-note melody and tap the notes in order.',
        type: 'melody_do_re_mi',
        xpReward: 30
      }
    ]
  },
  {
    id: 2,
    title: 'Unit 2: The Pentachord',
    subtitle: 'Expand your ears to Do, Re, Mi, Fa, Sol',
    icon: '🖐️',
    color: '#ffc800',
    levels: [
      {
        id: 0,
        title: 'Introducing Fa & Sol',
        description: 'The half-step to Fa and the grand fifth Sol (G4).',
        type: 'solfege_pentachord_intro',
        xpReward: 25
      },
      {
        id: 1,
        title: 'Leaps & Bounds',
        description: 'Distinguish leaps: Do to Sol vs Mi to Sol vs Re to Fa.',
        type: 'solfege_pentachord_leaps',
        xpReward: 25
      },
      {
        id: 2,
        title: 'Pentachord Melody Replay',
        description: 'Dictate 4-note melodies using all five notes.',
        type: 'melody_pentachord',
        xpReward: 30
      }
    ]
  },
  {
    id: 3,
    title: 'Unit 3: Full Major Scale',
    subtitle: 'The complete diatonic octave: Do through High Do',
    icon: '🌈',
    color: '#ce82ff',
    levels: [
      {
        id: 0,
        title: 'Introducing La & Ti',
        description: 'Feel the intense pull of Ti resolving to High Do.',
        type: 'solfege_full_intro',
        xpReward: 25
      },
      {
        id: 1,
        title: 'Full Scale Sorter',
        description: 'Identify any scale degree from 1 to 8 with reference drone.',
        type: 'solfege_full_scale',
        xpReward: 30
      },
      {
        id: 2,
        title: 'Diatonic Virtuoso',
        description: 'Fast identification of random scale notes. Complete to unlock New Keys!',
        type: 'solfege_boss',
        xpReward: 35
      }
    ]
  },
  {
    id: 4,
    title: 'Unit 4: Changing Keys & Relative Pitch',
    subtitle: 'Hear Solfège in G Major, F Major, and beyond',
    icon: '🔑',
    color: '#ff4b4b',
    levels: [
      {
        id: 0,
        title: 'Key of G Major',
        description: 'Tonic is G3/G4. Listen for the F# leading tone.',
        type: 'key_g_major',
        xpReward: 25
      },
      {
        id: 1,
        title: 'Key of F Major',
        description: 'Tonic is F3/F4. Listen for the Bb subdominant.',
        type: 'key_f_major',
        xpReward: 25
      },
      {
        id: 2,
        title: 'Random Key Center',
        description: 'Listen to the anchor cadence (I - IV - V - I), then identify the mystery note.',
        type: 'key_random',
        xpReward: 35
      }
    ]
  },
  {
    id: 5,
    title: 'Unit 5: Chords Part 1 — Triad Qualities',
    subtitle: 'Major, Minor, Diminished, and Augmented Triads',
    icon: '🎹',
    color: '#00cd9c',
    levels: [
      {
        id: 0,
        title: 'Major vs Minor',
        description: 'The golden distinction: Bright & cheerful vs Dark & emotional.',
        type: 'triad_maj_min',
        xpReward: 25
      },
      {
        id: 1,
        title: 'Broken Triad Arpeggios',
        description: 'Hear the 1st, 3rd, and 5th arpeggiated step by step.',
        type: 'triad_arpeggio',
        xpReward: 25
      },
      {
        id: 2,
        title: 'Diminished & Augmented',
        description: 'High tension (Diminished) vs Dreamy mystery (Augmented).',
        type: 'triad_dim_aug',
        xpReward: 30
      },
      {
        id: 3,
        title: '4-Way Triad Master',
        description: 'Identify Major, Minor, Diminished, or Augmented on the fly.',
        type: 'triad_4way',
        xpReward: 35
      }
    ]
  },
  {
    id: 6,
    title: 'Unit 6: Chords Part 2 — Seventh Chords',
    subtitle: 'Maj7, Dom7, Min7, Dim7, m7b5, and Aug7',
    icon: '🎷',
    color: '#e056fd',
    levels: [
      {
        id: 0,
        title: 'Major 7th vs Dominant 7th',
        description: 'Dreamy Jazz (Maj7) vs Bluesy Tension (Dom7).',
        type: 'seventh_maj_dom',
        xpReward: 30
      },
      {
        id: 1,
        title: 'Minor 7th & Minor-Major 7th',
        description: 'Cozy Chillhop (Min7) vs Noir Spy (MinMaj7).',
        type: 'seventh_min_minmaj',
        xpReward: 30
      },
      {
        id: 2,
        title: 'Diminished 7th & Half-Diminished',
        description: 'Classic suspense (Dim7) vs melancholic jazz minor ii (m7b5).',
        type: 'seventh_dim_halfdim',
        xpReward: 35
      },
      {
        id: 3,
        title: 'Augmented 7th & Tensions',
        description: 'Sci-fi whole-tone color (Aug7) and complex textures.',
        type: 'seventh_aug7',
        xpReward: 35
      },
      {
        id: 4,
        title: 'Seventh Chord Virtuoso',
        description: 'The ultimate chord test. Identify all 7th chord varieties.',
        type: 'seventh_master',
        xpReward: 50
      }
    ]
  }
];

// Helper to calculate semitone note offsets
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteName(midiNumber) {
  const noteIndex = midiNumber % 12;
  const octave = Math.floor(midiNumber / 12) - 1;
  return `${CHROMATIC_SCALE[noteIndex]}${octave}`;
}

function noteNameToMidi(name) {
  const match = name.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return 60; // default C4
  let pitch = match[1];
  const oct = parseInt(match[2], 10);
  if (pitch === 'Db') pitch = 'C#';
  if (pitch === 'Eb') pitch = 'D#';
  if (pitch === 'Gb') pitch = 'F#';
  if (pitch === 'Ab') pitch = 'G#';
  if (pitch === 'Bb') pitch = 'A#';
  const index = CHROMATIC_SCALE.indexOf(pitch);
  return (oct + 1) * 12 + index;
}

const INTERVAL_NAMES = {
  1: { name: 'Minor 2nd', short: 'm2' },
  2: { name: 'Major 2nd', short: 'M2' },
  3: { name: 'Minor 3rd', short: 'm3' },
  4: { name: 'Major 3rd', short: 'M3' },
  5: { name: 'Perfect 4th', short: 'P4' },
  6: { name: 'Tritone', short: 'TT' },
  7: { name: 'Perfect 5th', short: 'P5' },
  8: { name: 'Minor 6th', short: 'm6' },
  9: { name: 'Major 6th', short: 'M6' },
  10: { name: 'Minor 7th', short: 'm7' },
  11: { name: 'Major 7th', short: 'M7' },
  12: { name: 'Octave', short: 'P8' }
};

// Generate question sets dynamically based on level type and optional teacher config
function generateQuestionsForLevel(type, count = 7, config = {}) {
  const questions = [];

  for (let i = 0; i < count; i++) {
    questions.push(generateSingleQuestion(type, i, config));
  }

  return questions;
}

function generateSingleQuestion(type, index = 0, config = {}) {
  const randChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // DYNAMIC TEACHER-CONFIGURED LESSONS
  if (type === 'custom' || (config && typeof config === 'object' && Object.keys(config).length > 0)) {
    const category = config.category || 'solfege';
    const complexity = config.complexity || 'medium';

    if (category === 'solfege') {
      const defaultSyllables = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];
      const allowedSyllables = Array.isArray(config.notesPool) && config.notesPool.length >= 2 
        ? config.notesPool 
        : defaultSyllables;
      
      const filteredScale = SOLFEGE_SCALE.filter(s => allowedSyllables.includes(s.syllable));
      const pool = filteredScale.length >= 2 ? filteredScale : SOLFEGE_SCALE;
      const chosen = randChoice(pool);

      const optionsCount = complexity === 'easy' ? 2 : (complexity === 'medium' ? 3 : Math.min(4, pool.length));
      const otherOptions = pool.filter(s => s.syllable !== chosen.syllable).sort(() => Math.random() - 0.5).slice(0, optionsCount - 1);
      const allOptions = [chosen, ...otherOptions].sort(() => Math.random() - 0.5);

      const keyCenter = config.keyCenter || 'C';
      const rootMidi = noteNameToMidi(`${keyCenter}4`);
      const targetMidi = rootMidi + chosen.semitones;
      const targetNoteName = midiToNoteName(targetMidi);
      const tonicNoteName = `${keyCenter}4`;

      return {
        id: `teacher_solf_${index}_${Date.now()}`,
        category: 'solfege',
        questionText: `Key of ${keyCenter}: Identify this Solfège note (${complexity.toUpperCase()}):`,
        tonicDrone: tonicNoteName,
        audioPrompt: {
          type: 'note',
          notes: [targetNoteName],
          durations: [1.1]
        },
        options: allOptions.map(o => ({
          id: o.syllable,
          label: `${o.syllable} (${midiToNoteName(rootMidi + o.semitones)})`,
          isCorrect: o.syllable === chosen.syllable
        })),
        explanation: `In the key of ${keyCenter}, the note played was ${chosen.syllable} (${targetNoteName}).`,
        comparison: {
          playedNotes: [targetNoteName],
          correctLabel: chosen.syllable
        }
      };
    }

    if (category === 'triad') {
      const allowedChords = Array.isArray(config.chordPool) && config.chordPool.length >= 2
        ? config.chordPool
        : ['major', 'minor', 'diminished', 'augmented'];
      const chosenKey = randChoice(allowedChords);
      const chordInfo = CHORD_FORMULAS[chosenKey] || CHORD_FORMULAS.major;
      const rootMidi = randInt(55, 65);
      const rootName = midiToNoteName(rootMidi);
      const chordNotes = chordInfo.intervals.map(offset => midiToNoteName(rootMidi + offset));
      
      const playStyle = config.playStyle || (complexity === 'easy' ? 'arpeggio' : 'chord');
      const isArp = playStyle === 'arpeggio' || (playStyle === 'both' && Math.random() > 0.5);

      const options = allowedChords.map(cKey => ({
        id: cKey,
        label: `${CHORD_FORMULAS[cKey]?.label || cKey}`,
        isCorrect: cKey === chosenKey
      }));

      return {
        id: `teacher_triad_${index}_${Date.now()}`,
        category: 'chord',
        questionText: isArp ? 'Identify the arpeggiated triad quality:' : 'Identify the chord quality:',
        audioPrompt: {
          type: isArp ? 'sequence' : 'chord',
          notes: chordNotes,
          durations: isArp ? [0.4, 0.4, 0.7] : [1.3],
          delays: isArp ? [0, 0.4, 0.8] : [0]
        },
        options,
        explanation: `This was a ${chordInfo.label} on root ${rootName}. Mood: ${chordInfo.mood}.`,
        comparison: {
          playedNotes: chordNotes,
          correctLabel: chordInfo.label
        }
      };
    }

    if (category === 'seventh') {
      const allowed7ths = Array.isArray(config.seventhPool) && config.seventhPool.length >= 2
        ? config.seventhPool
        : ['maj7', 'dom7', 'min7', 'dim7'];
      const chosenKey = randChoice(allowed7ths);
      const chordInfo = CHORD_FORMULAS[chosenKey] || CHORD_FORMULAS.dom7;
      const rootMidi = randInt(55, 64);
      const rootName = midiToNoteName(rootMidi);
      const chordNotes = chordInfo.intervals.map(offset => midiToNoteName(rootMidi + offset));

      const options = allowed7ths.map(sKey => ({
        id: sKey,
        label: `${CHORD_FORMULAS[sKey]?.label || sKey}`,
        isCorrect: sKey === chosenKey
      }));

      return {
        id: `teacher_7th_${index}_${Date.now()}`,
        category: 'seventh_chord',
        questionText: 'Listen to this 7th chord. What is its quality?',
        audioPrompt: {
          type: 'chord',
          notes: chordNotes,
          durations: [1.4],
          delays: [0]
        },
        options,
        explanation: `This was a ${chordInfo.label} on root ${rootName}. Vibe: ${chordInfo.mood}.`,
        comparison: {
          playedNotes: chordNotes,
          correctLabel: chordInfo.label
        }
      };
    }

    if (category === 'interval') {
      const allowedIntervals = Array.isArray(config.intervalPool) && config.intervalPool.length >= 2
        ? config.intervalPool
        : [1, 2, 3, 4, 5, 7, 12];
      const chosenSemitones = randChoice(allowedIntervals);
      const intervalInfo = INTERVAL_NAMES[chosenSemitones] || { name: `${chosenSemitones} Semitones`, short: `${chosenSemitones}st` };
      
      const rootMidi = randInt(55, 65);
      const targetMidi = rootMidi + chosenSemitones;
      const rootName = midiToNoteName(rootMidi);
      const targetName = midiToNoteName(targetMidi);

      const direction = config.direction || (complexity === 'hard' ? 'harmonic' : 'ascending');
      const isHarmonic = direction === 'harmonic';

      const optionsCount = complexity === 'easy' ? 2 : (complexity === 'medium' ? 3 : 4);
      const otherIntervals = allowedIntervals.filter(i => i !== chosenSemitones).sort(() => Math.random() - 0.5).slice(0, optionsCount - 1);
      const allIntervals = [chosenSemitones, ...otherIntervals].sort((a, b) => a - b);

      return {
        id: `teacher_int_${index}_${Date.now()}`,
        category: 'interval',
        questionText: isHarmonic ? 'Identify this harmonic interval (notes played together):' : 'Identify this interval (notes played in sequence):',
        audioPrompt: {
          type: isHarmonic ? 'chord' : 'sequence',
          notes: [rootName, targetName],
          durations: isHarmonic ? [1.3] : [0.6, 0.7],
          delays: isHarmonic ? [0] : [0, 0.6]
        },
        options: allIntervals.map(i => ({
          id: String(i),
          label: INTERVAL_NAMES[i]?.name || `${i} Semitones`,
          isCorrect: i === chosenSemitones
        })),
        explanation: `The interval was a ${intervalInfo.name} (${chosenSemitones} semitones) from ${rootName} to ${targetName}.`,
        comparison: {
          playedNotes: [rootName, targetName],
          correctLabel: intervalInfo.name
        }
      };
    }

    if (category === 'pitch_direction') {
      let intervalSemitones = 7;
      if (complexity === 'easy') intervalSemitones = randChoice([7, 8, 12]);
      else if (complexity === 'medium') intervalSemitones = randChoice([3, 4, 5]);
      else if (complexity === 'hard') intervalSemitones = randChoice([1, 2]);
      else intervalSemitones = randChoice([1, 2, 3, 5, 7, 12]);

      const baseMidi = randInt(55, 67);
      const isHigher = Math.random() > 0.5;
      const targetMidi = isHigher ? baseMidi + intervalSemitones : baseMidi - intervalSemitones;

      return {
        id: `teacher_pd_${index}_${Date.now()}`,
        category: 'direction',
        questionText: 'Is the second note HIGHER or LOWER than the first?',
        audioPrompt: {
          type: 'sequence',
          notes: [midiToNoteName(baseMidi), midiToNoteName(targetMidi)],
          durations: [0.6, 0.7],
          delays: [0, 0.7]
        },
        options: [
          { id: 'higher', label: 'Higher ⬆️', isCorrect: isHigher },
          { id: 'lower', label: 'Lower ⬇️', isCorrect: !isHigher }
        ],
        explanation: `The second note was ${isHigher ? 'Higher' : 'Lower'} (${midiToNoteName(targetMidi)} vs ${midiToNoteName(baseMidi)}).`,
        comparison: {
          playedNotes: [midiToNoteName(baseMidi), midiToNoteName(targetMidi)],
          correctLabel: isHigher ? 'Higher ⬆️' : 'Lower ⬇️'
        }
      };
    }
  }

  // 1. PITCH DIRECTION
  if (type.startsWith('pitch_direction')) {
    let intervalSemitones = 7; // default 5th
    if (type === 'pitch_direction_wide') {
      intervalSemitones = randChoice([7, 8, 9, 12]); // 5th, 6th, octave
    } else if (type === 'pitch_direction_medium') {
      intervalSemitones = randChoice([3, 4, 5]); // m3, M3, P4
    } else if (type === 'pitch_direction_close') {
      intervalSemitones = randChoice([1, 2]); // semitone, whole tone
    } else {
      // boss
      intervalSemitones = randChoice([1, 2, 3, 4, 7, 12]);
    }

    const baseMidi = randInt(55, 67); // G3 to G4
    const isHigher = Math.random() > 0.5;
    const targetMidi = isHigher ? baseMidi + intervalSemitones : baseMidi - intervalSemitones;

    const baseNote = midiToNoteName(baseMidi);
    const targetNote = midiToNoteName(targetMidi);

    return {
      id: `pd_${index}_${Date.now()}`,
      category: 'direction',
      questionText: 'Is the second note HIGHER or LOWER than the first?',
      audioPrompt: {
        type: 'sequence',
        notes: [baseNote, targetNote],
        durations: [0.6, 0.7],
        delays: [0, 0.7]
      },
      options: [
        { id: 'higher', label: 'Higher ⬆️', isCorrect: isHigher },
        { id: 'lower', label: 'Lower ⬇️', isCorrect: !isHigher }
      ],
      explanation: `The first note was ${baseNote} and the second note was ${targetNote} (${isHigher ? 'Higher' : 'Lower'} by ${intervalSemitones} semitones).`,
      comparison: {
        playedNotes: [baseNote, targetNote],
        correctLabel: isHigher ? 'Higher ⬆️' : 'Lower ⬇️'
      }
    };
  }

  // 2. SOLFEGE - Key of C
  if (type.startsWith('solfege_do_re')) {
    const isDoReOnly = type === 'solfege_do_re';
    const pool = isDoReOnly ? [0, 1] : [0, 1, 2]; // 0=Do, 1=Re, 2=Mi
    const chosenIdx = randChoice(pool);
    const chosen = SOLFEGE_SCALE[chosenIdx];

    const options = pool.map(idx => ({
      id: SOLFEGE_SCALE[idx].syllable,
      label: `${SOLFEGE_SCALE[idx].syllable} (${SOLFEGE_SCALE[idx].noteC})`,
      isCorrect: idx === chosenIdx
    }));

    return {
      id: `solf_${index}_${Date.now()}`,
      category: 'solfege',
      questionText: 'Listen and identify the Solfège note (in Key of C):',
      tonicDrone: 'C4',
      audioPrompt: {
        type: 'note',
        notes: [chosen.noteC],
        durations: [1.0]
      },
      options,
      explanation: `The note played was ${chosen.syllable} (${chosen.noteC}).`,
      comparison: {
        playedNotes: [chosen.noteC],
        correctLabel: chosen.syllable
      }
    };
  }

  // 3. MELODY DO RE MI
  if (type === 'melody_do_re_mi') {
    const melodyLength = 3;
    const notesIdx = [];
    for (let m = 0; m < melodyLength; m++) {
      notesIdx.push(randChoice([0, 1, 2]));
    }
    const notesNames = notesIdx.map(i => SOLFEGE_SCALE[i].noteC);
    const syllables = notesIdx.map(i => SOLFEGE_SCALE[i].syllable).join(' - ');

    // Options are sequences of 3
    const possibleSequences = [
      notesIdx,
      [0, 2, 1],
      [2, 1, 0],
      [1, 0, 2]
    ];
    // deduplicate
    const uniqueSeqs = [];
    const seen = new Set();
    const targetKey = notesIdx.join(',');
    seen.add(targetKey);
    uniqueSeqs.push({ seq: notesIdx, correct: true });

    for (const s of possibleSequences) {
      const k = s.join(',');
      if (!seen.has(k) && uniqueSeqs.length < 3) {
        seen.add(k);
        uniqueSeqs.push({ seq: s, correct: false });
      }
    }
    // shuffle
    uniqueSeqs.sort(() => Math.random() - 0.5);

    return {
      id: `mel_${index}_${Date.now()}`,
      category: 'melody',
      questionText: 'Which 3-note melody did you hear?',
      tonicDrone: 'C4',
      audioPrompt: {
        type: 'sequence',
        notes: notesNames,
        durations: [0.5, 0.5, 0.7],
        delays: [0, 0.55, 1.1]
      },
      options: uniqueSeqs.map(u => ({
        id: u.seq.join('-'),
        label: u.seq.map(i => SOLFEGE_SCALE[i].syllable).join(' - '),
        isCorrect: u.correct
      })),
      explanation: `The sequence played was: ${syllables}.`,
      comparison: {
        playedNotes: notesNames,
        correctLabel: syllables
      }
    };
  }

  // 4. PENTACHORD (Do-Re-Mi-Fa-Sol)
  if (type.startsWith('solfege_pentachord')) {
    const pool = [0, 1, 2, 3, 4]; // Do to Sol
    const chosenIdx = randChoice(pool);
    const chosen = SOLFEGE_SCALE[chosenIdx];

    const options = pool.map(idx => ({
      id: SOLFEGE_SCALE[idx].syllable,
      label: `${SOLFEGE_SCALE[idx].syllable} (${SOLFEGE_SCALE[idx].noteC})`,
      isCorrect: idx === chosenIdx
    }));

    return {
      id: `penta_${index}_${Date.now()}`,
      category: 'solfege',
      questionText: 'Identify the note in the C Pentachord (Do - Sol):',
      tonicDrone: 'C4',
      audioPrompt: {
        type: 'note',
        notes: [chosen.noteC],
        durations: [1.0]
      },
      options,
      explanation: `The note was ${chosen.syllable} (${chosen.noteC}, Degree ${chosen.degree}).`,
      comparison: {
        playedNotes: [chosen.noteC],
        correctLabel: chosen.syllable
      }
    };
  }

  // 5. FULL SCALE SOLFEGE
  if (type.startsWith('solfege_full') || type === 'solfege_boss') {
    const pool = [0, 1, 2, 3, 4, 5, 6, 7]; // 1 through 8
    const chosenIdx = randChoice(pool);
    const chosen = SOLFEGE_SCALE[chosenIdx];

    // Pick 4 options including correct
    const otherIdxs = pool.filter(i => i !== chosenIdx).sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [chosenIdx, ...otherIdxs].sort((a, b) => a - b);

    const options = choices.map(idx => ({
      id: SOLFEGE_SCALE[idx].syllable,
      label: `${SOLFEGE_SCALE[idx].syllable} (${SOLFEGE_SCALE[idx].degree})`,
      isCorrect: idx === chosenIdx
    }));

    return {
      id: `fullscale_${index}_${Date.now()}`,
      category: 'solfege',
      questionText: 'Listen and identify the diatonic scale degree:',
      tonicDrone: 'C4',
      audioPrompt: {
        type: 'note',
        notes: [chosen.noteC],
        durations: [1.0]
      },
      options,
      explanation: `That was ${chosen.syllable} (Scale Degree ${chosen.degree}). Notice how it resonates against the tonic Do.`,
      comparison: {
        playedNotes: [chosen.noteC],
        correctLabel: `${chosen.syllable} (${chosen.degree})`
      }
    };
  }

  // 6. DIFFERENT KEYS
  if (type.startsWith('key_')) {
    let keyName = 'G Major';
    let rootMidi = 55; // G3
    let notePool = [
      { syllable: 'Do', offset: 0 },
      { syllable: 'Re', offset: 2 },
      { syllable: 'Mi', offset: 4 },
      { syllable: 'Sol', offset: 7 },
      { syllable: 'Ti', offset: 11 },
      { syllable: 'High Do', offset: 12 }
    ];

    if (type === 'key_f_major') {
      keyName = 'F Major';
      rootMidi = 53; // F3
    } else if (type === 'key_random') {
      const keys = [
        { name: 'D Major', root: 50 },
        { name: 'A Major', root: 57 },
        { name: 'E Major', root: 52 },
        { name: 'Bb Major', root: 58 }
      ];
      const selectedKey = randChoice(keys);
      keyName = selectedKey.name;
      rootMidi = selectedKey.root;
    }

    const chosenItem = randChoice(notePool);
    const targetMidi = rootMidi + chosenItem.offset;
    const targetNoteName = midiToNoteName(targetMidi);
    const tonicNoteName = midiToNoteName(rootMidi);

    const otherItems = notePool.filter(i => i.syllable !== chosenItem.syllable).sort(() => Math.random() - 0.5).slice(0, 3);
    const allOptions = [chosenItem, ...otherItems].sort(() => Math.random() - 0.5);

    return {
      id: `key_${index}_${Date.now()}`,
      category: 'transposition',
      questionText: `Key of ${keyName}: What Solfège degree is this mystery note?`,
      cadenceIntro: {
        description: 'Tonic Cadence',
        tonic: tonicNoteName
      },
      tonicDrone: tonicNoteName,
      audioPrompt: {
        type: 'note',
        notes: [targetNoteName],
        durations: [1.1]
      },
      options: allOptions.map(o => ({
        id: o.syllable,
        label: o.syllable,
        isCorrect: o.syllable === chosenItem.syllable
      })),
      explanation: `In the key of ${keyName} (Tonic: ${tonicNoteName}), this note was ${chosenItem.syllable} (${targetNoteName}).`,
      comparison: {
        playedNotes: [targetNoteName],
        correctLabel: chosenItem.syllable
      }
    };
  }

  // 7. TRIAD CHORDS
  if (type.startsWith('triad_')) {
    let chordPool = ['major', 'minor'];
    if (type === 'triad_dim_aug') {
      chordPool = ['diminished', 'augmented'];
    } else if (type === 'triad_4way') {
      chordPool = ['major', 'minor', 'diminished', 'augmented'];
    }

    const chosenChordKey = randChoice(chordPool);
    const chordInfo = CHORD_FORMULAS[chosenChordKey];
    const rootMidi = randInt(55, 65); // G3 to F4
    const rootName = midiToNoteName(rootMidi);
    const chordNotes = chordInfo.intervals.map(offset => midiToNoteName(rootMidi + offset));
    const isArpeggio = type === 'triad_arpeggio';

    const options = chordPool.map(cKey => ({
      id: cKey,
      label: `${CHORD_FORMULAS[cKey].label} (${CHORD_FORMULAS[cKey].mood.split(',')[0]})`,
      isCorrect: cKey === chosenChordKey
    }));

    return {
      id: `triad_${index}_${Date.now()}`,
      category: 'chord',
      questionText: isArpeggio ? 'Identify the arpeggiated triad quality:' : 'Is this triad Major, Minor, or other?',
      audioPrompt: {
        type: isArpeggio ? 'sequence' : 'chord',
        notes: chordNotes,
        durations: isArpeggio ? [0.4, 0.4, 0.7] : [1.3],
        delays: isArpeggio ? [0, 0.4, 0.8] : [0]
      },
      options,
      explanation: `This was a ${chordInfo.label} (Root: ${rootName}). Characteristic mood: ${chordInfo.mood}.`,
      comparison: {
        playedNotes: chordNotes,
        correctLabel: chordInfo.label
      }
    };
  }

  // 8. SEVENTH CHORDS
  if (type.startsWith('seventh_')) {
    let seventhPool = ['maj7', 'dom7'];
    if (type === 'seventh_min_minmaj') {
      seventhPool = ['min7', 'minmaj7'];
    } else if (type === 'seventh_dim_halfdim') {
      seventhPool = ['dim7', 'halfdim7'];
    } else if (type === 'seventh_aug7') {
      seventhPool = ['aug7', 'dom7', 'maj7'];
    } else if (type === 'seventh_master') {
      seventhPool = ['maj7', 'dom7', 'min7', 'dim7', 'halfdim7', 'aug7'];
    }

    const chosenKey = randChoice(seventhPool);
    const chordInfo = CHORD_FORMULAS[chosenKey];
    const rootMidi = randInt(55, 64);
    const rootName = midiToNoteName(rootMidi);
    const chordNotes = chordInfo.intervals.map(offset => midiToNoteName(rootMidi + offset));

    const options = seventhPool.slice(0, 4).map(sKey => ({
      id: sKey,
      label: `${CHORD_FORMULAS[sKey].label} — ${CHORD_FORMULAS[sKey].mood.split(',')[0]}`,
      isCorrect: sKey === chosenKey
    }));

    return {
      id: `seventh_${index}_${Date.now()}`,
      category: 'seventh_chord',
      questionText: 'Listen to this 7th chord. What is its quality?',
      audioPrompt: {
        type: 'chord',
        notes: chordNotes,
        durations: [1.5],
        delays: [0]
      },
      options,
      explanation: `This was a ${chordInfo.label} (${chordInfo.name}) on ${rootName}. Vibe: ${chordInfo.mood}.`,
      comparison: {
        playedNotes: chordNotes,
        correctLabel: chordInfo.label
      }
    };
  }

  // Fallback
  return {
    id: `fallback_${index}`,
    category: 'direction',
    questionText: 'Is the second note Higher or Lower?',
    audioPrompt: {
      type: 'sequence',
      notes: ['C4', 'G4'],
      durations: [0.6, 0.6],
      delays: [0, 0.6]
    },
    options: [
      { id: 'higher', label: 'Higher ⬆️', isCorrect: true },
      { id: 'lower', label: 'Lower ⬇️', isCorrect: false }
    ],
    explanation: 'The second note was G4, which is higher than C4.',
    comparison: {
      playedNotes: ['C4', 'G4'],
      correctLabel: 'Higher ⬆️'
    }
  };
}

module.exports = {
  UNITS,
  CHORD_FORMULAS,
  SOLFEGE_SCALE,
  NOTE_FREQUENCIES,
  INTERVAL_NAMES,
  generateQuestionsForLevel,
  generateSingleQuestion,
  midiToNoteName,
  noteNameToMidi
};
