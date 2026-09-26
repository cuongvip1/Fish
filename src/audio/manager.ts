import { Howl } from 'howler';

export type Sfx = 'splash' | 'bite' | 'reel' | 'catch' | 'snap' | 'click' | 'water';

const cache = new Map<Sfx, Howl>();

function sfx(name: Sfx, opts: { loop?: boolean; volume?: number } = {}): Howl | null {
  if (typeof window === 'undefined') return null;
  let h = cache.get(name);
  if (!h) {
    h = new Howl({ src: [`sounds/${name}.wav`], loop: opts.loop ?? false, volume: opts.volume ?? 0.6 });
    cache.set(name, h);
  }
  return h;
}

export function playSfx(name: Sfx): void {
  sfx(name)?.play();
}

export function startWaterLoop(): void {
  const h = sfx('water', { loop: true, volume: 0.25 });
  if (h && !h.playing()) h.play();
}

export function startReelLoop(): void {
  const h = sfx('reel', { loop: true, volume: 0.5 });
  if (h && !h.playing()) h.play();
}

export function stopReelLoop(): void {
  cache.get('reel')?.stop();
}
