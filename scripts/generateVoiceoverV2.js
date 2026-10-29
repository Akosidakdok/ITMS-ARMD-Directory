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
    text: "Welcome to PAIS 2.0, the unified personnel system for the PNP ITMS."
  },
  {
    id: 's02',
    start: 7.8,
    text: "One connected database powers every module with zero duplicate entry."
  },
  {
    id: 's03',
    start: 15.8,
    text: "The live dashboard delivers real-time strength counts across all divisions."
  },
  {
    id: 's04',
    start: 26.0,
    text: "Access centralized 201 records, multi-parameter search, and personnel profiles."
  },
  {
    id: 's05',
    start: 39.0,
    text: "The promotional module audits seniority and time in grade automatically."
  },
  {
    id: 's06',
    start: 51.0,
    text: "Select promotional candidates and validate records before export."
  },
  {
    id: 's07',
    start: 61.5,
    text: "The interactive worksheet center gives full spreadsheet control in your browser."
  },
  {
    id: 's08',
    start: 73.5,
    text: "Database fields stream directly into the seventeen official worksheet columns."
  },
  {
    id: 's09',
    start: 87.5,
    text: "Generate official promotional examination worksheets with complete data accuracy."
  },
  {
    id: 's10',
    start: 100.5,
    text: "Export clean single-sheet Excel workbooks ready for landscape A4 printing."
  },
  {
    id: 's11',
    start: 109.8,
    text: "From orders and assignments to education and reports, PAIS 2.0 covers all desks."
  },
  {
    id: 's12',
    start: 116.8,
    text: "PAIS 2.0. One database. One system."
  }
];

async function generateAll() {
  console.log('Generating non-overlapping voiceover clips with Kokoro TTS...');
  for (const scene of scenes) {
    const outFile = path.join(VOICE_DIR, `${scene.id}.wav`);
    console.log(`Generating ${scene.id}...`);
    const cmd = `npx hyperframes tts "${scene.text}" -v am_michael -s 1.05 -o "${outFile}"`;
    execSync(cmd, { stdio: 'inherit' });
  }

  // Check clip durations
  console.log('\n--- Checking clip durations & boundaries ---');
  let prevEnd = 0;
  for (const s of scenes) {
    const file = path.join(VOICE_DIR, `${s.id}.wav`);
    const durStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`).toString().trim();
    const dur = parseFloat(durStr);
    const end = s.start + dur;
    console.log(`${s.id}: start=${s.start.toFixed(1)}s, dur=${dur.toFixed(2)}s, end=${end.toFixed(2)}s (gap from prev=${(s.start - prevEnd).toFixed(2)}s)`);
    if (s.start < prevEnd) {
      console.error(`ERROR: Overlap detected! ${s.id} starts at ${s.start}s before previous ended at ${prevEnd}s!`);
      process.exit(1);
    }
    prevEnd = end;
  }
  console.log('✓ All 12 clips verified: ZERO OVERLAP!\n');

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
