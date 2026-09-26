// Entry point: wires game + renderer + input, owns the RAF loop and overlay UI.
import { createGame, reset, update, STATE } from './game.js';
import { createRenderer } from './renderer.js';
import { bindInput } from './input.js';

const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const game = createGame();
const renderer = createRenderer(canvas);

game.onGameOver = showGameOver;
bindInput(canvas, game);
overlay.querySelector('#startBtn').addEventListener('click', startRound);

function startRound() {
  overlay.classList.add('hidden');
  reset(game);
  game.state = STATE.AIM;
}

function showGameOver(g) {
  overlay.innerHTML = `
    <h2>⏰ Hết giờ!</h2>
    <p>Điểm: <b style="color:#ffd76b;font-size:22px">${g.score}</b> — ${g.caught} con cá<br>
    Kỷ lục: ${g.highScore}</p>
    <button id="startBtn">CHƠI LẠI</button>`;
  overlay.classList.remove('hidden');
  overlay.querySelector('#startBtn').addEventListener('click', startRound);
}

let lastT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
  lastT = t;
  if (game.state !== STATE.MENU && game.state !== STATE.OVER) update(game, dt);
  renderer.draw(game);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
