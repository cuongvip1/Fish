// DOM input bindings → game actions. The only module that owns event listeners.
import { STATE, startCharge, releaseCast, strikeOrRecall } from './game.js';

export function bindInput(canvas, game) {
  canvas.addEventListener('mousedown', () => {
    switch (game.state) {
      case STATE.AIM:    startCharge(game); break;
      case STATE.WAIT:   strikeOrRecall(game); break;
      case STATE.HOOKED: game.reeling = true; break;
    }
  });

  canvas.addEventListener('mouseup', () => {
    releaseCast(game);
    game.charging = false;
  });

  addEventListener('mouseup', () => { game.reeling = false; });
  addEventListener('keydown', e => {
    if (e.code === 'Space' && game.state === STATE.HOOKED) { game.reeling = true; e.preventDefault(); }
  });
  addEventListener('keyup', e => {
    if (e.code === 'Space') game.reeling = false;
  });
}
