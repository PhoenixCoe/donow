'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Page } from '@/components/Page';
import { Seg } from '@/components/ui';
import { DAYS, weekday } from '@/lib/dates';
import { addClass, removeClass, renameClass, setLesson, setMins } from '@/lib/ops';
import { useStore } from '@/lib/store';
import { short } from '@/lib/types';

const PERIODS = [0, 1, 2, 3, 4];

/** The week, set once. Tapping a lesson goes to the next class, then Free. */
export default function Timetable() {
  const { data, update } = useStore();
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState('');
  const [rn, setRn] = useState('');
  const [del, setDel] = useState('');
  const today = weekday(new Date());

  const idx = (id: string) => data.classes.findIndex((c) => c.id === id);
  const label = (id: string) => {
    const c = data.classes.find((x) => x.id === id); if (!c) return 'Free';
    const s = short(c);
    return data.classes.filter((x) => short(x) === s).length > 1 ? c.name : s;
  };
  const cycle = (p: number, d: number) => {
    const order = ['', ...data.classes.map((c) => c.id)], at = Math.max(0, order.indexOf(data.tt[p][d]));
    update((x) => setLesson(x, p, d, order[(at + 1) % order.length]));
  };
  const cls = (id: string) => (id && idx(id) >= 0 ? `c${(idx(id) % 4) + 1}` : 'c0');
  const create = () => { if (!name.trim()) return; update((x) => addClass(x, name).data); setName(''); setAdding(false); };

  return (
    <Page active="today">
      <main className="wrap">
        <section className="col" style={{ flex: '999 1 660px' }}>
          <div>
            <div className="lab" style={{ marginBottom: 10 }}>Set it once</div>
            <h1 className="h1 m">Timetable</h1>
            <p style={{ margin: '14px 0 0', maxWidth: '60ch' }}>{data.classes.length ? 'Tap a lesson to change its class. Today opens on the right class by itself.' : 'Add your classes first, then tap each lesson to pick its class.'}</p>
          </div>

          <div className="plate big">
            <div className="tt" role="grid" aria-label="Weekly timetable">
              <div className="th" style={{ borderBottom: '3px solid #171717' }} />
              {DAYS.slice(0, 5).map((d, i) => <div key={d} className={i === today ? 'th now' : 'th'}>{d.slice(0, 3)}</div>)}
              {PERIODS.map((p) => [
                <div key={`p${p}`} className="tp2">Period {p + 1}</div>,
                ...DAYS.slice(0, 5).map((d, i) => {
                  const id = data.tt[p][i];
                  return <button type="button" key={`${p}-${i}`} className={`tc ${cls(id)}`} aria-label={`${d} period ${p + 1}: ${label(id)}`} onClick={() => cycle(p, i)}>{label(id)}</button>;
                }),
              ])}
            </div>
            <div className="pf">
              <Link href="/" className="btn p big">Done</Link>
              <span className="hint">Saved as you go.</span>
            </div>
          </div>
        </section>

        <aside className="col" style={{ flex: '1 1 320px' }}>
          <div className="plate">
            <div className="ph"><span>My classes</span></div>
            {data.classes.map((c) => (
              <div key={c.id}>
                <div className="qr" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                  {edit === c.id ? (
                    <form className="row" onSubmit={(e) => { e.preventDefault(); if (rn.trim()) { update((x) => renameClass(x, c.id, rn)); setEdit(''); } }}>
                      <input className="f" style={{ flex: '1 1 140px', minHeight: 44 }} value={rn} onChange={(e) => setRn(e.target.value)} aria-label="Class name" maxLength={40} autoFocus />
                      <button type="submit" className="btn s p" disabled={!rn.trim()}>Save</button>
                      <button type="button" className="btn s q" onClick={() => setEdit('')}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
                        <span className={`chip ${['', 'gold', 'ink', 'bad'][idx(c.id) % 4]}`}>{short(c)}</span>
                        <span className="tx" style={{ overflowWrap: 'anywhere', minWidth: 0 }}>{c.name.trim().split(/\s+/).slice(1).join(' ')}</span>
                      </div>
                      <div className="row" style={{ gap: 10 }}>
                        <button type="button" className="btn s" onClick={() => { setEdit(c.id); setRn(c.name); setDel(''); }}>Rename</button>
                        <button type="button" className="btn s q" onClick={() => setDel(c.id)}>Remove</button>
                      </div>
                    </>
                  )}
                </div>
                {del === c.id && (
                  <div className="note" role="alert" style={{ margin: '0 20px 14px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ flex: '1 1 200px' }}>Remove {c.name}? Its lessons and results go too.</span>
                    <button type="button" className="btn danger s" onClick={() => { update((x) => removeClass(x, c.id)); setDel(''); }}>Yes, remove</button>
                    <button type="button" className="btn s" onClick={() => setDel('')}>Keep it</button>
                  </div>
                )}
              </div>
            ))}
            {!data.classes.length && <div className="empty hint">No classes yet.</div>}
            <div className="pf" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              {adding ? (
                <form className="row" onSubmit={(e) => { e.preventDefault(); create(); }}>
                  <input className="f" style={{ flex: '1 1 160px' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="9X3 Science" aria-label="New class name" maxLength={40} autoFocus />
                  <button type="submit" className="btn p s" disabled={!name.trim()}>Add</button>
                  <button type="button" className="btn q s" onClick={() => { setAdding(false); setName(''); }}>Cancel</button>
                </form>
              ) : <div><button type="button" className="btn" onClick={() => setAdding(true)}>Add a class</button></div>}
            </div>
          </div>

          <div className="plate">
            <div className="ph"><span>Do Now timer</span></div>
            <div className="qr" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <Seg label="Minutes for a Do Now" value={data.mins} onChange={(m) => update((x) => setMins(x, m))} options={[[3, '3'], [5, '5'], [8, '8'], [10, '10']]} />
              <span className="hint">Minutes on the board for each Do Now.</span>
            </div>
          </div>
        </aside>
      </main>
    </Page>
  );
}
