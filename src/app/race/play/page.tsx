'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Switch } from '@/components/ui';
import { fresh, pickBox, play, RACE_KEY, RACE_STATE, result, TEAMS, WIN, type Setup, type Snap, type Tap } from '@/lib/race';
import { useStore } from '@/lib/store';
import { answerOf, LETTERS, type Q } from '@/lib/types';

interface Saved { round: number; shown: boolean; snap: Snap; taps: Tap[]; box: boolean; over: boolean }
const read = <T,>(k: string): T | null => { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch { return null; } };

/** The race on the class screen: one question a round, a tower for each team. */
export default function RacePlay() {
  const { data, ready } = useStore();
  const [setup, setSetup] = useState<Setup | null | undefined>(undefined);
  const [round, setRound] = useState(1);
  const [shown, setShown] = useState(false);
  const [snap, setSnap] = useState<Snap>(fresh(2));
  const [taps, setTaps] = useState<Tap[]>([]);
  const [box, setBox] = useState(true);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const s = read<Setup>(RACE_KEY);
    if (!s || !Array.isArray(s.ids) || !s.ids.length) { setSetup(null); return; }
    setSetup(s); setSnap(fresh(s.teams)); setBox(s.box);
    const v = read<Saved>(RACE_STATE);
    if (v && Array.isArray(v.snap?.s) && v.snap.s.length === s.teams) { setRound(v.round); setShown(v.shown); setSnap(v.snap); setTaps(v.taps); setBox(v.box); setOver(v.over); }
  }, []);
  useEffect(() => { if (setup) { try { sessionStorage.setItem(RACE_STATE, JSON.stringify({ round, shown, snap, taps, box, over } satisfies Saved)); } catch { /* storage blocked */ } } }, [setup, round, shown, snap, taps, box, over]);

  const qs = useMemo(() => (setup ? setup.ids.map((id) => data.qs.find((q) => q.id === id)).filter((q): q is Q => !!q) : []), [setup, data.qs]);
  const rounds = Math.min(setup?.rounds ?? 0, qs.length), n = setup?.teams ?? 2;
  const now = useMemo(() => play(snap, taps), [snap, taps]);
  const end = result(now.snap.s, round, rounds);
  const q = qs[round - 1];

  const next = () => {
    if (over) return;
    if (!shown) { setShown(true); return; }
    if (end.over) { setOver(true); return; }
    setSnap(now.snap); setTaps([]); setShown(false); setRound((r) => r + 1);
  };
  const tap = (t: number) => {
    if (!shown || over) return;
    setTaps(taps.some((x) => x.t === t) ? taps.filter((x) => x.t !== t) : [...taps, { t, box: box ? pickBox() : -1 }]);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { const tag = (e.target as HTMLElement | null)?.tagName; if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT') return; if (e.key === ' ') { e.preventDefault(); next(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  if (!ready || setup === undefined) return <div className="pg"><main className="bm"><p className="hint">Loading</p></main></div>;
  if (!setup || !q) {
    return (
      <div className="pg">
        <header className="bh"><div className="bt">Tower race</div></header>
        <main className="bm"><div className="plate big"><div className="empty" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><p>There is no race set up yet.</p><div className="row"><Link href="/race/" className="btn p big">Set up a race</Link></div></div></div></main>
      </div>
    );
  }

  const say = over ? end.line : taps.length ? now.say : shown ? 'Tap every team that got it right. Tap a team again to undo.' : 'Teams write their answer in their books. Then press Show answer.';
  const label = !shown ? 'Show answer' : end.over ? 'See the winner' : 'Next question';

  return (
    <div className="pg race">
      <header className="bh">
        <div className="bt">Tower race <span>· Round {round} of {rounds}</span></div>
        <div className="d" style={{ fontSize: 22 }}>First to {WIN} blocks, or tallest after round {rounds}</div>
      </header>

      <section style={{ background: '#fff', borderBottom: '3px solid #171717', padding: '18px 32px', display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <div className="d" style={{ fontSize: 30, background: '#171717', color: 'var(--paper)', padding: '8px 14px', lineHeight: 1 }}>{over ? 'Done' : `Q${round}`}</div>
        {over ? (
          <div className="winner stamp" style={{ flex: '1 1 420px' }}>{end.line}</div>
        ) : (
          <>
            <div style={{ fontSize: 34, lineHeight: 1.25, flex: '1 1 420px', minWidth: 0 }}>
              {q.q}
              {q.k === 'choice' && q.ch && <div style={{ fontSize: 26, marginTop: 6 }}>{q.ch.map((c, j) => `${LETTERS[j]} ${c}`).join('   ·   ')}</div>}
              {q.k === 'pic' && q.pic && /* eslint-disable-next-line @next/next/no-img-element */ <img src={q.pic} alt="Picture for the question" style={{ display: 'block', maxHeight: 200, maxWidth: '100%', border: '3px solid #171717', marginTop: 8 }} />}
            </div>
            <div className="d" style={{ fontSize: 36, color: 'var(--g2)', minWidth: 200, textAlign: 'right' }}>{shown ? (q.k === 'choice' ? `${LETTERS[q.ri ?? 0]}. ${answerOf(q)}` : answerOf(q)) : ''}</div>
          </>
        )}
      </section>

      <main style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: `repeat(${n},minmax(0,1fr))`, gap: 26, padding: '26px 32px 22px', alignItems: 'end' }}>
        {TEAMS.slice(0, n).map((t, i) => {
          const score = now.snap.s[i], got = taps.some((x) => x.t === i);
          return (
            <div key={t.l} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="tw" aria-label={`Team ${t.l} tower, ${score} blocks`}>
                {Array.from({ length: Math.min(score, WIN) }, (_, k) => <div className="bk" key={k} style={{ background: t.bg, color: t.fg }}>{t.l}</div>)}
              </div>
              <button type="button" className="tm" disabled={!shown || over} aria-pressed={got} onClick={() => tap(i)} style={{ background: t.bg, color: t.fg }}>
                Team {t.l} · {score}{got ? ' · Got it' : ''}
              </button>
            </div>
          );
        })}
      </main>

      <footer className="bf" style={{ background: '#171717', color: 'var(--paper)', borderTop: 0 }}>
        <div className="row" style={{ gap: 16, flex: '1 1 400px', minWidth: 0 }}>
          <Switch on={box} onChange={setBox} color="var(--paper)">Mystery boxes</Switch>
          <span style={{ fontSize: 26, lineHeight: 1.3, borderLeft: '3px solid #6FB894', paddingLeft: 16 }} role="status" aria-live="polite">{say}</span>
        </div>
        <div className="row" style={{ gap: 14 }}>
          {!over && <button type="button" className="btn on-ink" onClick={next} style={{ background: '#337957', color: 'var(--paper)', fontSize: 26, minHeight: 60 }}>{label}</button>}
          {over && <Link href="/race/" className="btn on-ink" style={{ background: '#337957', color: 'var(--paper)', fontSize: 26, minHeight: 60 }}>New race</Link>}
          {!over && <Link href="/race/" className="btn q" style={{ color: 'var(--paper)' }}>Stop</Link>}
        </div>
      </footer>
    </div>
  );
}
