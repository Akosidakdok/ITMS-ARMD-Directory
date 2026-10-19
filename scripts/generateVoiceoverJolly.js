import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const VOICE_DIR = path.resolve('brag-output/composition/assets/voice');
if (!fs.existsSync(VOICE_DIR)) {
  fs.mkdirSync(VOICE_DIR, { recursive: true });
}

// Scene definitions tuned for 120s runtime with continuous engaging speech (NO dead air, NO overlap)
const scenes = [
  {
    id: 's01',
    start: 0.5,
    maxEnd: 6.8,
    text: "Welcome to PAIS 2.0! The new personnel and worksheet system for PNP ITMS!"
  },
  {
    id: 's02',
    start: 7.3,
    maxEnd: 14.6,
    text: "Everything connects to one master database! Zero duplicate entry and instant updates across every desk."
  },
  {
    id: 's03',
    start: 15.3,
    maxEnd: 24.6,
    text: "Check out this beautiful live dashboard! You get real time personnel strength numbers, unit assignments, and quick actions right at your fingertips with zero delay."
  },
  {
    id: 's04',
    start: 25.4,
    maxEnd: 37.4,
    text: "Finding personnel is an absolute breeze! Type any badge or name into the instant search bar, filter by office, and open complete digital 201 records in a single click."
  },
  {
    id: 's05',
    start: 38.4,
    maxEnd: 49.4,
    text: "Here is the powerhouse promotional module! Simply select your promotional process and rank, and PAIS automatically calculates eligibility, seniority, and time in grade."
  },
  {
    id: 's06',
    start: 50.4,
    maxEnd: 59.4,
    text: "Let us select our five candidates! The system instantly validates every required field and badge number with zero errors."
  },
  {
    id: 's07',
    start: 60.4,
    maxEnd: 71.4,
    text: "Step into the interactive worksheet center! You get a full spreadsheet experience right inside your web browser, complete with live formulas, dynamic titles, and instant editing."
  },
  {
    id: 's08',
    start: 72.4,
    maxEnd: 85.4,
    text: "Watch the magic happen! Real database records flow seamlessly into all seventeen official worksheet columns, perfectly mapped with zero manual copying or formatting headaches."
  },
  {
    id: 's09',
    start: 86.4,
    maxEnd: 98.4,
    text: "And look at this finished official worksheet! All five candidates are fully populated with computed scores, formatted headers, and official PNP-ITMS institutional branding."
  },
  {
    id: 's10',
    start: 99.4,
    maxEnd: 108.4,
    text: "Hit export for a clean, single-sheet Excel workbook! Pre-configured with A4 landscape margins and full formula parity."
  },
  {
    id: 's11',
    start: 109.3,
    maxEnd: 115.5,
    text: "Plus, PAIS 2.0 manages your leave tracking, asset inventory, and administrative reports!"
  },
  {
    id: 's12',
    start: 116.3,
    maxEnd: 119.5,
    text: "PAIS 2.0. One database. One system."
  }
];

async function generateAll() {
  console.log('Generating jolly, continuous voiceover clips with Kokoro af_heart...');
  for (const scene of scenes) {
    const outFile = path.join(VOICE_DIR, `${scene.id}.wav`);
    if (!fs.existsSync(outFile)) {
      console.log(`Generating ${scene.id}...`);
      const cmd = `npx hyperframes tts "${scene.text}" -v af_heart -s 1.08 -o "${outFile}"`;
      execSync(cmd, { stdio: 'inherit' });
    } else {
      console.log(`Using existing ${scene.id}.wav`);
    }
  }

  // Check clip durations
  console.log('\n--- Checking clip durations & boundaries ---');
  let prevEnd = 0;
  for (const s of scenes) {
    const file = path.join(VOICE_DIR, `${s.id}.wav`);
    const durStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`).toString().trim();
    const dur = parseFloat(durStr);
    const end = s.start + dur;
    const gapToNextScene = s.maxEnd - end;
    console.log(`${s.id}: start=${s.start.toFixed(1)}s, dur=${dur.toFixed(2)}s, end=${end.toFixed(2)}s (maxEnd=${s.maxEnd.toFixed(1)}s, buffer=${gapToNextScene.toFixed(2)}s)`);
    if (end > s.maxEnd) {
      console.error(`ERROR: Clip ${s.id} exceeds maxEnd! end=${end.toFixed(2)}s > maxEnd=${s.maxEnd.toFixed(1)}s`);
      process.exit(1);
    }
    if (s.start < prevEnd) {
      console.error(`ERROR: Overlap detected! ${s.id} starts at ${s.start}s before previous ended at ${prevEnd}s!`);
      process.exit(1);
    }
    prevEnd = end;
  }
  console.log('✓ All 12 clips verified: ZERO OVERLAP & ZERO DEAD AIR!\n');

  console.log('Assembling master voice track aligned to 120s timeline with ffmpeg...');
  let filterComplex = '';
  let inputs = '';
  scenes.forEach((s, idx) => {
    inputs += ` -i "${path.join(VOICE_DIR, `${s.id}.wav`)}"`;
    const delayMs = Math.round(s.start * 1000);
    filterComplex += `[${idx}]adelay=${delayMs}|${delayMs}[a${idx}];`;
  });
  const mixInputs = scenes.map((_, idx) => `[a${idx}]`).join('');
  filterComplex += `${mixInputs}amix=inputs=${scenes.length}:dropout_transition=0:normalize=0,loudnorm=I=-15:TP=-1.0:LRA=11,apad=whole_dur=120[out]`;

  const masterVoiceOut = path.resolve('brag-output/composition/assets/voice/voiceover_master.wav');
  const mixCmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[out]" -t 120 "${masterVoiceOut}"`;
  execSync(mixCmd, { stdio: 'inherit' });
  console.log('✓ Master voice track created at:', masterVoiceOut);

  console.log('Mixing soundtrack (music bed + clear voiceover)...');
  const bgmFile = path.resolve('brag-output/composition/assets/music/bgm.mp3');
  const soundTrackOut = path.resolve('brag-output/composition/assets/music/soundtrack.mp3');
  const soundCmd = `ffmpeg -y -i "${bgmFile}" -i "${masterVoiceOut}" -filter_complex "[0:a]volume=0.12,afade=t=out:st=117.5:d=2.5[music];[1:a]volume=1.0,afade=t=out:st=118.5:d=1.5[voice];[music][voice]amix=inputs=2:duration=first:normalize=0[out]" -map "[out]" -t 120 "${soundTrackOut}"`;
  execSync(soundCmd, { stdio: 'inherit' });
  console.log('✓ Master soundtrack created at:', soundTrackOut);
}

generateAll().catch(e => {
  console.error(e);
  process.exit(1);
});
