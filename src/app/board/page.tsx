'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSet, markShown } from '@/lib/ops';
import { useClass, useStore } from '@/lib/store';
import { answerOf, LETTERS, short, type Q } from '@/lib/types';

/* Full screen: the browser's own full screen where it has one, and the same big layout without it where it does not (an iPhone, say). */
type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenEnabled?: boolean };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
const fsNow = () => { const d = document as FsDoc; return !!(d.fullscreenElement || d.webkitFullscreenElement); };
const fsCan = () => { const d = document as FsDoc; return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled); };

const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** The class screen. Big type for the back row, a timer, and the answers shown one at a time. */
export default function Board() {
  const { data, ready, update } = useStore();
  const { cid, today } = useClass();
  const cls = data.classes.find((c) => c.id === cid);
  const set = cls ? getSet(data, cid, today) : undefined;
  const qs = (set ? set.ids.map((id) => data.qs.find((q) => q.id === id)) : []).filter((q): q is Q => !!q);
  const [n, setN] = useState(0);
  const total = data.mins * 60_000;
  const [left, setLeft] = useState(total);
  const [run, setRun] = useState(true);
  const end = useRef(0), extra = useRef(0);
  const [hard, setHard] = useState(false), [soft, setSoft] = useState(false);
  const fs = hard || soft;

  const toggleFs = useCallback(async () => {
    try {
      const d = document as FsDoc;
      if (fsNow()) { await (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.()); return; }
      if (soft) { setSoft(false); return; }
      if (fsCan()) { const el = document.documentElement as FsEl; await (el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.()); return; }
      setSoft(true);
    } catch { setSoft((s) => !s); }
  }, [soft]);
  useEffect(() => {
    const f = () => setHard(fsNow());
    document.addEventListener('fullscreenchange', f); document.addEventListener('webkitfullscreenchange', f);
    return () => {
      document.removeEventListener('fullscreenchange', f); document.removeEventListener('webkitfullscreenchange', f);
      /* Leaving the board (Back, Finish) leaves full screen too. */
      if (fsNow()) { const d = document as FsDoc; void Promise.resolve(d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.()).catch(() => { /* already out */ }); }
    };
  }, []);

  /* Being on the board counts as shown, so Today can ask for the marks later if it is skipped. */
  useEffect(() => { if (ready && cid && set) update((d) => markShown(d, cid, today)); }, [ready, cid, today, !!set]); // eslint-disable-line react-hooks/exhaustive-deps

  /* The timer counts to a time on the clock, so it stays right if the tab sleeps. */
  useEffect(() => { if (ready) { setLeft(total); end.current = Date.now() + total; } }, [ready, total]);
  useEffect(() => {
    if (!run) return;
    end.current = Date.now() + left;
    const t = setInterval(() => { const l = end.current - Date.now(); setLeft(l); if (l <= 0) { clearInterval(t); setRun(false); } }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  const more = () => { extra.current += 60_000; end.current += 60_000; setLeft((l) => Math.max(l, 0) + 60_000); if (!run && left <= 0) setRun(true); };

  /* The screen stays awake while it is up. */
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const get = async () => { try { const w = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock; if (w && document.visibilityState === 'visible') lock = await w.request('screen'); } catch { /* not allowed: the screen may dim */ } };
    void get();
    const vis = () => { if (document.visibilityState === 'visible') void get(); };
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); void lock?.release().catch(() => { /* already released */ }); };
  }, []);

  const count = qs.length, done = count > 0 && n >= count;
  const next = useCallback(() => setN((v) => Math.min(count, v + 1)), [count]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null, tag = el?.tagName;
      if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); setN((v) => Math.max(0, v - 1)); }
      else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); void toggleFs(); }
      else if (e.key === 'Escape' && soft) setSoft(false);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [next, toggleFs, soft]);

  if (!ready) return <div className="pg"><main className="bm"><p className="hint">Loading</p></main></div>;
  if (!cls || !qs.length) {
    return (
      <div className="pg">
        <header className="bh"><div className="bt">Do Now</div></header>
        <main className="bm"><div className="plate big"><div className="empty" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><p>There is no Do Now to show yet.</p><div className="row"><Link href="/" className="btn p big">Back to Today</Link></div></div></div></main>
      </div>
    );
  }

  return (
    <div className={fs ? 'pg fs' : 'pg'}>
      <header className="bh">
        <div className="bt">Do Now <span>· {short(cls)}</span></div>
        <div className="row" style={{ gap: 14 }}>
          <div className={left <= 0 ? 'timer out' : 'timer'} role="timer" aria-label="Time left">{mmss(left)}</div>
          <button type="button" className="btn big on-ink" onClick={() => (left <= 0 ? more() : setRun((r) => !r))}>{left <= 0 ? '+1 min' : run ? 'Pause' : 'Go'}</button>
          {left > 0 && <button type="button" className="btn on-ink" onClick={more} aria-label="Add one minute">+1 min</button>}
          <button type="button" className="btn on-ink" onClick={() => { void toggleFs(); }} aria-pressed={fs} title="Press F to switch">{fs ? 'Exit full screen' : 'Full screen'}</button>
        </div>
      </header>
      <div className="bar" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, (1 - left / (total + extra.current)) * 100))}%` }} /></div>

      <main className="bm" onClick={(e) => { if ((e.target as HTMLElement).closest('a,button')) return; next(); }} aria-live="polite">
        {qs.map((q, i) => (
          <div className="br" key={q.id}>
            <div className="bn d">{i + 1}</div>
            <div className="bq">
              <div>{q.q}</div>
              {q.k === 'pic' && q.pic && /* eslint-disable-next-line @next/next/no-img-element */ <img src={q.pic} alt="Picture for the question" />}
              {q.k === 'choice' && q.ch && (
                <div className="bch">{q.ch.map((c, j) => <div key={j}><b>{LETTERS[j]}</b>{c}</div>)}</div>
              )}
              {i < n && <div className="ba stamp">{q.k === 'choice' ? `${LETTERS[q.ri ?? 0]}. ${answerOf(q)}` : answerOf(q)}</div>}
            </div>
          </div>
        ))}
      </main>

      <footer className="bf">
        <Link href="/" className="btn">Back</Link>
        <span className="hint" style={{ fontSize: 22 }}>Space or a click shows the next answer</span>
        <div className="row" style={{ gap: 14 }}>
          {!done && <>
            <button type="button" className="btn" onClick={() => setN(count)}>Show all</button>
            <button type="button" className="btn p big" onClick={next}>Show next answer</button>
          </>}
          {done && <Link href={`/result/?d=${today}&c=${cid}`} className="btn p big">Finish</Link>}
        </div>
      </footer>
    </div>
  );
}
