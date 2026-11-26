/** Tower race: the rules, kept apart from the screen so they can be checked on their own. */
export const WIN = 10;
export const RACE_KEY = 'pmc:donow:race', RACE_STATE = 'pmc:donow:racestate';
export const TEAMS = [
  { l: 'A', bg: '#E58B7A', fg: '#171717' },
  { l: 'B', bg: '#337957', fg: '#FBF6EC' },
  { l: 'C', bg: '#E8C98A', fg: '#171717' },
  { l: 'D', bg: '#171717', fg: '#FBF6EC' },
] as const;
export const BOXES = ['+2 blocks', 'double next round', 'steal 1 block from the leader', 'shield: safe from steals', '+1 block'] as const;

/** Each team's blocks, whether its next block counts double, and whether it has a shield. */
export interface Snap { s: number[]; dbl: boolean[]; sh: boolean[] }
/** A team that got the question right, and the box it opened (-1 for none). */
export interface Tap { t: number; box: number }
export interface Setup { teams: number; rounds: number; box: boolean; ids: string[] }

export const fresh = (teams: number): Snap => ({ s: Array(teams).fill(0), dbl: Array(teams).fill(false), sh: Array(teams).fill(false) });
export const pickBox = (rnd: () => number = Math.random) => Math.floor(rnd() * BOXES.length);

/** Plays a round's taps onto the state the round started with. Replaying from the start is what makes Undo exact. */
export function play(base: Snap, taps: Tap[]): { snap: Snap; say: string } {
  const s = [...base.s], dbl = [...base.dbl], sh = [...base.sh];
  let say = '';
  for (const { t, box } of taps) {
    const gain = dbl[t] ? 2 : 1;
    dbl[t] = false;
    s[t] = Math.min(WIN, s[t] + gain);
    say = `Team ${TEAMS[t].l} got ${gain === 2 ? 'two blocks' : 'a block'}`;
    if (box < 0) { say += '.'; continue; }
    say += ` and opened a box: ${BOXES[box]}.`;
    if (box === 0) s[t] = Math.min(WIN, s[t] + 2);
    else if (box === 1) dbl[t] = true;
    else if (box === 4) s[t] = Math.min(WIN, s[t] + 1);
    else if (box === 3) sh[t] = true;
    else if (box === 2) {
      let lead = -1;
      s.forEach((v, i) => { if (i !== t && v > 0 && (lead < 0 || v > s[lead])) lead = i; });
      if (lead < 0) say += ' Nobody to steal from.';
      else if (sh[lead]) { sh[lead] = false; say += ` Team ${TEAMS[lead].l} was shielded.`; }
      else { s[lead] -= 1; s[t] = Math.min(WIN, s[t] + 1); say += ` Taken from Team ${TEAMS[lead].l}.`; }
    }
  }
  return { snap: { s, dbl, sh }, say };
}

/** Is the race over after this round, and who won? A team on 10 blocks ends it; otherwise it ends after the last round. */
export function result(s: number[], round: number, rounds: number): { over: boolean; winners: number[]; line: string } {
  const top = Math.max(...s), winners = s.map((v, i) => (v === top ? i : -1)).filter((i) => i >= 0);
  const over = top >= WIN || round >= rounds;
  const nm = (i: number) => `Team ${TEAMS[i].l}`;
  const line = !over ? '' : winners.length > 1 ? `A draw between ${winners.map(nm).join(' and ')}.` : top >= WIN ? `${nm(winners[0])} wins with ${WIN} blocks.` : `${nm(winners[0])} wins with the tallest tower.`;
  return { over, winners, line };
}
