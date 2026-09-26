import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const WAVS = ['splash', 'bite', 'reel', 'catch', 'snap', 'click', 'water'];

describe('generated audio', () => {
  for (const n of WAVS) {
    it(`${n}.wav is a valid 16-bit PCM WAV`, () => {
      const p = path.resolve('public/sounds', `${n}.wav`);
      expect(existsSync(p)).toBe(true);
      const b = readFileSync(p);
      expect(b.toString('ascii', 0, 4)).toBe('RIFF');
      expect(b.toString('ascii', 8, 12)).toBe('WAVE');
      expect(b.toString('ascii', 12, 16)).toBe('fmt ');
      expect(b.readUInt16LE(34)).toBe(16); // bit depth
      expect(b.toString('ascii', 36, 40)).toBe('data');
      expect(b.length).toBeGreaterThan(1000);
    });
  }
});
