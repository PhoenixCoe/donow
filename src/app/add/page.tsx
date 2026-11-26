'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Page } from '@/components/Page';
import { CoeMark, Seg, Sel, Switch } from '@/components/ui';
import { coeOn } from '@/lib/coe';
import { addTopic, deleteQ, makeQ, parseList, saveMany, saveQ } from '@/lib/ops';
import { fileToPic } from '@/lib/pic';
import { useStore } from '@/lib/store';
import { KINDS, type Kind } from '@/lib/types';
import { useParams } from '@/lib/useParams';

const NEW = '__new';

/** Adds a question, edits one (?id=), or adds a pasted list (?list=1). */
export default function Add() {
  const { data, ready, update } = useStore();
  const router = useRouter();
  const p = useParams();
  const editId = p?.get('id') ?? '';
  const editing = editId ? data.qs.find((q) => q.id === editId) : undefined;
  const listMode = p?.get('list') === '1';

  const [kind, setKind] = useState<Kind>('short');
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [ch, setCh] = useState(['', '', '', '']);
  const [ri, setRi] = useState(0);
  const [tf, setTf] = useState<'True' | 'False'>('True');
  const [pic, setPic] = useState('');
  const [tid, setTid] = useState('');
  const [topicName, setTopicName] = useState('');
  const [allCl, setAllCl] = useState(true);
  const [cl, setCl] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(0);
  const [asking, setAsking] = useState(false);
  const started = useRef(false), qRef = useRef<HTMLTextAreaElement>(null), aRef = useRef<HTMLInputElement>(null), c0 = useRef<HTMLInputElement>(null), file = useRef<HTMLInputElement>(null);

  /* Fill the form once the address has been read: the question being edited, or the topic it was opened from. */
  useEffect(() => {
    if (!p || !ready || started.current) return;
    started.current = true;
    const e = editId ? data.qs.find((x) => x.id === editId) : undefined;
    if (e) {
      setKind(e.k); setQ(e.q); setA(e.k === 'choice' ? '' : e.a); setTid(e.t); setPic(e.pic ?? '');
      if (e.k === 'choice') { setCh([...(e.ch ?? []), '', '', '', ''].slice(0, 4)); setRi(e.ri ?? 0); }
      if (e.k === 'tf') setTf(/^f/i.test(e.a) ? 'False' : 'True');
      setAllCl(e.cl.length === 0); setCl(e.cl);
      return;
    }
    const t = p.get('t');
    setTid(t && data.topics.some((x) => x.id === t) ? t : data.topics[0]?.id ?? NEW);
  }, [p, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  /* A picture can be pasted straight in. */
  useEffect(() => {
    if (kind !== 'pic') return;
    const onPaste = (e: ClipboardEvent) => { const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); void take(f); } };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [kind]);

  const take = async (f: File | undefined) => {
    if (!f) return;
    try { setPic(await fileToPic(f)); setErr(''); } catch (x) { setErr((x as Error).message); }
  };

  const classes = allCl ? [] : cl;
  const topicFor = (): { d: typeof data; id: string } | string => {
    if (tid === NEW || !data.topics.some((t) => t.id === tid)) {
      if (!topicName.trim()) return 'Give the topic a name.';
      const r = addTopic(data, topicName); return { d: r.data, id: r.id };
    }
    return { d: data, id: tid };
  };
  const classCheck = () => (!allCl && cl.length === 0 ? 'Pick at least one class, or choose all of them.' : '');

  const submit = (again: boolean) => {
    setErr('');
    const bad = classCheck(); if (bad) return setErr(bad);
    const t = topicFor(); if (typeof t === 'string') return setErr(t);
    const text = q.trim(); if (!text) { qRef.current?.focus(); return setErr('Write the question first.'); }
    let answer = a.trim(), choices: string[] | undefined, right = 0;
    if (kind === 'tf') answer = tf;
    if (kind === 'choice') {
      const kept = ch.map((c, i) => ({ c: c.trim(), i })).filter((x) => x.c);
      if (kept.length < 2) return setErr('A multiple choice question needs at least two choices.');
      const at = kept.findIndex((x) => x.i === ri);
      if (at < 0) return setErr('Tick the right choice, and fill it in.');
      choices = kept.map((x) => x.c); right = at; answer = choices[at];
    }
    if (kind === 'pic' && !pic) return setErr('Add the picture first.');
    if (!answer) { aRef.current?.focus(); return setErr('Write the answer too.'); }
    const nq = makeQ({ id: editing?.id, t: t.id, k: kind, q: text, a: answer, ch: choices, ri: right, pic: kind === 'pic' ? pic : undefined, cl: classes, h: editing?.h });
    update(() => saveQ(t.d, nq));
    if (!again || editing) { router.push(`/questions/?t=${t.id}`); return; }
    setTid(t.id); setTopicName(''); setQ(''); setA(''); setCh(['', '', '', '']); setRi(0); setPic(''); setSaved((n) => n + 1);
    qRef.current?.focus();
  };

  const rows = parseList(text);
  const submitList = () => {
    setErr('');
    const bad = classCheck(); if (bad) return setErr(bad);
    const t = topicFor(); if (typeof t === 'string') return setErr(t);
    if (!rows.length) return setErr('Nothing to add yet. Put each question on its own line, then a | and the answer.');
    update(() => saveMany(t.d, rows.map((r) => makeQ({ t: t.id, k: r.k, q: r.q, a: r.a, cl: classes }))));
    router.push(`/questions/?t=${t.id}`);
  };

  const title = listMode ? 'Paste a list' : editing ? 'Edit question' : 'Add a question';
  const back = tid && tid !== NEW ? `/questions/?t=${tid}` : '/questions/';

  if (editId && ready && p && !editing) {
    return <Page active="questions"><main className="one" style={{ maxWidth: 760 }}><h1 className="h1 m">Question not found</h1><p>It may have been deleted on another computer.</p><div className="row"><Link href="/questions/" className="btn p big">Back to questions</Link></div></main></Page>;
  }

  const aside = (
    <div style={{ flex: '1 1 320px', padding: '24px 26px', background: 'var(--paper)', borderLeft: '3px solid #171717', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="fld"><span className="lab">Topic</span>
        <Sel label="Topic" value={tid || NEW} onChange={setTid}>
          {data.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          <option value={NEW}>New topic</option>
        </Sel>
        {(tid === NEW || !data.topics.length) && <input className="f" value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Topic name" aria-label="New topic name" maxLength={60} />}
      </div>
      {data.classes.length > 1 && (
        <div className="fld"><span className="lab">Classes</span>
          <Switch on={allCl} onChange={(v) => { setAllCl(v); if (!v && !cl.length) setCl(data.classes.map((c) => c.id)); }}>All my classes</Switch>
          {!allCl && data.classes.map((c) => {
            const on = cl.includes(c.id);
            return <button type="button" key={c.id} className="sw" style={{ color: '#171717' }} aria-pressed={on} onClick={() => setCl(on ? cl.filter((x) => x !== c.id) : [...cl, c.id])}><span className={on ? 'tick on' : 'tick'} aria-hidden="true" />{c.name}</button>;
          })}
        </div>
      )}
      <span className="hint">Do Now brings it back using the date you tap Taught today on the topic.</span>
    </div>
  );

  return (
    <Page active="questions">
      <main className="one">
        <div className="rowend">
          <h1 className="h1 m">{title}</h1>
          {coeOn && !editing && (
            <div className="row">
              <span className="hint">Need ideas? Coe suggests questions. You check them first.</span>
              <Link href={tid && tid !== NEW ? `/coe/?t=${tid}` : '/coe/'} className="btn g"><CoeMark />Ideas from Coe</Link>
            </div>
          )}
        </div>

        {saved > 0 && !editing && <div className="note" role="status">Saved. {saved > 1 ? `${saved} questions added.` : ''} Add the next one.</div>}
        {err && <div className="note bad" role="alert">{err}</div>}

        <form className="plate big" style={{ display: 'flex', flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); if (listMode) submitList(); else submit(true); }}>
          {listMode ? (
            <div style={{ flex: '999 1 560px', minWidth: 0, padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <label className="fld"><span className="lab">Your list</span>
                <textarea className="f" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={'What unit is force measured in? | Newtons (N)\nWhich gas do plants take in? | Carbon dioxide'} autoFocus /></label>
              <span className="hint">One question per line. Then a | (or a tab, if you paste from a spreadsheet), then the answer.</span>
              {text.trim() && <div className="note">{rows.length ? `${rows.length} question${rows.length === 1 ? '' : 's'} ready to add.` : 'No questions found yet.'}</div>}
            </div>
          ) : (
            <div style={{ flex: '999 1 560px', minWidth: 0, padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div><Seg label="Question type" value={kind} onChange={setKind} options={KINDS} /></div>
              <label className="fld"><span className="lab">Question</span>
                <textarea ref={qRef} className="f" rows={2} value={q} maxLength={400} autoFocus={!editing} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (kind === 'choice' ? c0.current : aRef.current)?.focus(); } }} /></label>

              {kind === 'choice' && (
                <div className="fld"><span className="lab">Choices. Tick the right one.</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
                    {ch.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button type="button" className={i === ri ? 'tick on' : 'tick'} aria-label={`Choice ${'ABCD'[i]} is the right answer`} aria-pressed={i === ri} onClick={() => setRi(i)} />
                        <input ref={i === 0 ? c0 : undefined} className="f" value={c} maxLength={160} aria-label={`Choice ${'ABCD'[i]}`} onChange={(e) => setCh(ch.map((x, j) => (j === i ? e.target.value : x)))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {kind === 'tf' && (
                <div className="fld"><span className="lab">Answer</span>
                  <Seg label="Answer" value={tf} onChange={setTf} options={[['True', 'True'], ['False', 'False']]} /></div>
              )}
              {kind === 'pic' && (
                <div className="fld"><span className="lab">Picture</span>
                  <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void take(e.dataTransfer.files[0]); }}
                    style={{ border: '3px dashed #171717', padding: 22, textAlign: 'center', background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {pic && <img src={pic} alt="The picture for this question" style={{ maxWidth: '100%', maxHeight: 220, border: '3px solid #171717' }} />}
                    <span>{pic ? 'Drop or paste another picture to replace it.' : 'Drop a picture or diagram here, or paste one.'}</span>
                    <div className="row" style={{ justifyContent: 'center' }}>
                      <button type="button" className="btn" onClick={() => file.current?.click()}>Choose a picture</button>
                      {pic && <button type="button" className="btn q" onClick={() => setPic('')}>Remove</button>}
                    </div>
                    <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ''; }} />
                  </div>
                </div>
              )}
              {(kind === 'short' || kind === 'pic') && (
                <label className="fld"><span className="lab">Answer</span>
                  <input ref={aRef} className="f" value={a} maxLength={400} onChange={(e) => setA(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(true); } }} /></label>
              )}
            </div>
          )}
          {aside}
        </form>

        <div className="row">
          {listMode ? (
            <button type="button" className="btn p big" onClick={submitList}>Add {rows.length ? `${rows.length} question${rows.length === 1 ? '' : 's'}` : 'the list'}</button>
          ) : editing ? (
            <>
              <button type="button" className="btn p big" onClick={() => submit(false)}>Save</button>
              <button type="button" className="btn" onClick={() => setAsking(true)}>Delete</button>
            </>
          ) : (
            <>
              <button type="button" className="btn p big" onClick={() => submit(true)}>Save and next</button>
              <button type="button" className="btn" onClick={() => submit(false)}>Save</button>
              <Link href={`/add/?list=1${tid && tid !== NEW ? `&t=${tid}` : ''}`} className="btn">Paste a list</Link>
            </>
          )}
          <Link href={back} className="btn q">Cancel</Link>
        </div>
        {asking && editing && (
          <div className="note" role="alert" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ flex: '1 1 300px' }}>Delete this question? This cannot be undone.</span>
            <button type="button" className="btn danger s" onClick={() => { update((d) => deleteQ(d, editing.id)); router.push(`/questions/?t=${editing.t}`); }}>Yes, delete</button>
            <button type="button" className="btn s" onClick={() => setAsking(false)}>Keep it</button>
          </div>
        )}
        {!listMode && !editing && <span className="hint">Enter in the answer saves and starts the next question. Topic and classes stay filled in.</span>}
      </main>
    </Page>
  );
}
