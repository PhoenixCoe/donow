import { lastHist } from './pick';
import { answerOf, KINDS, LETTERS, MARKS, type Data } from './types';

const KIND = Object.fromEntries(KINDS) as Record<string, string>;
/** One cell. A value that starts with = + - or @ gets a quote in front so a spreadsheet shows it as text, not as a formula. */
const cell = (v: string) => { let s = v.replace(/\r?\n/g, ' '); if (/^[=+\-@]/.test(s)) s = `'${s}`; return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Every question as a spreadsheet: its topic, type, answer, the classes it is for, and how each class did last time. */
export function questionsCsv(d: Data): string {
  const head = ['Topic', 'Type', 'Question', 'Answer', 'Choices', 'Classes', ...d.classes.flatMap((c) => [`${c.name} last result`, `${c.name} last asked`])];
  const topic = (id: string) => d.topics.find((t) => t.id === id)?.name ?? '';
  const rows = d.qs.slice().sort((a, b) => topic(a.t).localeCompare(topic(b.t)) || a.at - b.at).map((q) => [
    topic(q.t), KIND[q.k] ?? '', q.q, answerOf(q),
    q.k === 'choice' && q.ch ? q.ch.map((c, i) => `${LETTERS[i]} ${c}`).join(' / ') : '',
    q.cl.length ? q.cl.map((id) => d.classes.find((c) => c.id === id)?.name ?? '').filter(Boolean).join('; ') : 'All classes',
    ...d.classes.flatMap((c) => {
      if (q.cl.length && !q.cl.includes(c.id)) return ['', ''];
      const h = lastHist(q, c.id);
      return h ? [MARKS[h.m], h.d] : ['Not asked yet', ''];
    }),
  ]);
  return '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

/** Saves text as a file on this computer. */
export function saveFile(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
