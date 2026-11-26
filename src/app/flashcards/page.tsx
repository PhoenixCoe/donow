'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Page } from '@/components/Page';
import { Sel } from '@/components/ui';
import { useStore } from '@/lib/store';
import { answerOf, LETTERS, type Q } from '@/lib/types';
import { useParams } from '@/lib/useParams';

const ALL = '__all';
const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** Flip-through revision cards from the question bank. Nothing is saved: cards marked Not yet just come round again sooner. */
export default function Flashcards() {
  const { data } = useStore();
  const p = useParams();
  const [tid, setTid] = useState('');
  const [queue, setQueue] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [back, setBack] = useState(false);
  const [got, setGot] = useState(0);
  const [round, setRound] = useState(0);

  useEffect(() => { const t = p?.get('t'); if (t) setTid(t); }, [p]);
  const topic = tid === ALL ? undefined : data.topics.find((t) => t.id === tid) ?? data.topics.find((t) => data.qs.some((q) => q.t === t.id));
  const pool = useMemo(() => data.qs.filter((q) => tid === ALL || !topic || q.t === topic.id), [data.qs, topic, tid]);
  const key = pool.map((q) => q.id).join(',');

  /* A fresh shuffled pack whenever the topic changes or the teacher goes again. */
  useEffect(() => { setQueue(shuffle(pool.map((q) => q.id))); setI(0); setBack(false); setGot(0); }, [key, round]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = (id: string): Q | undefined => data.qs.find((q) => q.id === id);
  const card = queue.length ? byId(queue[Math.min(i, queue.length - 1)]) : undefined;
  const n = queue.length;
  const go = (d: number) => { if (!n) return; setI((x) => (x + d + n) % n); setBack(false); };
  const done = (ok: boolean) => {
    if (!card) return;
    const at = Math.min(i, n - 1), id = queue[at], rest = queue.filter((_, k) => k !== at);
    if (ok) { setQueue(rest); setGot((g) => g + 1); setI(rest.length ? at % rest.length : 0); }
    else { const to = Math.min(rest.length, at + 3); setQueue([...rest.slice(0, to), id, ...rest.slice(to)]); setI(to <= at ? (at + 1) % (rest.length + 1) : at); }
    setBack(false);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const total = pool.length, finished = total > 0 && n === 0;

  return (
    <Page active="cards">
      <main className="one" style={{ maxWidth: 780 }}>
        {total === 0 && !finished ? (
          <>
            <div><div className="lab" style={{ marginBottom: 8 }}>Revision</div><h1 className="h1 m">Flashcards</h1></div>
            <div className="plate big"><div className="empty" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><p>Flashcards are made from your questions. Add a few first.</p><div className="row"><Link href="/add/" className="btn p big">Add a question</Link></div></div></div>
          </>
        ) : (
          <>
            <div className="rowend">
              <div><div className="lab" style={{ marginBottom: 8 }}>Topic</div><h1 className="h1 m" style={{ overflowWrap: 'anywhere' }}>{topic ? topic.name : 'All topics'}</h1></div>
              <div className="row" style={{ gap: 18 }}>
                {data.topics.length > 1 && <label className="fld" style={{ width: 190 }}><span className="lab">Choose a topic</span>
                  <Sel label="Topic" value={tid === ALL ? ALL : topic?.id ?? ''} onChange={setTid}>
                    {data.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}<option value={ALL}>All topics</option>
                  </Sel></label>}
                {!finished && <div className="d" style={{ fontSize: 23 }}>Card {Math.min(i, n - 1) + 1} of {n}</div>}
              </div>
            </div>

            {finished ? (
              <div className="plate big">
                <div className="ph"><span>All done</span></div>
                <div className="empty" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p>You got through all {total} card{total === 1 ? '' : 's'}.</p>
                  <div className="row"><button type="button" className="btn p big" onClick={() => setRound((r) => r + 1)}>Go again</button><Link href="/" className="btn q">Back to Today</Link></div>
                </div>
              </div>
            ) : card && (
              <>
                <button type="button" className="fc" onClick={() => setBack((b) => !b)} aria-label="Flip the card" style={{ background: back ? '#1A4934' : '#fff', color: back ? 'var(--paper)' : '#171717' }}>
                  <span className="lab">{back ? 'Answer' : 'Question'}</span>
                  {!back && card.k === 'pic' && card.pic && /* eslint-disable-next-line @next/next/no-img-element */ <img src={card.pic} alt="Picture for the question" />}
                  <span style={{ fontSize: 36, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{back ? (card.k === 'choice' ? `${LETTERS[card.ri ?? 0]}. ${answerOf(card)}` : answerOf(card)) : card.q}</span>
                  {!back && card.k === 'choice' && card.ch && <span style={{ fontSize: 23, lineHeight: 1.3 }}>{card.ch.map((c, j) => `${LETTERS[j]} ${c}`).join('   ·   ')}</span>}
                  <span className="hint">Click the card to flip it</span>
                </button>

                <div className="rowend" style={{ alignItems: 'center' }}>
                  <button type="button" className="btn big" onClick={() => go(-1)}>Back</button>
                  <div className="row" style={{ gap: 14 }}>
                    <button type="button" className="btn" style={{ background: 'var(--g1)', color: 'var(--paper)' }} onClick={() => done(true)}>Got it</button>
                    <button type="button" className="btn" style={{ background: 'var(--gold)' }} onClick={() => done(false)}>Not yet</button>
                  </div>
                  <button type="button" className="btn p big" onClick={() => go(1)}>Next</button>
                </div>
                <span className="hint">Cards marked Not yet come back sooner.{got > 0 ? ` ${got} got it so far.` : ''}</span>
              </>
            )}
          </>
        )}
      </main>
    </Page>
  );
}
