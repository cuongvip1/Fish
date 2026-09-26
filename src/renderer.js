// All canvas drawing. Reads game state; never mutates it.
import { CANVAS as C, WATER_Y, BOAT_X } from './config.js';
import { STATE, rodTip } from './game.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return { draw: g => draw(ctx, g) };
}

function draw(ctx, g) {
  drawSky(ctx);
  drawWater(ctx);
  for (const f of g.fishes) drawFish(ctx, f);
  drawRipples(ctx, g.ripples);
  drawBoat(ctx, g);
  drawLineAndBobber(ctx, g);
  drawParticles(ctx, g.particles);
  drawHUD(ctx, g);
  drawNotices(ctx, g.notices);
}

function drawSky(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, WATER_Y);
  sky.addColorStop(0, '#1a2b52'); sky.addColorStop(1, '#e8875a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, C.width, WATER_Y + 2);

  ctx.fillStyle = '#ffd76b';
  ctx.beginPath(); ctx.arc(C.width - 140, 70, 34, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,215,107,.25)';
  ctx.beginPath(); ctx.arc(C.width - 140, 70, 52, 0, 7); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,.16)';
  for (let i = 0; i < 4; i++) {
    const cx = (i * 260 + (performance.now() / 80) % (C.width + 200)) % (C.width + 200) - 100;
    ctx.beginPath(); ctx.ellipse(cx, 50 + i * 34, 60, 16, 0, 0, 7); ctx.fill();
  }
}

function drawWater(ctx) {
  const wat = ctx.createLinearGradient(0, WATER_Y, 0, C.height);
  wat.addColorStop(0, '#1e6f9c'); wat.addColorStop(1, '#062c44');
  ctx.fillStyle = wat; ctx.fillRect(0, WATER_Y, C.width, C.height - WATER_Y);

  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    for (let x = 0; x <= C.width; x += 12)
      ctx.lineTo(x, WATER_Y + 4 + i * 4 + Math.sin(x / 40 + performance.now() / (500 + i * 120)) * 2.5);
    ctx.stroke();
  }

  ctx.fillStyle = '#0a2334'; ctx.fillRect(0, C.height - 26, C.width, 26);
  ctx.fillStyle = '#0d2e42';
  for (let i = 0; i < 9; i++) {
    ctx.beginPath(); ctx.ellipse(i * 120 + 30, C.height - 18, 40, 14, 0, 0, 7); ctx.fill();
  }
}

function drawFish(ctx, f) {
  const s = f.size;
  ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.dir, 1);
  const wig = Math.sin(f.wob) * 0.12;

  ctx.fillStyle = f.sp.color;
  ctx.beginPath(); ctx.moveTo(-s * 0.7, 0);
  ctx.lineTo(-s * 1.25, -s * 0.4 + wig * s);
  ctx.lineTo(-s * 1.25, s * 0.4 + wig * s); ctx.closePath(); ctx.fill();

  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.45, 0, 0, 7); ctx.fill();

  ctx.fillStyle = f.sp.belly;
  ctx.beginPath(); ctx.ellipse(s * 0.1, s * 0.14, s * 0.62, s * 0.24, 0, 0, 7); ctx.fill();

  ctx.fillStyle = f.sp.color;
  ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.42);
  ctx.lineTo(s * 0.2, -s * 0.75); ctx.lineTo(s * 0.35, -s * 0.4); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.1, s * 0.11, 0, 7); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(s * 0.58, -s * 0.1, s * 0.055, 0, 7); ctx.fill();
  ctx.restore();
}

function drawRipples(ctx, ripples) {
  for (const r of ripples) {
    ctx.strokeStyle = `rgba(255,255,255,${r.a * 0.5})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.32, 0, 0, 7); ctx.stroke();
  }
}

function drawBoat(ctx, g) {
  ctx.fillStyle = '#7a4a2b';
  ctx.beginPath();
  ctx.moveTo(BOAT_X - 80, WATER_Y - 4);
  ctx.quadraticCurveTo(BOAT_X, WATER_Y + 34, BOAT_X + 92, WATER_Y - 4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9c6339'; ctx.fillRect(BOAT_X - 80, WATER_Y - 10, 172, 8);

  ctx.fillStyle = '#d95f43';
  ctx.beginPath(); ctx.ellipse(BOAT_X + 18, WATER_Y - 34, 15, 20, 0, 0, 7); ctx.fill();

  ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(BOAT_X + 20, WATER_Y - 60, 10, 0, 7); ctx.fill();

  ctx.fillStyle = '#e0b64f';
  ctx.beginPath(); ctx.ellipse(BOAT_X + 20, WATER_Y - 66, 16, 5, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(BOAT_X + 20, WATER_Y - 68, 8, Math.PI, 0); ctx.fill();

  const tip = rodTip();
  ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(BOAT_X + 26, WATER_Y - 44); ctx.lineTo(tip.x, tip.y); ctx.stroke();

  if (g.state === STATE.AIM) {
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
    ctx.quadraticCurveTo(tip.x + 160, tip.y - 90, tip.x + 300 + g.power * 200, WATER_Y);
    ctx.stroke(); ctx.setLineDash([]);
  }
}

function drawLineAndBobber(ctx, g) {
  const tip = rodTip();
  const target = g.hookedFish || g.bobber;
  if (target) {
    ctx.strokeStyle = g.tension > 0.8 ? '#ff6b6b' : 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
    ctx.quadraticCurveTo((tip.x + target.x) / 2, Math.min(tip.y, target.y) + 30, target.x, target.y);
    ctx.stroke();
  }
  const b = g.bobber;
  if (b && b.state !== 'fly') {
    ctx.fillStyle = '#e33'; ctx.beginPath(); ctx.arc(b.x, b.y - 4, 6, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y - 4, 6, 0, Math.PI); ctx.fill();
    if (b.state === 'bite') {
      ctx.fillStyle = '#ffd76b'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', b.x, b.y - 18);
    }
  }
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.fillStyle = p.c; ctx.globalAlpha = Math.min(1, p.t * 2);
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHUD(ctx, g) {
  ctx.fillStyle = 'rgba(4,10,22,.55)'; ctx.fillRect(0, 0, C.width, 40);

  ctx.fillStyle = '#ffd76b'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`Điểm: ${g.score}`, 16, 26);
  ctx.fillStyle = '#9fb4d8'; ctx.fillText(`Cá: ${g.caught}`, 140, 26);

  ctx.textAlign = 'right';
  ctx.fillStyle = g.timeLeft < 15 ? '#ff7070' : '#fff';
  ctx.fillText(`⏱ ${Math.ceil(g.timeLeft)}s`, C.width - 16, 26);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#7fa0cc'; ctx.font = '13px sans-serif';
  ctx.fillText(`Kỷ lục: ${g.highScore}`, C.width / 2, 26);

  if (g.state === STATE.AIM && (g.charging || g.power > 0))
    drawBar(ctx, powerGradient(ctx), g.power, 'LỰC NÉM');

  if (g.state === STATE.HOOKED)
    drawBar(ctx, g.tension > 0.75 ? '#ff4d4d' : '#7dff9b', g.tension,
      g.tension > 0.75 ? '⚠ SẮP ĐỨT!' : 'ĐỘ CĂNG DÂY — giữ chuột để kéo');
}

function drawBar(ctx, fill, value, label) {
  const x = C.width / 2 - 130, y = C.height - 52;
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y, 260, 20);
  ctx.fillStyle = fill; ctx.fillRect(x + 2, y + 2, 256 * value, 16);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(label, C.width / 2, y - 8);
}

const powerGradient = ctx => {
  const gr = ctx.createLinearGradient(C.width / 2 - 130, 0, C.width / 2 + 130, 0);
  gr.addColorStop(0, '#7dff9b'); gr.addColorStop(1, '#ff7b54');
  return gr;
};

function drawNotices(ctx, notices) {
  ctx.textAlign = 'center';
  for (const n of notices) {
    ctx.globalAlpha = Math.min(1, n.t * 2);
    ctx.fillStyle = n.color; ctx.font = 'bold 17px sans-serif';
    ctx.fillText(n.txt, n.x, n.y);
  }
  ctx.globalAlpha = 1;
}
