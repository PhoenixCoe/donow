'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Page } from '@/components/Page';
import { Seg, Sel, Switch } from '@/components/ui';
import { getSet } from '@/lib/ops';
import { eligible } from '@/lib/pick';
import { RACE_KEY, RACE_STATE, TEAMS, type Setup } from '@/lib/race';
import { useClass, useStore } from '@/lib/store';

const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** Class mode, set up in a few taps. */
export default function RaceSetup() {
  const { data } = useStore();
  const { cid, today } = useClass();
  const router = useRouter();
  const [teams, setTeams] = useState(4);
  const [rounds, setRounds] = useState(8);
  const [box, setBox] = useState(true);
  const [from, setFrom] = useState('today');

  const mine = data.qs.filter((q) => !cid || eligible(q, cid));
  const todays = new Set((cid ? getSet(data, cid, today)?.ids ?? [] : []).map((id) => data.qs.find((q) => q.id === id)?.t));
  const pool = mine.filter((q) => from === 'all' || (from === 'today' ? todays.size === 0 || todays.has(q.t) : q.t === from));
  const real = Math.min(rounds, pool.length);

  const start = () => {
    if (!pool.length) return;
    const s: Setup = { teams, rounds: real, box, ids: shuffle(pool).slice(0, real).map((q) => q.id) };
    try { sessionStorage.setItem(RACE_KEY, JSON.stringify(s)); sessionStorage.removeItem(RACE_STATE); } catch { /* storage blocked */ }
    router.push('/race/play/');
  };

  return (
    <Page active="race">
      <main className="wrap">
        <section className="col" style={{ flex: '999 1 560px' }}>
          <div><div className="lab" style={{ marginBottom: 10 }}>Class mode</div><h1 className="h1 m">Tower race</h1></div>

          <div className="plate big" style={{ padding: '26px 26px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="fld"><span className="lab">Teams</span>
              <Seg label="Teams" value={teams} onChange={setTeams} options={[[2, '2'], [3, '3'], [4, '4']]} />
              <div className="row" style={{ gap: 12, marginTop: 6 }}>
                {TEAMS.slice(0, teams).map((t) => <div className="tile" key={t.l}><b style={{ background: t.bg, color: t.fg }}>{t.l}</b><span>Team {t.l}</span></div>)}
              </div>
            </div>
            <div className="fld"><span className="lab">Rounds</span><Seg label="Rounds" value={rounds} onChange={setRounds} options={[[5, '5'], [8, '8'], [10, '10']]} /></div>
            <div className="fld"><span className="lab">Questions from</span>
              <Sel label="Questions from" value={from} onChange={setFrom}>
                <option value="today">Today&apos;s Do Now topics</option>
                {data.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                <option value="all">All my topics</option>
              </Sel>
              <span className="hint">{pool.length === 0 ? 'No questions there yet. Add some, or pick another topic.' : pool.length < rounds ? `${pool.length} question${pool.length === 1 ? '' : 's'} there, so the race will be ${pool.length} round${pool.length === 1 ? '' : 's'}.` : `${pool.length} questions to pick from.`}</span>
            </div>
            <Switch on={box} onChange={setBox}>Mystery boxes</Switch>
            <div className="row">
              <button type="button" className="btn p big" onClick={start} disabled={!pool.length}>Start the race</button>
              <Link href="/" className="btn q">Back</Link>
            </div>
          </div>
        </section>

        <aside className="col" style={{ flex: '1 1 360px' }}>
          <div className="plate">
            <div className="ph"><span>How it works</span></div>
            <div className="how"><i>1</i><span>A question shows on the board. Teams write the answer in their books.</span></div>
            <div className="how"><i>2</i><span>Press Show answer. Tap every team that got it right.</span></div>
            <div className="how"><i>3</i><span>Each of those teams adds a block to its tower.</span></div>
            <div className="how"><i>4</i><span>First to 10 blocks wins, or the tallest tower after the last round.</span></div>
          </div>
        </aside>
      </main>
    </Page>
  );
}
