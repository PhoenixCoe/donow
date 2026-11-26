'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Page } from '@/components/Page';
import { Seg } from '@/components/ui';
import { coeOn } from '@/lib/coe';
import { dayName } from '@/lib/dates';
import { finishSet, getSet, periodOf, setMarks } from '@/lib/ops';
import { useClass, useStore } from '@/lib/store';
import { answerOf, MARKS, type Mark, type Q } from '@/lib/types';
import { useParams } from '@/lib/useParams';

/** How the class did on a Do Now. Everyone is "Most" to start, so the teacher only taps the ones that went differently. */
export default function Result() {
  const { data, ready, update } = useStore();
  const { cid: auto, release, now, today } = useClass();
  const router = useRouter();
  const p = useParams();
  const cid = p?.get('c') && data.classes.some((c) => c.id === p.get('c')) ? p.get('c')! : auto;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(p?.get('d') ?? '') ? p!.get('d')! : today;
  const cls = data.classes.find((c) => c.id === cid);
  const set = cls ? getSet(data, cid, d) : undefined;
  const rows = (set ? set.ids.map((id, i) => ({ q: data.qs.find((x) => x.id === id), i })) : []).filter((r): r is { q: Q; i: number } => !!r.q);
  const [marks, setM] = useState<Mark[] | null>(null);
  const cur: Mark[] = marks ?? (set ? set.ids.map((_, i) => set.marks?.[i] ?? 0) : []);

  useEffect(() => { setM(null); }, [cid, d]);

  const pick = (i: number, m: Mark) => {
    const next = [...cur]; next[i] = m; setM(next);
    update((x) => setMarks(x, cid, d, next));   // saved as it is tapped
  };
  const done = () => { update((x) => finishSet(x, cid, d, cur)); release(); router.push('/'); };

  const back = rows.map((r) => ({ q: r.q, m: cur[r.i] })).filter((r) => r.m > 0).sort((a, b) => b.m - a.m);
  const first = back[0]?.q;
  const period = cls && d === today ? periodOf(data, cid, now) : 0;

  return (
    <Page active="today">
      <main className="wrap">
        <section className="col" style={{ flex: '999 1 620px' }}>
          {!p || !ready ? <p className="hint">Loading</p> : !cls || !set || !rows.length ? (
            <div className="plate big"><div className="ph"><span>Nothing to mark</span></div><div className="empty" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><p>There is no Do Now for that day.</p><div className="row"><Link href="/" className="btn p big">Back to Today</Link></div></div></div>
          ) : (
            <>
              <div>
                <div className="lab" style={{ marginBottom: 8 }}>{cls.name} · {dayName(d)}{period ? ` period ${period}` : ''}</div>
                <h1 className="h1 m">How did the class do?</h1>
                <p style={{ margin: '11px 0 0', maxWidth: '62ch' }}>Tap only the ones that went differently. Most is over three quarters of the class, some is a quarter to three quarters, few is under a quarter. Nothing is saved about students.</p>
              </div>
              <div className="plate big">
                {rows.map(({ q, i }) => (
                  <div className="qr" key={q.id} style={{ flexWrap: 'wrap' }}>
                    <span className="no">{i + 1}</span>
                    <span className="tx" style={{ flexBasis: 260 }}>{q.q}<div className="sub">{answerOf(q)}</div></span>
                    <Seg label={`How many got question ${i + 1}`} value={cur[i]} onChange={(m) => pick(i, m)} options={MARKS.map((t, m) => [m as Mark, t] as [Mark, string])} />
                  </div>
                ))}
                <div className="pf">
                  <button type="button" className="btn p big" onClick={done}>Done</button>
                  <Link href="/" className="btn q">Mark it later</Link>
                </div>
              </div>
            </>
          )}
        </section>

        {cls && set && rows.length > 0 && (
          <aside className="col" style={{ flex: '1 1 340px' }}>
            <div className="plate">
              <div className="ph"><span>Coming back</span></div>
              {back.map(({ q, m }) => (
                <div className="qr" style={{ alignItems: 'flex-start' }} key={q.id}>
                  <span className="tx">{q.q}</span>
                  <span className={m === 2 ? 'chip bad' : 'chip gold'}>{m === 2 ? 'Next lesson' : 'This week'}</span>
                </div>
              ))}
              {back.length === 0 && <div className="qr"><span className="tx">All good. Nothing to recap.</span></div>}
              {coeOn && first && <div className="pf"><Link href={`/coe/?t=${first.t}&m=${first.id}`} className="btn g">Recap ideas</Link></div>}
            </div>
          </aside>
        )}
      </main>
    </Page>
  );
}
