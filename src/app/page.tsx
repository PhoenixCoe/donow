'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Graph } from '@/components/Graph';
import { Page } from '@/components/Page';
import { CoeMark, Sel, SyncChip } from '@/components/ui';
import { cloudOn } from '@/lib/cloud';
import { coeOn } from '@/lib/coe';
import { addDays, dayName, niceDate, shortDay, weekday } from '@/lib/dates';
import { addClass, ensureSet, getSet, markShown, pendingSet, periodOf, reshuffle, swapInSet } from '@/lib/ops';
import { eligible, lastHist, statusChip, whyChip } from '@/lib/pick';
import { average, recentResults, topicRows, weekLessons } from '@/lib/stats';
import { useClass, useStore } from '@/lib/store';
import { short, type Q } from '@/lib/types';

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
        <main className="one" style={{ maxWidth: 640 }}>
          <div><div className="lab" style={{ marginBottom: 8 }}>Start here</div><h1 className="h1 m">Add your first class</h1></div>
          <form className="plate big" style={{ padding: '20px 21px', display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={(e) => { e.preventDefault(); go(); }}>
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

  /* The numbers on the dashboard, all for the class that is picked. */
  const avg = cls ? average(data, cid) : { pct: null, used: 0, change: null };
  const bars = cls ? recentResults(data, cid, 12) : [];
  const tops = cls ? topicRows(data, cid) : [];
  const lessons = weekLessons(data, today, now);
  const recapTopic = tops.find((x) => x.status === 'Recap') ?? tops.find((x) => x.status === 'Mixed');
  const recapQ = recapTopic ? data.qs.find((q) => q.t === recapTopic.id && eligible(q, cid) && (lastHist(q, cid)?.m ?? 0) > 0) : undefined;
  const mon = addDays(today, -weekday(now));
  const todayIdx = weekday(now);

  const show = () => { update((d) => markShown(d, cid, today)); router.push('/board/'); };

  return (
    <Page active="today">
      {cls && (
        <main className="dash">
          <header className="rowend">
            <div>
              <div className="row" style={{ gap: 14, marginBottom: 8 }}><span className="lab">{dayName(today)}{period ? ` · period ${period}` : ''}</span><SyncChip /></div>
              <h1 className="h1">{cls.name}</h1>
            </div>
            {data.classes.length > 1 && (
              <label className="fld" style={{ width: 190 }}><span className="lab">Class</span>
                <Sel label="Class" value={cid} onChange={choose}>{data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Sel></label>
            )}
          </header>

          <div className={mine.length === 0 ? 'dg solo' : 'dg'}>
            <div className="dl">
              {mine.length === 0 ? (
                <div className="plate big o1">
                  <div className="ph"><span>No questions yet</span></div>
                  <div className="empty" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p>Add a few questions and Do Now picks five for each lesson.</p>
                    <div className="row"><Link href="/add/" className="btn p big">Add a question</Link>{coeOn && <Link href="/coe/" className="btn g"><CoeMark />Ideas from Coe</Link>}</div>
                  </div>
                </div>
              ) : (
                <div className="plate big o1">
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

              {pending && (
                <div className="note dn o0" role="status">
                  <span>{dayName(pending.d)}&apos;s Do Now was shown but not marked.</span>
                  <Link href={`/result/?d=${pending.d}&c=${cid}`} className="btn s p">Mark it</Link>
                </div>
              )}
            </div>

            <div className="dr">
              {mine.length > 0 && <div className="plate o3">
                <div className="ph"><span>Topics</span>{tops.length > 0 && <small>Worst first</small>}</div>
                {tops.length === 0 && <div className="empty hint">After you mark a Do Now, how {cls.name} is doing on each topic shows here.</div>}
                {tops.slice(0, 4).map((t) => (
                  <Link className="tr" key={t.id} href={`/questions/?t=${t.id}`} aria-label={`${t.name}: ${t.status}. Open its questions.`}>
                    <div className="trh"><span className="d" style={{ fontSize: 23, lineHeight: 1 }}>{t.name}</span><span className={statusChip(t.status)}>{t.status}</span></div>
                    <div className="mb" role="img" aria-label={`Most ${t.most}, some ${t.some}, few ${t.few}, not asked ${t.fresh}`}>
                      {t.most > 0 && <i className="m0" style={{ flex: t.most }} />}{t.some > 0 && <i className="m1" style={{ flex: t.some }} />}{t.few > 0 && <i className="m2" style={{ flex: t.few }} />}{t.fresh > 0 && <i style={{ flex: t.fresh }} />}
                    </div>
                  </Link>
                ))}
                <div className="pf">
                  {coeOn && recapTopic && <Link href={`/coe/?t=${recapTopic.id}${recapQ ? `&m=${recapQ.id}` : ''}`} className="btn g"><CoeMark />Recap ideas</Link>}
                  <Link href="/questions/" className="btn">All topics</Link>
                </div>
              </div>}
            </div>
          </div>

          {mine.length > 0 && (
            <div className="plate">
              <div className="ph"><span>How {cls.name} is doing</span>{bars.length > 0 && <small>Last {bars.length} Do Now{bars.length === 1 ? '' : 's'}</small>}</div>
              {bars.length === 0 ? (
                <div className="empty hint">Mark a Do Now and how {cls.name} did shows here as a line.</div>
              ) : (
                <>
                  <Graph bars={bars} name={cls.name} />
                  <div className="pf">
                    <span className="chip">Most got it</span><span className="chip bad">Few got it</span>
                    <span className="hint">Each point is one Do Now.{avg.pct !== null && ` In the last ${avg.used} most of the class got ${avg.pct}% of the questions${avg.change === null ? '' : avg.change === 0 ? ', the same as the 5 before' : `, ${avg.change > 0 ? 'up' : 'down'} ${Math.abs(avg.change)} point${Math.abs(avg.change) === 1 ? '' : 's'} on the 5 before`}.`}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="plate">
            <div className="ph"><span>This week</span><small>{niceDate(mon)} to {niceDate(addDays(mon, 4))}</small></div>
            {lessons.length === 0 ? (
              <div className="empty hint">Add your lessons and the week shows here, with each Do Now marked off.</div>
            ) : (
              <div className="wk">
                {[0, 1, 2, 3, 4].map((day) => (
                  <div className="wc" key={day}>
                    <div className={day === todayIdx ? 'wd now' : 'wd'}>{shortDay(day)}</div>
                    {lessons.filter((l) => l.day === day).map((l) => {
                      const c = data.classes.find((x) => x.id === l.c);
                      return (
                        <button type="button" key={`${l.day}${l.period}`} className={`wl ${l.state}${l.c === cid ? ' cur' : ''}`} onClick={() => choose(l.c)} aria-pressed={l.c === cid} aria-label={`${c?.name}, period ${l.period}${l.state === 'done' ? ', done' : l.state === 'mark' ? ', to mark' : l.state === 'next' ? ', next' : ''}`}>
                          <span className="wp">P{l.period}</span>
                          <b>{short(c)}</b>
                          <small>{l.state === 'done' ? 'Done' : l.state === 'mark' ? 'Mark' : l.state === 'next' ? 'Next' : ' '}</small>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            <div className="pf"><Link href="/timetable/" className="btn">Edit timetable</Link><span className="hint">Tap a lesson to look at that class.</span></div>
          </div>
        </main>
      )}
      {!cls && <main className="wrap"><p className="hint">Loading</p></main>}
    </Page>
  );
}
