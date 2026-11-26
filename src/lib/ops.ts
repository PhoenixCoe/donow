import { answerOf, uid, type Data, type DoSet, type Kind, type Mark, type Q } from './types';
import { build, candidates, swapOne } from './pick';
import { days, weekday } from './dates';

/** Every change to the teacher's data is one of these: it takes the data and gives back a changed copy. */
const copy = (d: Data): Data => structuredClone(d);

export function addClass(d: Data, name: string): { data: Data; id: string } {
  const n = copy(d), nm = name.trim().slice(0, 40), id = uid();
  if (nm && n.classes.length < 30) n.classes.push({ id, name: nm });
  return { data: n, id };
}
export function renameClass(d: Data, id: string, name: string): Data {
  const n = copy(d), c = n.classes.find((x) => x.id === id), nm = name.trim().slice(0, 40);
  if (c && nm) c.name = nm;
  return n;
}
export function removeClass(d: Data, id: string): Data {
  const n = copy(d);
  n.classes = n.classes.filter((c) => c.id !== id);
  n.tt = n.tt.map((row) => row.map((c) => (c === id ? '' : c)));
  delete n.taught[id]; delete n.sets[id];
  n.qs.forEach((q) => { q.cl = q.cl.filter((c) => c !== id); q.h = q.h.filter((e) => e.c !== id); });
  n.gone[id] = Date.now();
  return n;
}
export function addTopic(d: Data, name: string): { data: Data; id: string } {
  const nm = name.trim().slice(0, 60), have = d.topics.find((t) => t.name.toLowerCase() === nm.toLowerCase());
  if (have) return { data: d, id: have.id };
  const n = copy(d), id = uid();
  if (nm) n.topics.push({ id, name: nm });
  return { data: n, id };
}
export function removeTopic(d: Data, id: string): Data {
  const n = copy(d);
  n.topics = n.topics.filter((t) => t.id !== id);
  const dead = new Set(n.qs.filter((q) => q.t === id).map((q) => q.id));
  n.qs = n.qs.filter((q) => q.t !== id);
  Object.values(n.taught).forEach((tp) => { delete tp[id]; });
  Object.values(n.sets).forEach((l) => l.forEach((s) => { const keep = s.ids.map((x) => !dead.has(x)); s.w = s.w.filter((_, i) => keep[i]); if (s.marks) s.marks = s.marks.filter((_, i) => keep[i]); s.ids = s.ids.filter((_, i) => keep[i]); }));
  n.gone[id] = Date.now(); dead.forEach((x) => { n.gone[x] = Date.now(); });
  return n;
}
export function renameTopic(d: Data, id: string, name: string): Data {
  const n = copy(d), t = n.topics.find((x) => x.id === id), nm = name.trim().slice(0, 60);
  if (t && nm) t.name = nm;
  return n;
}

/** The question as it is saved: a multiple choice question keeps its four choices and the answer is the ticked one. */
export function makeQ(p: { id?: string; t: string; k: Kind; q: string; a: string; ch?: string[]; ri?: number; pic?: string; cl: string[]; h?: Q['h'] }): Q {
  const q: Q = { id: p.id || uid(), t: p.t, k: p.k, q: p.q.trim().slice(0, 400), a: p.a.trim().slice(0, 400), cl: p.cl, h: p.h ?? [], at: Date.now() };
  if (p.k === 'choice') { q.ch = (p.ch ?? []).map((c) => c.trim().slice(0, 160)); q.ri = Math.min(p.ri ?? 0, Math.max(q.ch.length - 1, 0)); q.a = answerOf(q); }
  if (p.k === 'pic' && p.pic) q.pic = p.pic;
  return q;
}
export function saveQ(d: Data, q: Q): Data {
  const n = copy(d), i = n.qs.findIndex((x) => x.id === q.id);
  if (i >= 0) n.qs[i] = { ...q, h: n.qs[i].h }; else if (n.qs.length < 5000) n.qs.push(q);
  return n;
}
export function saveMany(d: Data, qs: Q[]): Data {
  const n = copy(d);
  qs.forEach((q) => { if (n.qs.length < 5000) n.qs.push(q); });
  return n;
}
export function deleteQ(d: Data, id: string): Data {
  const n = copy(d);
  n.qs = n.qs.filter((q) => q.id !== id);
  Object.values(n.sets).forEach((l) => l.forEach((s) => { const k = s.ids.map((x) => x !== id); s.w = s.w.filter((_, i) => k[i]); if (s.marks) s.marks = s.marks.filter((_, i) => k[i]); s.ids = s.ids.filter((_, i) => k[i]); }));
  n.gone[id] = Date.now();
  return n;
}

export const taughtOn = (d: Data, c: string, t: string, date: string) => !!d.taught[c]?.[t]?.includes(date);
export function toggleTaught(d: Data, c: string, t: string, date: string): Data {
  const n = copy(d);
  n.taught[c] ??= {}; n.taught[c][t] ??= [];
  const l = n.taught[c][t], i = l.indexOf(date);
  if (i >= 0) l.splice(i, 1); else l.push(date);
  l.sort();
  return n;
}
export const lastTaught = (d: Data, c: string, t: string) => { const l = d.taught[c]?.[t]; return l && l.length ? l[l.length - 1] : ''; };

export function setLesson(d: Data, period: number, day: number, classId: string): Data {
  const n = copy(d); n.tt[period][day] = classId; return n;
}
export const setMins = (d: Data, mins: number): Data => ({ ...d, mins });

/* ---------- the Do Now for a class on a day ---------- */
export const getSet = (d: Data, c: string, date: string): DoSet | undefined => d.sets[c]?.find((s) => s.d === date);
const putSet = (n: Data, c: string, s: DoSet) => { const l = (n.sets[c] ??= []).filter((x) => x.d !== s.d); l.push(s); l.sort((a, b) => a.d.localeCompare(b.d)); n.sets[c] = l.slice(-14); };

/** Makes today's Do Now for the class if there is not one yet. Once it has been shown on the board it stays as it was. Before that, new questions fill any gaps and deleted ones are dropped. */
export function ensureSet(d: Data, c: string, date: string): Data {
  if (!d.classes.some((x) => x.id === c)) return d;
  const have = getSet(d, c, date);
  if (have?.shown && have.ids.length) return d;
  const ok = new Set(d.qs.map((q) => q.id)), cands = candidates(d, c, date);
  const keep = have ? have.ids.map((id, i) => ({ id, why: have.w[i] })).filter((x) => ok.has(x.id)) : [];
  const want = Math.min(5, cands.length);
  if (keep.length >= want && (!have || keep.length === have.ids.length)) return d;
  const prev = [...(d.sets[c] ?? [])].filter((s) => s.d < date).pop(), used = new Set(keep.map((x) => x.id));
  const more = build(cands.filter((x) => !used.has(x.q.id)), want - keep.length, new Set(prev?.ids ?? []));
  const all = [...keep, ...more];
  if (!all.length) return d;
  const n = copy(d);
  putSet(n, c, { d: date, ids: all.map((x) => x.id), w: all.map((x) => x.why) });
  return n;
}
export function reshuffle(d: Data, c: string, date: string): Data {
  const cur = getSet(d, c, date); if (!cur) return ensureSet(d, c, date);
  const picked = build(candidates(d, c, date), cur.ids.length || 5, new Set(cur.ids));
  if (!picked.length) return d;
  const n = copy(d);
  putSet(n, c, { d: date, ids: picked.map((p) => p.id), w: picked.map((p) => p.why), ...(cur.shown ? { shown: true } : {}) });
  return n;
}
export function swapInSet(d: Data, c: string, date: string, index: number): Data {
  const cur = getSet(d, c, date); if (!cur) return d;
  const x = swapOne(candidates(d, c, date), cur.ids, index);
  if (!x) return d;
  const n = copy(d), s = getSet(n, c, date)!;
  s.ids[index] = x.id; s.w[index] = x.why;
  if (s.marks) s.marks[index] = 0;
  return n;
}
export function markShown(d: Data, c: string, date: string): Data {
  const s = getSet(d, c, date); if (!s || s.shown) return d;
  const n = copy(d); getSet(n, c, date)!.shown = true; return n;
}
export function setMarks(d: Data, c: string, date: string, marks: Mark[]): Data {
  const s = getSet(d, c, date); if (!s) return d;
  const n = copy(d); getSet(n, c, date)!.marks = marks; return n;
}
/** The class's results go onto each question, so it comes back when it should. Marking the same Do Now again replaces its results, never doubles them. */
export function finishSet(d: Data, c: string, date: string, marks: Mark[]): Data {
  const s = getSet(d, c, date); if (!s) return d;
  const n = copy(d), ns = getSet(n, c, date)!;
  ns.marks = marks; ns.done = true; ns.shown = true;
  ns.ids.forEach((id, i) => {
    const q = n.qs.find((x) => x.id === id); if (!q) return;
    q.h = q.h.filter((e) => !(e.c === c && e.d === date));
    q.h.push({ c, d: date, m: marks[i] ?? 0 });
    q.h.sort((a, b) => a.d.localeCompare(b.d)); q.h = q.h.slice(-12);
    q.at = Date.now();
  });
  return n;
}
/** The most recent earlier Do Now that was shown on the board and never marked. */
export function pendingSet(d: Data, c: string, today: string): DoSet | undefined {
  return [...(d.sets[c] ?? [])].filter((s) => s.d < today && s.shown && !s.done && days(s.d, today) <= 14).pop();
}

/** Which class to open on: the next lesson today that has not had its Do Now shown yet, else the one used last. */
export function autoClass(d: Data, today: string, now: Date, last?: string): string {
  const day = weekday(now);
  if (day < 5) for (let p = 0; p < 5; p++) { const c = d.tt[p][day]; if (c && d.classes.some((x) => x.id === c) && !getSet(d, c, today)?.shown) return c; }
  if (last && d.classes.some((x) => x.id === last)) return last;
  return d.classes[0]?.id ?? '';
}
/** The next few lessons on the timetable after this one. */
export function comingUp(d: Data, c: string, now: Date, n = 3): { c: string; day: number; period: number }[] {
  const out: { c: string; day: number; period: number }[] = [], today = weekday(now);
  let from = 0;
  if (today < 5) { const mine = d.tt.findIndex((row) => row[today] === c); from = mine >= 0 ? mine + 1 : 0; }
  for (let step = 0; step < 7 && out.length < n; step++) {
    const day = (today + step) % 7; if (day > 4) continue;
    for (let p = step === 0 ? from : 0; p < 5 && out.length < n; p++) { const id = d.tt[p][day]; if (id && d.classes.some((x) => x.id === id)) out.push({ c: id, day, period: p + 1 }); }
  }
  return out;
}
export const periodOf = (d: Data, c: string, now: Date): number => { const day = weekday(now); return day < 5 ? d.tt.findIndex((row) => row[day] === c) + 1 : 0; };

/** A pasted list: one question per line, then a | or a tab, then the answer. A line that starts "True or false" and ends in True or False becomes a true or false question. */
export function parseList(text: string): { q: string; a: string; k: Kind }[] {
  const out: { q: string; a: string; k: Kind }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const cut = line.includes('\t') ? line.indexOf('\t') : line.indexOf('|');
    if (cut < 1) continue;
    const q = line.slice(0, cut).trim().slice(0, 400), a = line.slice(cut + 1).replace(/^[\t|\s]+/, '').trim().slice(0, 400);
    if (!q || !a) continue;
    const tf = /^true or false/i.test(q) && /^(true|false)\.?$/i.test(a);
    out.push({ q, a: tf ? (/^t/i.test(a) ? 'True' : 'False') : a, k: tf ? 'tf' : 'short' });
  }
  return out.slice(0, 200);
}
