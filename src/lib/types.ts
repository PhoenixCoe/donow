/** Everything Do Now keeps for one teacher. One small object: saved on this device, and in the teacher's PMC ID account when signed in. Nothing about students. */
export type Kind = 'short' | 'choice' | 'tf' | 'pic';
export type Mark = 0 | 1 | 2; // 0 Most of the class got it, 1 Some, 2 Few
export const MARKS = ['Most', 'Some', 'Few'] as const;
export const KINDS: [Kind, string][] = [['short', 'Short answer'], ['choice', 'Multiple choice'], ['tf', 'True or false'], ['pic', 'Picture']];

export interface Cls { id: string; name: string }
export interface Topic { id: string; name: string }
export interface Hist { c: string; d: string; m: Mark }
export interface Q {
  id: string; t: string; k: Kind; q: string; a: string;
  ch?: string[]; ri?: number; pic?: string;
  cl: string[];            // classes it is for; empty means all of the teacher's classes
  h: Hist[];               // how each class did, newest last
  at: number;
}
export interface DoSet { d: string; ids: string[]; w: string[]; shown?: boolean; marks?: Mark[]; done?: boolean }
export interface Data {
  v: 1; at: number;
  classes: Cls[]; topics: Topic[]; qs: Q[];
  taught: Record<string, Record<string, string[]>>;   // class > topic > dates it was taught
  tt: string[][];                                     // timetable: 5 periods x 5 days, a class id or ''
  sets: Record<string, DoSet[]>;                      // class > the Do Now sets made so far
  mins: number;
  gone: Record<string, number>;                       // ids that were deleted, so another device does not bring them back
}

export const emptyData = (): Data => ({ v: 1, at: 0, classes: [], topics: [], qs: [], taught: {}, tt: Array.from({ length: 5 }, () => Array(5).fill('')), sets: {}, mins: 5, gone: {} });

export const short = (c?: Cls) => (c ? c.name.trim().split(/\s+/)[0] : '');
export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const mark = (v: unknown): Mark => (v === 1 ? 1 : v === 2 ? 2 : 0);
const PIC = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;

/** Takes anything that was saved (this device, or the account) and makes sure it has the right shape. */
export function clean(raw: unknown): Data {
  const r = obj(raw), d = emptyData();
  d.at = Number(r.at) > 0 ? Number(r.at) : 0;
  d.mins = [3, 5, 8, 10].includes(Number(r.mins)) ? Number(r.mins) : 5;
  d.classes = arr(r.classes).map((c) => { const o = obj(c); return { id: str(o.id, 24), name: str(o.name, 40).trim() }; }).filter((c) => c.id && c.name).slice(0, 30);
  d.topics = arr(r.topics).map((c) => { const o = obj(c); return { id: str(o.id, 24), name: str(o.name, 60).trim() }; }).filter((c) => c.id && c.name).slice(0, 200);
  d.qs = arr(r.qs).map((x) => {
    const o = obj(x), k = (['short', 'choice', 'tf', 'pic'] as string[]).includes(String(o.k)) ? (o.k as Kind) : 'short';
    const ch = arr(o.ch).map((c) => str(c, 160)).slice(0, 4);
    return {
      id: str(o.id, 24), t: str(o.t, 24), k, q: str(o.q, 400).trim(), a: str(o.a, 400).trim(),
      ...(k === 'choice' ? { ch, ri: Math.min(Math.max(Number(o.ri) | 0, 0), Math.max(ch.length - 1, 0)) } : {}),
      ...(typeof o.pic === 'string' && PIC.test(o.pic) && o.pic.length < 240000 ? { pic: o.pic } : {}),
      cl: arr(o.cl).map((c) => str(c, 24)).filter(Boolean).slice(0, 30),
      h: arr(o.h).map((e) => { const p = obj(e); return { c: str(p.c, 24), d: str(p.d, 10), m: mark(p.m) }; }).filter((e) => e.c && DATE.test(e.d)).slice(-12),
      at: Number(o.at) > 0 ? Number(o.at) : 0,
    } as Q;
  }).filter((q) => q.id && q.q).slice(0, 5000);
  Object.entries(obj(r.taught)).slice(0, 30).forEach(([c, tp]) => {
    d.taught[c] = {};
    Object.entries(obj(tp)).slice(0, 200).forEach(([t, ds]) => { d.taught[c][t] = arr(ds).map((x) => str(x, 10)).filter((x) => DATE.test(x)).slice(-60); });
  });
  const tt = arr(r.tt);
  d.tt = Array.from({ length: 5 }, (_, p) => Array.from({ length: 5 }, (_, day) => str(arr(tt[p])[day], 24)));
  Object.entries(obj(r.sets)).slice(0, 30).forEach(([c, list]) => {
    d.sets[c] = arr(list).map((s) => {
      const o = obj(s), ids = arr(o.ids).map((i) => str(i, 24)).filter(Boolean).slice(0, 12);
      return { d: str(o.d, 10), ids, w: ids.map((_, i) => str(arr(o.w)[i], 16)), ...(o.shown ? { shown: true } : {}), ...(Array.isArray(o.marks) ? { marks: ids.map((_, i) => mark(arr(o.marks)[i])) } : {}), ...(o.done ? { done: true } : {}) } as DoSet;
    }).filter((s) => DATE.test(s.d) && s.ids.length).slice(-14);
  });
  Object.entries(obj(r.gone)).slice(0, 600).forEach(([k, v]) => { if (Number(v) > 0) d.gone[str(k, 24)] = Number(v); });
  return d;
}

/** Two copies of one teacher's data (this device and the account) become one. The newer copy wins where they differ; nothing is lost where they only added things. */
export function merge(a: Data, b: Data): Data {
  const [x, y] = a.at >= b.at ? [a, b] : [b, a];
  const out = emptyData();
  out.at = x.at; out.mins = x.mins; out.tt = x.tt;
  out.gone = { ...y.gone };
  Object.entries(x.gone).forEach(([k, v]) => { out.gone[k] = Math.max(v, out.gone[k] ?? 0); });
  const alive = <T extends { id: string }>(l: T[]) => l.filter((i) => !out.gone[i.id]);
  const byId = <T extends { id: string }>(xs: T[], ys: T[]) => { const m = new Map<string, T>(); ys.forEach((i) => m.set(i.id, i)); xs.forEach((i) => m.set(i.id, i)); return alive([...m.values()]); };
  out.classes = byId(x.classes, y.classes);
  out.topics = byId(x.topics, y.topics);
  const qm = new Map<string, Q>();
  [...y.qs, ...x.qs].forEach((q) => {
    const o = qm.get(q.id);
    if (!o) { qm.set(q.id, q); return; }
    const win = q.at >= o.at ? q : o, lose = win === q ? o : q;
    const seen = new Set(win.h.map((e) => e.c + e.d));
    qm.set(q.id, { ...win, h: [...win.h, ...lose.h.filter((e) => !seen.has(e.c + e.d))].sort((p, r) => p.d.localeCompare(r.d)).slice(-12) });
  });
  out.qs = alive([...qm.values()]);
  [y, x].forEach((s) => Object.entries(s.taught).forEach(([c, tp]) => {
    out.taught[c] ??= {};
    Object.entries(tp).forEach(([t, ds]) => { out.taught[c][t] = [...new Set([...(out.taught[c][t] ?? []), ...ds])].sort(); });
  }));
  [y, x].forEach((s) => Object.entries(s.sets).forEach(([c, list]) => {
    const m = new Map((out.sets[c] ?? []).map((i) => [i.d, i] as const));
    list.forEach((i) => m.set(i.d, i));
    out.sets[c] = [...m.values()].sort((p, r) => p.d.localeCompare(r.d)).slice(-14);
  }));
  return out;
}

/** What the answer says, whatever kind of question it is. */
export function answerOf(q: Q): string {
  if (q.k === 'choice') { const i = q.ri ?? 0; return (q.ch?.[i] ?? q.a) || ''; }
  return q.a;
}
export const LETTERS = ['A', 'B', 'C', 'D'];
