'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Page } from '@/components/Page';
import { CoeMark, Sel, SyncChip } from '@/components/ui';
import { cloudOn } from '@/lib/cloud';
import { coeOn } from '@/lib/coe';
import { dayName, shortDay } from '@/lib/dates';
import { addClass, comingUp, ensureSet, getSet, markShown, pendingSet, periodOf, reshuffle, swapInSet } from '@/lib/ops';
import { eligible, lastHist, statusChip, topicStatus, whyChip } from '@/lib/pick';
import { useClass, useStore } from '@/lib/store';
import type { Q } from '@/lib/types';

const clip = (s: string, n = 64) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export default function Today() {
  const { data, ready, update, who } = useStore();
  const { cid, choose, now, today } = useClass();
  const router = useRouter();
  const [first, setFirst] = useState('');
  const cls = data.classes.find((c) => c.id === cid);

  useEffect(() => { if (ready && cid) update((d) => ensureSet(d, cid, today)); }, [ready, cid, today, data.qs.length, data.classes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* First time here: no class yet. */
  if (ready && !data.classes.length) {
    const go = () => { if (first.trim()) update((d) => addClass(d, first).data); };
    return (
      <Page active="today" add={false}>
        <main className="one" style={{ maxWidth: 760 }}>
          <div><div className="lab" style={{ marginBottom: 10 }}>Start here</div><h1 className="h1 m">Add your first class</h1></div>
          <form className="plate big" style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 20 }} onSubmit={(e) => { e.preventDefault(); go(); }}>
            <label className="fld"><span className="lab">Class name</span><input className="f" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="9X3 Science" autoFocus maxLength={40} /></label>
            <div className="row"><button type="submit" className="btn p big" disabled={!first.trim()}>Add class</button><span className="hint">You can add more classes later.</span></div>
          </form>
          {cloudOn && !who && <p className="hint">Already use Do Now on another computer? <Link href="/signin/">Sign in</Link> and your questions are here.</p>}
          <SyncChip />
        </main>
      </Page>
    );
  }

  const set = cls ? getSet(data, cid, today) : undefined;
  const rows = set ? set.ids.map((id, i) => ({ q: data.qs.find((q) => q.id === id), why: set.w[i], i })).filter((r): r is { q: Q; why: string; i: number } => !!r.q) : [];
  const period = cls ? periodOf(data, cid, now) : 0;
  const pending = cls ? pendingSet(data, cid, today) : undefined;
  const mine = data.qs.filter((q) => cid && eligible(q, cid));

  /* Topics, worst first, for the side box. */
  const tops = cls ? data.topics.map((t) => ({ t, s: topicStatus(data, t.id, cid) })).filter((x) => x.s) : [];
  const order = { Recap: 0, Mixed: 1, Strong: 2, '': 3 } as const;
  tops.sort((a, b) => order[a.s] - order[b.s]);
  const sub = (tid: string, s: string) => {
    const qs = data.qs.filter((q) => q.t === tid && eligible(q, cid)), want = s === 'Recap' ? 2 : 1;
    const hit = qs.find((q) => lastHist(q, cid)?.m === want);
    return s === 'Recap' && hit ? `Few got: “${clip(hit.q)}”` : s === 'Mixed' && hit ? `Some missed: “${clip(hit.q)}”` : 'Most got every question.';
  };
  const recapTopic = tops.find((x) => x.s === 'Recap') ?? tops.find((x) => x.s === 'Mixed');
  const recapQ = recapTopic ? data.qs.find((q) => q.t === recapTopic.t.id && eligible(q, cid) && (lastHist(q, cid)?.m ?? 0) > 0) : undefined;
  const up = cls ? comingUp(data, cid, now) : [];

  const show = () => { update((d) => markShown(d, cid, today)); router.push('/board/'); };

  return (
    <Page active="today">
      {cls && (
        <main className="wrap" style={{ paddingBottom: 22 }}>
          <section className="col" style={{ flex: '999 1 600px' }}>
            <div className="rowend">
              <div>
                <div className="row" style={{ gap: 14, marginBottom: 10 }}><span className="lab">{dayName(today)}{period ? ` · period ${period}` : ''}</span><SyncChip /></div>
                <h1 className="h1">{cls.name}</h1>
              </div>
              {data.classes.length > 1 && (
                <label className="fld" style={{ width: 230 }}><span className="lab">Class</span>
                  <Sel label="Class" value={cid} onChange={choose}>{data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Sel></label>
              )}
            </div>

            {mine.length === 0 ? (
              <div className="plate big">
                <div className="ph"><span>No questions yet</span></div>
                <div className="empty" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p>Add a few questions and Do Now picks five for each lesson.</p>
                  <div className="row"><Link href="/add/" className="btn p big">Add a question</Link>{coeOn && <Link href="/coe/" className="btn g"><CoeMark />Ideas from Coe</Link>}</div>
                </div>
              </div>
            ) : (
              <div className="plate big">
                <div className="ph"><span>Today&apos;s Do Now</span><small>{rows.length} question{rows.length === 1 ? '' : 's'} · {data.mins} min</small></div>
                {rows.map(({ q, why, i }) => (
                  <div className="qr" key={q.id}>
                    <span className="no">{i + 1}</span>
                    <span className="tx">{q.q}{q.k === 'pic' && <div className="sub">Shows a picture</div>}</span>
                    <span className={whyChip(why)}>{why}</span>
                    <button type="button" className="btn s" aria-label={`Swap question ${i + 1}`} onClick={() => update((d) => swapInSet(d, cid, today, i))}>Swap</button>
                  </div>
                ))}
                <div className="pf">
                  <button type="button" className="btn p big" onClick={show} disabled={!rows.length}>Show on board</button>
                  <button type="button" className="btn" onClick={() => update((d) => reshuffle(d, cid, today))}>Shuffle</button>
                </div>
              </div>
            )}
          </section>

          <aside className="col" style={{ flex: '1 1 350px' }}>
            <div className="plate">
              <div className="ph"><span>Worth recapping</span></div>
              {tops.length === 0 && <div className="empty hint">After you mark a Do Now, the topics to go over again show here.</div>}
              {tops.slice(0, 4).map(({ t, s }) => (
                <div className="qr" style={{ alignItems: 'flex-start' }} key={t.id}>
                  <span className="tx"><span className="d" style={{ fontSize: 28, lineHeight: 1 }}>{t.name}</span><div className="sub">{sub(t.id, s)}</div></span>
                  <span className={statusChip(s)}>{s}</span>
                </div>
              ))}
              {(pending || (coeOn && recapTopic)) && (
                <div className="pf">
                  {coeOn && recapTopic && <Link href={`/coe/?t=${recapTopic.t.id}${recapQ ? `&m=${recapQ.id}` : ''}`} className="btn g"><CoeMark />Recap ideas</Link>}
                  {pending && <Link href={`/result/?d=${pending.d}&c=${cid}`} className="btn">Mark {dayName(pending.d)}&apos;s</Link>}
                </div>
              )}
            </div>

            <div className="plate">
              <div className="ph"><span>Coming up</span></div>
              {up.map((u, i) => (
                <div className="qr" key={i}><span className="tx">{data.classes.find((c) => c.id === u.c)?.name}</span><span className="d" style={{ fontSize: 22 }}>{shortDay(u.day)} P{u.period}</span></div>
              ))}
              {up.length === 0 && <div className="empty hint">Add your lessons and Today opens on the right class by itself.</div>}
              <div className="pf"><Link href="/timetable/" className="btn">Edit timetable</Link></div>
            </div>
          </aside>
        </main>
      )}
      {!cls && <main className="wrap"><p className="hint">Loading</p></main>}
    </Page>
  );
}
