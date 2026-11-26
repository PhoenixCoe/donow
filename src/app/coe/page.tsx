'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Page } from '@/components/Page';
import { CoeMark, Seg, Sel, Switch } from '@/components/ui';
import { getIdeas, coeOn, COE_ENABLED, type Idea } from '@/lib/coe';
import { addTopic, makeQ, saveMany } from '@/lib/ops';
import { useClass, useStore } from '@/lib/store';
import { useParams } from '@/lib/useParams';

const YEARS = ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13'];
interface Row extends Idea { on: boolean; edit: boolean }

/** Ideas from Coe: the teacher asks, checks every idea, and only the ones they press Add on are kept. */
export default function CoeIdeas() {
  const { data, ready, who, update } = useStore();
  const { cid } = useClass();
  const router = useRouter();
  const p = useParams();
  const [topic, setTopic] = useState('');
  const [year, setYear] = useState('Year 9');
  const [n, setN] = useState(5);
  const [missed, setMissed] = useState(true);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const started = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const miss = p?.get('m') ? data.qs.find((q) => q.id === p.get('m')) : undefined;
  const from = p?.get('t') ? data.topics.find((t) => t.id === p.get('t')) : undefined;

  /* Start from the topic it was opened from, and the year in the class name (9X3 is Year 9). */
  useEffect(() => {
    if (!p || !ready || started.current) return;
    started.current = true;
    if (from) setTopic(from.name);
    const cls = data.classes.find((c) => c.id === cid), y = cls && /^\s*(\d{1,2})/.exec(cls.name)?.[1];
    if (y && +y >= 7 && +y <= 13) setYear(`Year ${+y}`);
  }, [p, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const ask = async () => {
    const t = topic.trim(); if (!t) return setErr('Write the topic first.');
    setErr(''); setBusy(true);
    try {
      const have = data.qs.filter((q) => (from ? q.t === from.id : true)).map((q) => q.q);
      const r = await getIdeas({ topic: t, year, n, missed: missed && miss ? miss.q : undefined, have });
      if (alive.current) setRows(r.map((x) => ({ ...x, on: false, edit: false })));
    } catch (e) { if (alive.current) setErr((e as Error).message); }
    finally { if (alive.current) setBusy(false); }
  };
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r && r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const chosen = rows?.filter((r) => r.on && r.q.trim() && r.a.trim()) ?? [];

  const keep = () => {
    if (!chosen.length) return;
    const name = topic.trim(), r = addTopic(data, name);
    update(() => saveMany(r.data, chosen.map((c) => makeQ({ t: r.id, k: 'short', q: c.q, a: c.a, cl: [] }))));
    router.push(`/questions/?t=${r.id}`);
  };

  /* Switched off for now: a plain page, nothing about Coe. */
  if (!COE_ENABLED) {
    return (
      <Page active="questions">
        <main className="one" style={{ maxWidth: 640 }}>
          <h1 className="h1 m">Not here yet</h1>
          <p>This page is switched off for now. You can still add questions yourself.</p>
          <div className="row"><Link href="/add/" className="btn p big">Add a question</Link></div>
        </main>
      </Page>
    );
  }

  if (!coeOn || (ready && !who)) {
    return (
      <Page active="questions">
        <main className="one" style={{ maxWidth: 640 }}>
          <div className="row" style={{ gap: 13, flexWrap: 'nowrap' }}><CoeMark fill="#337957" style={{ width: 38, height: 69, flexShrink: 0 }} /><h1 className="h1 m">Ideas from Coe</h1></div>
          <div className="plate big" style={{ padding: '20px 21px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {coeOn ? <><p>Sign in with your PMC ID and Coe can suggest questions for any topic. You check each one before it is kept.</p><div className="row"><Link href="/signin/" className="btn p big">Sign in</Link><Link href="/add/" className="btn q">Add a question yourself</Link></div></>
              : <><p>Ideas from Coe is not available right now. You can still add questions yourself.</p><div className="row"><Link href="/add/" className="btn p big">Add a question</Link></div></>}
          </div>
        </main>
      </Page>
    );
  }

  return (
    <Page active="questions">
      <main className="wrap">
        <section className="col" style={{ flex: '1 1 360px' }}>
          <div className="row" style={{ gap: 16, flexWrap: 'nowrap' }}>
            <CoeMark fill="#337957" style={{ width: 38, height: 69, flexShrink: 0 }} />
            <h1 className="h1 m">Ideas from Coe</h1>
          </div>
          <form className="plate big" style={{ padding: '24px 24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={(e) => { e.preventDefault(); void ask(); }}>
            <label className="fld"><span className="lab">Topic</span><input className="f" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={80} placeholder="Forces" autoFocus /></label>
            <div className="fld"><span className="lab">Year group</span><Sel label="Year group" value={year} onChange={setYear}>{YEARS.map((y) => <option key={y}>{y}</option>)}</Sel></div>
            <div className="fld"><span className="lab">How many</span><Seg label="How many ideas" value={n} onChange={setN} options={[[3, '3'], [5, '5'], [8, '8']]} /></div>
            {miss && (
              <>
                <Switch on={missed} onChange={setMissed}>Include what the class missed</Switch>
                <span className="hint" style={{ marginTop: -8 }}>The class missed: {miss.q}</span>
              </>
            )}
            {err && <div className="note bad" role="alert">{err}</div>}
            <button type="submit" className="btn p big" disabled={busy}>{busy ? 'Coe is writing' : rows ? 'Get new ideas' : 'Get ideas'}</button>
          </form>
        </section>

        <section className="col" style={{ flex: '999 1 620px' }}>
          <div className="plate big" aria-live="polite">
            <div className="ph"><span>{rows ? `${rows.length} ideas for ${topic.trim() || 'your topic'}` : 'Ideas'}</span>{rows && <small>Check each answer before you use it</small>}</div>
            {!rows && <div className="empty hint" style={{ fontSize: 18 }}>{busy ? 'Coe is writing questions. This takes a few seconds.' : 'Ideas show here. You check each one first, and only the ones you add are kept.'}</div>}
            {rows?.map((r, i) => (
              <div className="qr" key={i} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <span className="tx" style={{ flexBasis: 280 }}>
                  {r.edit ? (
                    <span className="fld" style={{ gap: 10 }}>
                      <textarea className="f" rows={2} value={r.q} aria-label="Question" onChange={(e) => set(i, { q: e.target.value })} maxLength={300} />
                      <input className="f" value={r.a} aria-label="Answer" onChange={(e) => set(i, { a: e.target.value })} maxLength={300} />
                    </span>
                  ) : <><div>{r.q}</div><div className="sub" style={{ color: 'var(--g2)' }}>{r.a}</div></>}
                </span>
                <div className="row" style={{ gap: 10, flexShrink: 0 }}>
                  <button type="button" className="btn s" onClick={() => set(i, { edit: !r.edit })}>{r.edit ? 'Done' : 'Edit'}</button>
                  <button type="button" className={r.on ? 'btn s p' : 'btn s'} style={{ minWidth: 80 }} aria-pressed={r.on} onClick={() => set(i, { on: !r.on })}>{r.on ? 'Added' : 'Add'}</button>
                </div>
              </div>
            ))}
            {rows && (
              <div className="pf">
                {chosen.length > 0 ? <button type="button" className="btn p big" onClick={keep}>Add {chosen.length} question{chosen.length === 1 ? '' : 's'} to {topic.trim()}</button> : <span className="hint">Press Add on the ones you want to keep.</span>}
                <Link href="/add/" className="btn q">Back</Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </Page>
  );
}
