'use client';
import { useEffect, useRef, useState } from 'react';
import { niceDate } from '@/lib/dates';
import type { Bar } from '@/lib/stats';

const H = 300;
const pc = (v: number, n: number) => (n ? Math.round((100 * v) / n) : 0);

/** A line graph of the last Do Nows. Each point is one Do Now: the share of its questions that most of the class got (green) and that few got (red). The size follows the box it sits in, so the writing is never squashed. */
export function Graph({ bars, name }: { bars: Bar[]; name: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const set = () => setW(Math.floor(el.clientWidth));
    set();
    const ro = new ResizeObserver(set); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = bars.length, wide = w >= 640;
  const L = wide ? 64 : 54, R = wide ? 150 : 14, T = 18, B = 50, pad = 22;
  const pw = Math.max(0, w - L - R - 2 * pad), ph = H - T - B;
  const x = (i: number) => L + pad + (n === 1 ? pw / 2 : (pw * i) / (n - 1));
  const y = (p: number) => T + ph * (1 - p / 100);
  const gap = n > 1 ? pw / (n - 1) : pw;
  const step = Math.max(1, Math.ceil(66 / Math.max(gap, 1)));
  const most = bars.map((b) => pc(b.most, b.n)), few = bars.map((b) => pc(b.few, b.n));
  const line = (v: number[]) => v.map((p, i) => `${x(i)},${y(p)}`).join(' ');

  /* The two end labels never sit on top of each other. */
  const ly = (a: number, b: number): [number, number] => { const m = y(a), f = y(b); return Math.abs(m - f) >= 22 ? [m, f] : m <= f ? [m - (22 - (f - m)) / 2, f + (22 - (f - m)) / 2] : [m + (22 - (m - f)) / 2, f - (22 - (m - f)) / 2]; };
  const [my, fy] = n ? ly(most[n - 1], few[n - 1]) : [0, 0];

  return (
    <div ref={box} className="gr" style={{ height: H }}>
      {w > 0 && n > 0 && (
        <svg width={w} height={H} role="img" aria-label={`Line graph for ${name}. Each point is one Do Now. The green line is the share of questions most of the class got, the red line is the share few got. Latest: most ${most[n - 1]}%, few ${few[n - 1]}%.`}>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} className={v === 0 ? 'ax' : 'gl'} />
              <text x={L - 12} y={y(v) + 6} textAnchor="end">{v}%</text>
            </g>
          ))}
          <line x1={L} x2={L} y1={T} y2={y(0)} className="ax" />
          {n > 1 && <polyline points={line(few)} className="lf" fill="none" />}
          {n > 1 && <polyline points={line(most)} className="lm" fill="none" />}
          {bars.map((b, i) => (
            <g key={b.d}>
              <rect x={x(i) - 6} y={y(few[i]) - 6} width={12} height={12} className="pf2"><title>{`${niceDate(b.d)}: few got ${b.few} of ${b.n} questions (${few[i]}%)`}</title></rect>
              <rect x={x(i) - 7} y={y(most[i]) - 7} width={14} height={14} className="pm"><title>{`${niceDate(b.d)}: most got ${b.most} of ${b.n} questions (${most[i]}%)`}</title></rect>
              {(n - 1 - i) % step === 0 && <text x={x(i)} y={H - 18} textAnchor="middle" className="xl">{niceDate(b.d)}</text>}
            </g>
          ))}
          {wide && (
            <>
              <text x={x(n - 1) + 22} y={my + 6} className="em">Most {most[n - 1]}%</text>
              <text x={x(n - 1) + 22} y={fy + 6} className="ef">Few {few[n - 1]}%</text>
            </>
          )}
        </svg>
      )}
      <table className="sr">
        <caption>{name}: share of questions most and few of the class got, for each recent Do Now</caption>
        <thead><tr><th>Date</th><th>Most</th><th>Few</th></tr></thead>
        <tbody>{bars.map((b, i) => <tr key={b.d}><td>{niceDate(b.d)}</td><td>{most[i]}%</td><td>{few[i]}%</td></tr>)}</tbody>
      </table>
    </div>
  );
}
