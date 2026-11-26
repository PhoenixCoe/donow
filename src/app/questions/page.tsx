'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Page } from '@/components/Page';
import { Sel } from '@/components/ui';
import { questionsCsv, saveFile } from '@/lib/csv';
import { niceDate } from '@/lib/dates';
import { addTopic, lastTaught, removeTopic, renameTopic, taughtOn, toggleTaught } from '@/lib/ops';
import { eligible, lastHist, statusChip, topicStatus } from '@/lib/pick';
import { useClass, useStore } from '@/lib/store';
import { KINDS, MARKS } from '@/lib/types';
import { useParams } from '@/lib/useParams';

const KIND = Object.fromEntries(KINDS) as Record<string, string>;

export default function Questions() {
  const { data, update } = useStore();
  const { cid, choose, today } = useClass();
  const p = useParams();
  const [tid, setTid] = useState('');
  const [find, setFind] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [rn, setRn] = useState('');
  const [del, setDel] = useState(false);
  useEffect(() => { const t = p?.get('t'); if (t) setTid(t); }, [p]);

  const topic = data.topics.find((t) => t.id === tid) ?? data.topics[0];
  const cls = data.classes.find((c) => c.id === cid);
  const inTopic = topic ? data.qs.filter((q) => q.t === topic.id) : [];
  const f = find.trim().toLowerCase();
  const list = (f ? inTopic.filter((q) => q.q.toLowerCase().includes(f) || q.a.toLowerCase().includes(f)) : inTopic).slice().sort((a, b) => b.at - a.at);

  const create = () => {
    if (!name.trim()) return;
    const r = addTopic(data, name);
    update(() => r.data); setTid(r.id); setName(''); setAdding(false);
  };
  const chip = (q: (typeof data.qs)[number]) => {
    if (!cls) return <span className="chip none">Not asked yet</span>;
    if (!eligible(q, cid)) return <span className="chip none">Not for {cls.name}</span>;
    const h = lastHist(q, cid);
    return h ? <span className={h.m === 2 ? 'chip bad' : h.m === 1 ? 'chip gold' : 'chip'}>{MARKS[h.m]}</span> : <span className="chip none">Not asked yet</span>;
  };

  /* No topics yet. */
  if (!data.topics.length) {
    return (
      <Page active="questions">
        <main className="one" style={{ maxWidth: 640 }}>
          <div><div className="lab" style={{ marginBottom: 8 }}>Question bank</div><h1 className="h1 m">Add your first topic</h1></div>
          <form className="plate big" style={{ padding: '20px 21px', display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={(e) => { e.preventDefault(); create(); }}>
            <label className="fld"><span className="lab">Topic name</span><input className="f" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cells" maxLength={60} autoFocus /></label>
            <div className="row"><button type="submit" className="btn p big" disabled={!name.trim()}>Add topic</button><span className="hint">Questions are kept in topics. Do Now picks across them.</span></div>
          </form>
        </main>
      </Page>
    );
  }

  return (
    <Page active="questions">
      <main className="wrap">
        <aside style={{ flex: '1 1 250px', alignSelf: 'flex-start' }}>
          <div className="plate">
            <div className="ph"><span>Topics</span></div>
            {data.topics.map((t, i) => {
              const s = cls ? topicStatus(data, t.id, cid) : '';
              return (
                <button type="button" key={t.id} className={t.id === topic?.id ? 'tp on' : 'tp'} style={i === 0 ? { borderTop: 0 } : undefined} aria-current={t.id === topic?.id ? 'true' : undefined} onClick={() => { setTid(t.id); setFind(''); setDel(false); setRenaming(false); }}>
                  <span style={{ minWidth: 0, overflowWrap: 'anywhere', textAlign: 'left' }}>{t.name}</span>{s && <span className={statusChip(s)}>{s}</span>}
                </button>
              );
            })}
            {adding ? (
              <form className="pf" style={{ flexDirection: 'column', alignItems: 'stretch', borderTop: '3px solid #171717' }} onSubmit={(e) => { e.preventDefault(); create(); }}>
                <input className="f" value={name} onChange={(e) => setName(e.target.value)} placeholder="Topic name" aria-label="New topic name" maxLength={60} autoFocus />
                <div className="row"><button type="submit" className="btn p s" disabled={!name.trim()}>Add</button><button type="button" className="btn q s" onClick={() => { setAdding(false); setName(''); }}>Cancel</button></div>
              </form>
            ) : <button type="button" className="tp" onClick={() => setAdding(true)}>New topic</button>}
          </div>
          {data.qs.length > 0 && (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              <button type="button" className="btn s" onClick={() => saveFile(`do-now-questions-${today}.csv`, questionsCsv(data))}>Download spreadsheet</button>
              <span className="hint">All your questions and how each class did. Opens in Excel, Sheets or Numbers.</span>
            </div>
          )}
        </aside>

        <section className="col" style={{ flex: '999 1 620px' }}>
          {topic && (
            <>
              <div className="row" style={{ alignItems: 'flex-end' }}>
                {renaming ? (
                  <form className="row" style={{ flexGrow: 1 }} onSubmit={(e) => { e.preventDefault(); if (rn.trim()) { update((d) => renameTopic(d, topic.id, rn)); setRenaming(false); } }}>
                    <input className="f" style={{ maxWidth: 350 }} value={rn} onChange={(e) => setRn(e.target.value)} aria-label="Topic name" maxLength={60} autoFocus />
                    <button type="submit" className="btn p s" disabled={!rn.trim()}>Save</button><button type="button" className="btn q s" onClick={() => setRenaming(false)}>Cancel</button>
                  </form>
                ) : <h1 className="h1 m" style={{ flexGrow: 1, overflowWrap: 'anywhere' }}>{topic.name}</h1>}
                {data.classes.length > 1 && <label className="fld" style={{ width: 165 }}><span className="lab">Results for</span><Sel label="Results for class" value={cid} onChange={choose}>{data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Sel></label>}
                <label className="fld" style={{ flex: '1 1 240px' }}><span className="lab">Search</span><input className="f" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a question" /></label>
                <Link href={`/add/?list=1&t=${topic.id}`} className="btn">Import from a list</Link>
              </div>

              {del && (
                <div className="note" role="alert" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ flex: '1 1 300px' }}>Delete {topic.name} and its {inTopic.length} question{inTopic.length === 1 ? '' : 's'}? This cannot be undone.</span>
                  <button type="button" className="btn danger s" onClick={() => { update((d) => removeTopic(d, topic.id)); setTid(''); setDel(false); }}>Yes, delete</button>
                  <button type="button" className="btn s" onClick={() => setDel(false)}>Keep it</button>
                </div>
              )}

              {data.classes.length > 0 && (
                <div className="plate">
                  <div className="ph"><span>Taught</span><small>Tap when you teach it</small></div>
                  {data.classes.map((c) => {
                    const on = taughtOn(data, c.id, topic.id, today), last = lastTaught(data, c.id, topic.id);
                    return (
                      <div className="qr" key={c.id} style={{ flexWrap: 'wrap' }}>
                        <span className="d" style={{ fontSize: 25, minWidth: 75, flexShrink: 0 }}>{c.name}</span>
                        <span className={on ? 'chip' : last ? 'chip gold' : 'chip none'}>{on ? 'Taught today' : last ? `Taught ${niceDate(last)}` : 'Not taught yet'}</span>
                        <span className="tx" />
                        <button type="button" className={on ? 'btn' : 'btn p'} onClick={() => update((d) => toggleTaught(d, c.id, topic.id, today))}>{on ? 'Undo' : 'Taught today'}</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="plate big">
                <div className="ph" style={{ fontSize: 18 }}><span style={{ flex: 3 }}>Question</span><span style={{ flex: 1.2 }}>Type</span><span style={{ flex: 1.2 }}>Last result</span></div>
                {list.map((q) => (
                  <Link key={q.id} href={`/add/?id=${q.id}`} className="tg" aria-label={`Edit: ${q.q}`}>
                    <span style={{ overflowWrap: 'anywhere' }}>{q.q}</span><span className="hint">{KIND[q.k]}</span><span>{chip(q)}</span>
                  </Link>
                ))}
                {!list.length && (
                  <div className="empty" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p>{f ? 'No question matches that.' : `No questions in ${topic.name} yet.`}</p>
                    {!f && <div className="row"><Link href={`/add/?t=${topic.id}`} className="btn p big">Add a question</Link></div>}
                  </div>
                )}
                {list.length > 0 && (
                  <div className="pf">
                    <Link href={`/add/?t=${topic.id}`} className="btn p">Add a question</Link>
                    <button type="button" className="btn" onClick={() => { setRn(topic.name); setRenaming(true); }}>Rename topic</button>
                    <button type="button" className="btn q" onClick={() => setDel(true)}>Delete topic</button>
                  </div>
                )}
              </div>
              {!list.length && !f && (
                <div className="row"><button type="button" className="btn" onClick={() => { setRn(topic.name); setRenaming(true); }}>Rename topic</button><button type="button" className="btn q" onClick={() => setDel(true)}>Delete topic</button></div>
              )}
            </>
          )}
        </section>
      </main>
    </Page>
  );
}
