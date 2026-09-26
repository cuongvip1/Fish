// Generates 16-bit mono 22050Hz PCM WAVs into public/sounds/. Run: npm run gen-sounds
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const SR = 22050;
const OUT = path.resolve('public/sounds');
mkdirSync(OUT, { recursive: true });

function wav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  return buf;
}

const sec = (s) => Math.round(s * SR);
const sine = (f, t) => Math.sin(2 * Math.PI * f * t);
const env = (t, dur, a = 0.01) => Math.min(1, t / a) * Math.exp(-3 * t / dur);

// water: slow-undulating filtered noise loop (3s, loopable)
{
  const n = sec(3);
  const s = new Float64Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = Math.random() * 2 - 1;
    lp += 0.04 * (w - lp); // lowpass
    const lfo = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.4 * t);
    s[i] = lp * 2.2 * lfo * 0.5;
  }
  // crossfade ends for seamless loop
  const fade = sec(0.2);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    s[i] = s[i] * k + s[n - fade + i] * (1 - k);
  }
  writeFileSync(path.join(OUT, 'water.wav'), wav(s));
}

// splash: noise burst with fast decay + low sine "plop" (0.45s)
{
  const n = sec(0.45);
  const s = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = Math.random() * 2 - 1;
    s[i] = w * env(t, 0.45, 0.005) * 0.5 + sine(160 - t * 120, t) * env(t, 0.2) * 0.4;
  }
  writeFileSync(path.join(OUT, 'splash.wav'), wav(s));
}

// bite: two-tone alert beep (0.3s)
{
  const n = sec(0.3);
  const s = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = t < 0.13 ? 880 : 1320;
    s[i] = sine(f, t) * env(t, 0.14, 0.004) * 0.45;
  }
  writeFileSync(path.join(OUT, 'bite.wav'), wav(s));
}

// reel: click-ratchet loop (0.25s, loops while reeling)
{
  const n = sec(0.25);
  const s = new Float64Array(n);
  const clicks = 7;
  for (let c = 0; c < clicks; c++) {
    const start = Math.round((c / clicks) * n);
    for (let i = 0; i < sec(0.02) && start + i < n; i++) {
      const t = i / SR;
      s[start + i] += (Math.random() * 2 - 1) * Math.exp(-t * 220) * 0.6 + sine(2400, t) * Math.exp(-t * 300) * 0.25;
    }
  }
  writeFileSync(path.join(OUT, 'reel.wav'), wav(s));
}

// catch: 3-note arpeggio jingle (0.8s)
{
  const n = sec(0.8);
  const s = new Float64Array(n);
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((f, k) => {
    const off = k * 0.12;
    for (let i = 0; i < n; i++) {
      const t = i / SR - off;
      if (t < 0) continue;
      s[i] += sine(f, t) * env(t, 0.5, 0.008) * 0.35 + sine(f * 2, t) * env(t, 0.4) * 0.12;
    }
  });
  writeFileSync(path.join(OUT, 'catch.wav'), wav(s));
}

// snap: sharp noise crack (0.2s)
{
  const n = sec(0.2);
  const s = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = Math.random() * 2 - 1;
    s[i] = w * Math.exp(-t * 40) * 0.8 * (t < 0.01 ? t / 0.01 : 1);
  }
  writeFileSync(path.join(OUT, 'snap.wav'), wav(s));
}

// click: UI blip (0.05s)
{
  const n = sec(0.05);
  const s = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = Math.sign(sine(1200, t)) * env(t, 0.05, 0.002) * 0.25;
  }
  writeFileSync(path.join(OUT, 'click.wav'), wav(s));
}

console.log('wrote', 7, 'wavs to', OUT);
