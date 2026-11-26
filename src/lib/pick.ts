import type { Data, Mark, Q } from './types';
import { days } from './dates';

/** Why a question is in today's Do Now. Always a word on screen, never colour alone. */
export type Why = 'Last lesson' | 'Last week' | 'Last term' | 'Recap' | 'Any topic';
const POOL: Why[] = ['Last lesson', 'Last week', 'Last term', 'Any topic'];

export const eligible = (q: Q, c: string) => q.cl.length === 0 || q.cl.includes(c);
export function lastHist(q: Q, c: string) { for (let i = q.h.length - 1; i >= 0; i--) if (q.h[i].c === c) return q.h[i]; return null; }
export const lastMark = (q: Q, c: string): Mark | null => lastHist(q, c)?.m ?? null;

/** 3: few got it, so it comes back at the next lesson. 2: some got it, so it comes back later in the week. 0: leave it for now. */
export function duePri(q: Q, c: string, today: string): number {
  const l = lastHist(q, c);
  if (!l || l.d >= today) return 0;
  if (l.m === 2) return 3;
  if (l.m === 1 && days(l.d, today) >= 2) return 2;
  return 0;
}

export interface Cand { q: Q; pool: 0 | 1 | 2 | 3; due: number; asked: string }

/** Every question the class could be asked, with how recently its topic was taught (0 last lesson, 1 last week, 2 earlier, 3 never logged). */
export function candidates(data: Data, c: string, today: string): Cand[] {
  const tp = data.taught[c] ?? {}, lastBy: Record<string, string> = {};
  let newest = '';
  for (const [t, ds] of Object.entries(tp)) {
    const p = ds.filter((x) => x < today).sort();
    if (p.length) { lastBy[t] = p[p.length - 1]; if (lastBy[t] > newest) newest = lastBy[t]; }
  }
  const poolOf = (t: string): 0 | 1 | 2 | 3 => { const d = lastBy[t]; if (!d) return 3; if (d === newest) return 0; return days(d, today) <= 7 ? 1 : 2; };
  return data.qs.filter((q) => eligible(q, c)).map((q) => ({ q, pool: poolOf(q.t), due: duePri(q, c, today), asked: lastHist(q, c)?.d ?? '' }));
}

type Rnd = () => number;
const rank = (cands: Cand[], avoid: Set<string>, rnd: Rnd) =>
  cands.map((x) => ({ x, k: [avoid.has(x.q.id) ? 1 : 0, -x.due, x.asked || '0000-00-00', rnd()] as const }))
    .sort((a, b) => { for (let i = 0; i < 4; i++) { if (a.k[i] < b.k[i]) return -1; if (a.k[i] > b.k[i]) return 1; } return 0; }).map((s) => s.x);

/** Five questions: two from the last lesson, two from last week, one from earlier in the term. Anything the class got wrong comes back first. */
export function build(cands: Cand[], n = 5, avoid: Set<string> = new Set(), rnd: Rnd = Math.random): { id: string; why: Why }[] {
  const sorted = rank(cands, avoid, rnd), taken: { x: Cand; why: Why }[] = [], used = new Set<string>();
  const take = (x: Cand, why: Why) => { if (taken.length < n && !used.has(x.q.id)) { used.add(x.q.id); taken.push({ x, why }); return true; } return false; };
  let back = 0;
  for (const x of sorted) { if (back >= 2) break; if (x.due > 0 && take(x, 'Recap')) back++; }
  const quota = [2, 2, 1], have = [0, 0, 0];
  taken.forEach((t) => { if (t.x.pool < 3) have[t.x.pool]++; });
  for (let p = 0; p < 3; p++) for (const x of sorted) { if (have[p] >= quota[p]) break; if (x.pool === p && take(x, POOL[p])) have[p]++; }
  for (const x of sorted) if (x.pool < 3) take(x, POOL[x.pool]);
  for (const x of sorted) take(x, 'Any topic');
  return taken.sort((a, b) => a.x.pool - b.x.pool).map((t) => ({ id: t.x.q.id, why: t.why }));
}

/** One question in the set is swapped for another from the same part of the course where possible. */
export function swapOne(cands: Cand[], current: string[], index: number, rnd: Rnd = Math.random): { id: string; why: Why } | null {
  const cur = cands.find((c) => c.q.id === current[index]);
  const others = cands.filter((c) => !current.includes(c.q.id));
  if (!others.length) return null;
  const same = cur ? others.filter((c) => c.pool === cur.pool) : [];
  const x = rank(same.length ? same : others, new Set(), rnd)[0];
  return { id: x.q.id, why: x.due > 0 ? 'Recap' : POOL[x.pool] };
}

export type Status = 'Recap' | 'Mixed' | 'Strong' | '';
/** How a class is doing on a topic, from the last result of each of its questions. */
export function topicStatus(data: Data, t: string, c: string): Status {
  let worst = -1;
  for (const q of data.qs) if (q.t === t && eligible(q, c)) { const m = lastMark(q, c); if (m !== null) worst = Math.max(worst, m); }
  return worst === 2 ? 'Recap' : worst === 1 ? 'Mixed' : worst === 0 ? 'Strong' : '';
}
export const statusChip = (s: Status) => (s === 'Recap' ? 'chip bad' : s === 'Mixed' ? 'chip gold' : s === 'Strong' ? 'chip' : 'chip none');
export const whyChip = (w: string) => (w === 'Recap' ? 'chip bad' : w === 'Last week' ? 'chip gold' : w === 'Last term' ? 'chip ink' : w === 'Any topic' ? 'chip none' : 'chip');
