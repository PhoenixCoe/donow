'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { clean, emptyData, merge, type Data } from './types';
import { ACCOUNT_EVENT, cloudOn, pull, push, refreshWho, savedWho, session, signOutHere, takeReturn, type Who } from './cloud';
import { autoClass } from './ops';
import { iso } from './dates';

const LKEY = 'pmc:donow:data', OWNER = 'pmc:donow:owner', LAST = 'pmc:donow:last', PICK = 'pmc:donow:pick';
export type SyncState = 'off' | 'saving' | 'saved' | 'offline';

interface Store {
  data: Data; ready: boolean; who: Who | null; sync: SyncState;
  update: (fn: (d: Data) => Data) => void;
  signOut: () => Promise<boolean>;
  back: 'ok' | 'bad' | '';
}
const Ctx = createContext<Store | null>(null);
export const useStore = (): Store => { const s = useContext(Ctx); if (!s) throw new Error('No store'); return s; };

const norm = (d: Data) => JSON.stringify(clean(d));
const readLocal = (): Data => { try { return clean(JSON.parse(localStorage.getItem(LKEY) || 'null')); } catch { return emptyData(); } };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(emptyData);
  const [ready, setReady] = useState(false);
  const [who, setWho] = useState<Who | null>(null);
  const [sync, setSync] = useState<SyncState>('off');
  const [back, setBack] = useState<'ok' | 'bad' | ''>('');
  const ref = useRef<Data>(data), dirty = useRef(false), busy = useRef(false), again = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const apply = useCallback((d: Data) => {
    ref.current = d; setData(d);
    try { localStorage.setItem(LKEY, JSON.stringify(d)); } catch { /* storage blocked: it still works until the tab closes */ }
  }, []);

  /** Brings this device and the account to the same copy, and keeps it that way. */
  const doSync = useCallback(async (): Promise<boolean> => {
    const s = session();
    if (!cloudOn || !s) { setSync('off'); return true; }
    if (busy.current) { again.current = true; return true; }
    busy.current = true; setSync('saving');
    try {
      let own = ''; try { own = localStorage.getItem(OWNER) || ''; } catch { /* ignore */ }
      if (own && own !== s.uid) apply(emptyData());   // what is on this device belongs to someone else
      const remote = await pull();
      const cur = ref.current;
      if (remote) {
        const rd = clean(remote.data), merged = merge(cur, rd);
        if (norm(merged) !== norm(cur)) apply(merged);
        if (norm(merged) !== norm(rd)) await push(merged);
      } else if (cur.at > 0) await push(cur);
      try { localStorage.setItem(OWNER, s.uid); } catch { /* ignore */ }
      dirty.current = false; setSync('saved');
      return true;
    } catch {
      setSync('offline');
      return false;
    } finally {
      busy.current = false;
      if (again.current) { again.current = false; void doSync(); }
    }
  }, [apply]);

  const schedule = useCallback(() => {
    if (!cloudOn || !session()) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { void doSync(); }, 1500);
  }, [doSync]);

  const update = useCallback((fn: (d: Data) => Data) => {
    const next = fn(ref.current);
    if (next === ref.current) return;
    next.at = Date.now();
    apply(next); dirty.current = true; schedule();
  }, [apply, schedule]);

  useEffect(() => {
    apply(readLocal());
    setWho(savedWho()); setReady(true);
    let dead = false;
    void (async () => {
      const r = await takeReturn().catch(() => null);
      if (dead) return;
      if (r) { setBack(r.ok ? 'ok' : 'bad'); if (r.ok && r.from) { location.replace(r.from); return; } }
      setWho(savedWho());
      if (session()) { void refreshWho().catch(() => { /* keeps the saved name */ }); void doSync(); }
    })();
    const onAcc = () => { setWho(savedWho()); if (session()) void doSync(); else setSync('off'); };
    const onOnline = () => { if (session()) void doSync(); };
    const onHide = () => { if (document.visibilityState === 'hidden' && dirty.current) void doSync(); };
    const onStore = (e: StorageEvent) => { if (e.key === LKEY) { const d = readLocal(); if (d.at > ref.current.at) { ref.current = d; setData(d); } } };
    const tick = setInterval(() => { if (dirty.current && session()) void doSync(); }, 60_000);
    window.addEventListener(ACCOUNT_EVENT, onAcc); window.addEventListener('online', onOnline); document.addEventListener('visibilitychange', onHide); window.addEventListener('storage', onStore);
    return () => { dead = true; clearInterval(tick); window.removeEventListener(ACCOUNT_EVENT, onAcc); window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('storage', onStore); };
  }, [apply, doSync]);

  /** Signing out keeps nothing of the account on this computer, so the next teacher starts clean. It saves first, and stops if that cannot be done. */
  const signOut = useCallback(async () => {
    if (session() && !(await doSync())) return false;
    signOutHere();
    try { localStorage.removeItem(OWNER); localStorage.removeItem(LKEY); sessionStorage.removeItem(PICK); } catch { /* ignore */ }
    ref.current = emptyData(); setData(ref.current); setWho(null); setSync('off');
    return true;
  }, [doSync]);

  const value = useMemo(() => ({ data, ready, who, sync, update, signOut, back }), [data, ready, who, sync, update, signOut, back]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The class the screen is about: the one picked, else the next lesson on the timetable that has not had its Do Now yet. */
export function useClass() {
  const { data, ready } = useStore();
  const [now] = useState(() => new Date());
  const today = iso(now);
  const [pick, setPick] = useState('');
  const ok = (c: string) => !!c && data.classes.some((x) => x.id === c);
  const last = (() => { try { return localStorage.getItem(LAST) || ''; } catch { return ''; } })();
  const auto = ready ? autoClass(data, today, now, last) : '';
  const cid = ok(pick) ? pick : auto;
  useEffect(() => {
    if (!ready) return;
    try { const v = JSON.parse(sessionStorage.getItem(PICK) || 'null'); if (v && v.d === today && ok(v.c)) { setPick(v.c); return; } } catch { /* nothing stored */ }
    if (auto) { try { sessionStorage.setItem(PICK, JSON.stringify({ d: today, c: auto })); } catch { /* ignore */ } setPick(auto); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const choose = useCallback((c: string) => {
    setPick(c);
    try { sessionStorage.setItem(PICK, JSON.stringify({ d: today, c })); localStorage.setItem(LAST, c); } catch { /* ignore */ }
  }, [today]);
  /** Called when a Do Now is finished, so Today opens on the next lesson by itself. */
  const release = useCallback(() => { try { sessionStorage.removeItem(PICK); } catch { /* ignore */ } setPick(''); }, []);
  return { cid, choose, release, now, today };
}
