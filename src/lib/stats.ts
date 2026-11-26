import { addDays, weekday } from './dates';
import { getSet } from './ops';
import { eligible, lastMark, topicStatus, type Status } from './pick';
import type { Data } from './types';

/** Everything the dashboard shows is worked out here, from the teacher's own data. Nothing is kept twice. */

/** One lesson in this week's timetable, and where its Do Now has got to. */
export type LessonState = 'done' | 'mark' | 'next' | '';
export interface Lesson { c: string; day: number; period: number; date: string; state: LessonState }

/** The Monday to Friday timetable for the week that today is in. A lesson is Done once marked, Mark once shown but not marked, and Next for the first lesson today that has not been shown. */
export function weekLessons(d: Data, today: string, now: Date): Lesson[] {
  const monday = addDays(today, -weekday(now)), out: Lesson[] = [];
  let nextDone = false;
  const todayIdx = weekday(now);
  for (let day = 0; day < 5; day++) {
    const date = addDays(monday, day);
    for (let p = 0; p < 5; p++) {
      const c = d.tt[p][day];
      if (!c || !d.classes.some((x) => x.id === c)) continue;
      const set = getSet(d, c, date);
      let state: LessonState = '';
      if (set?.done) state = 'done';
      else if (set?.shown) state = 'mark';
      else if (day === todayIdx && !nextDone) { state = 'next'; nextDone = true; }
      out.push({ c, day, period: p + 1, date, state });
    }
  }
  return out;
}

export interface Bar { d: string; most: number; some: number; few: number; n: number }
/** The last Do Nows that were marked, oldest first: how many questions most, some or few of the class got. */
export function recentResults(d: Data, c: string, max = 10): Bar[] {
  return (d.sets[c] ?? []).filter((s) => s.done && s.marks && s.ids.length).slice(-max).map((s) => {
    const m = s.marks ?? [];
    const most = m.filter((x) => x === 0).length, some = m.filter((x) => x === 1).length, few = m.filter((x) => x === 2).length;
    return { d: s.d, most, some, few, n: most + some + few };
  });
}

/** The share of answers where most of the class got it, over the last five Do Nows, and how that compares with the five before. */
export function average(d: Data, c: string): { pct: number | null; used: number; change: number | null } {
  const sets = (d.sets[c] ?? []).filter((s) => s.done && s.marks && s.marks.length);
  const share = (l: typeof sets) => { const all = l.flatMap((s) => s.marks ?? []); return all.length ? Math.round((100 * all.filter((x) => x === 0).length) / all.length) : null; };
  const now = sets.slice(-5), before = sets.slice(-10, -5);
  const pct = share(now), prev = before.length ? share(before) : null;
  return { pct, used: now.length, change: pct !== null && prev !== null ? pct - prev : null };
}

export interface TopicRow { id: string; name: string; status: Status; most: number; some: number; few: number; fresh: number; total: number }
/** A line for each topic the class has results on, the ones to go over again first. */
export function topicRows(d: Data, c: string): TopicRow[] {
  const rank = { Recap: 0, Mixed: 1, Strong: 2, '': 3 } as const;
  return d.topics.map((t) => {
    const row: TopicRow = { id: t.id, name: t.name, status: topicStatus(d, t.id, c), most: 0, some: 0, few: 0, fresh: 0, total: 0 };
    for (const q of d.qs) {
      if (q.t !== t.id || !eligible(q, c)) continue;
      row.total++;
      const m = lastMark(q, c);
      if (m === 0) row.most++; else if (m === 1) row.some++; else if (m === 2) row.few++; else row.fresh++;
    }
    return row;
  }).filter((r) => r.status).sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name));
}
