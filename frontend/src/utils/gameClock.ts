import { GameClock, GamePhase, GameTiming } from "../types/game";

// Convertit l'horloge reçue du serveur en horloge locale : `offset` est l'écart estimé
// entre l'heure serveur et l'heure du navigateur (latence réseau ignorée, ~dizaines de ms)
export const toGameClock = (timing: GameTiming): GameClock => ({
  startTime: timing.gameStartTime,
  offset: timing.serverNow - Date.now(),
  time: timing.time,
});

// Tour, phase et temps restant à l'instant présent. Même découpage que le serveur :
// `time` s de devinette, 5 s de révélation, 2 s de transition. Sur le dernier
// morceau, on passe aux résultats (tour = trackCount + 1) dès la fin de la révélation.
export function getClockState(
  clock: GameClock,
  trackCount: number,
): { turn: number; phase: GamePhase; timeLeft: number } {
  const turnDuration = clock.time + 7;
  const elapsed = (Date.now() + clock.offset - clock.startTime) / 1000;
  const turn = Math.max(1, Math.floor(elapsed / turnDuration) + 1);
  const inTurn = elapsed - (turn - 1) * turnDuration;

  if (turn > trackCount || (turn === trackCount && inTurn >= clock.time + 5)) {
    return { turn: trackCount + 1, phase: "answer", timeLeft: 0 };
  }
  if (inTurn < clock.time) {
    return { turn, phase: "guessing", timeLeft: Math.ceil(clock.time - inTurn) };
  }
  if (inTurn < clock.time + 5) {
    return { turn, phase: "answer", timeLeft: Math.ceil(clock.time + 5 - inTurn) };
  }
  return { turn, phase: "transition", timeLeft: Math.ceil(turnDuration - inTurn) };
}
