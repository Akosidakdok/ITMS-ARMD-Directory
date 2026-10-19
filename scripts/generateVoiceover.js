import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const VOICE_DIR = path.resolve('brag-output/composition/assets/voice');
if (!fs.existsSync(VOICE_DIR)) {
  fs.mkdirSync(VOICE_DIR, { recursive: true });
}

const scenes = [
  {
    id: 's01',
    start: 0.8,
    text: "Welcome to PAIS 2.0, the unified Personnel and Assignment Information System for the Philippine National Police Information Technology Management Service."
  },
  {
    id: 's02',
    start: 7.5,
    text: "Engineered as one connected enterprise platform, PAIS 2.0 establishes a single canonical source of truth across all administrative desks."
  },
  {
    id: 's03',
    start: 15.5,
    text: "The live dashboard provides instant visibility into recorded strength, automated category breakdowns, duty postings, and active personnel."
  },
  {
    id: 's04',
    start: 25.5,
    text: "The central personnel database manages complete 201 records with real-time multi-parameter search, rank classifications, and detailed profile inspection."
  },
  {
    id: 's05',
    start: 38.5,
    text: "The promotional module evaluates seniority automatically, calculating Time in Grade and Time in Position to generate qualified candidate rosters."
  },
  {
    id: 's06',
    start: 50.5,
    text: "Select candidates with confidence. Pre-export record validation audits mandatory fields, guaranteeing zero incomplete entries."
  },
  {
    id: 's07',
    start: 60.5,
    text: "In the Worksheet Center, an interactive in-browser spreadsheet module provides dynamic promotional examination titles and direct database synchronization."
  },
  {
    id: 's08',
    start: 72.5,
    text: "Watch database records map directly into the official 17-column layout, auto-populating badges, assignments, educational degrees, and mandatory courses."
  },
  {
    id: 's09',
    start: 86.5,
    text: "Here is the official completed promotional examination worksheet. All 17 canonical columns are populated with 100 percent data accuracy."
  },
  {
    id: 's10',
    start: 99.5,
    text: "With full formula calculation parity and landscape A4 page setup, generate official single-sheet Excel workbooks instantly."
  },
  {
    id: 's11',
    start: 109.5,
    text: "From special orders and assignments to education, reports, document templates, and access control, PAIS 2.0 unifies the entire enterprise."
  },
  {
    id: 's12',
    start: 116.5,
    text: "PAIS 2.0. Connected records. Consistent worksheets. One system."
  }
];

async function generateAll() {
  console.log('Generating voiceover clips with Kokoro TTS...');
  for (const scene of scenes) {
    const outFile = path.join(VOICE_DIR, `${scene.id}.wav`);
    console.log(`Generating ${scene.id}...`);
    const cmd = `npx hyperframes tts "${scene.text}" -v am_michael -s 1.05 -o "${outFile}"`;
    execSync(cmd, { stdio: 'inherit' });
  }

  console.log('Assembling master voice track aligned to 120s timeline with ffmpeg...');
  // Build ffmpeg filter_complex to place each clip at its exact timestamp
  let filterComplex = '';
  let inputs = '';
  scenes.forEach((s, idx) => {
    inputs += ` -i "${path.join(VOICE_DIR, `${s.id}.wav`)}"`;
    const delayMs = Math.round(s.start * 1000);
    filterComplex += `[${idx}]adelay=${delayMs}|${delayMs}[a${idx}];`;
  });
  const mixInputs = scenes.map((_, idx) => `[a${idx}]`).join('');
  filterComplex += `${mixInputs}amix=inputs=${scenes.length}:dropout_transition=0,apad=whole_dur=120[out]`;

  const masterVoiceOut = path.resolve('brag-output/composition/assets/voice/voiceover_master.wav');
  const mixCmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[out]" -t 120 "${masterVoiceOut}"`;
  execSync(mixCmd, { stdio: 'inherit' });
  console.log('✓ Master voice track created at:', masterVoiceOut);
}

generateAll().catch(e => {
  console.error(e);
  process.exit(1);
});
