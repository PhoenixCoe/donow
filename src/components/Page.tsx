'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ACCOUNTS, cloudOn } from '@/lib/cloud';
import { useStore } from '@/lib/store';

export type Tab = 'today' | 'questions' | 'cards' | 'race' | '';
const TABS: [Tab, string, string][] = [['today', '/', 'Today'], ['questions', '/questions/', 'Questions'], ['cards', '/flashcards/', 'Flashcards'], ['race', '/race/', 'Tower race']];

/** The logo: the PMC tile with a tick. The class marks its own work. */
export function Tile({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect x="6" y="6" width="58" height="58" fill="#1A4934" /><rect width="58" height="58" fill="#FBF6EC" /><rect x="3" y="3" width="52" height="52" fill="#337957" />
      <path d="M14 29 L24 39 L43 16" fill="none" stroke="#FBF6EC" strokeWidth="7" />
    </svg>
  );
}

interface PmcAcct { mount: (el: HTMLElement, get: () => unknown) => void; paint: (el: HTMLElement, img: string) => void }

/** The PMC account menu: the same file every PMC app uses. It opens from the picture button. */
function AccountMenu({ onOut }: { onOut: () => void }) {
  const { who } = useStore();
  const btn = useRef<HTMLButtonElement>(null);
  const live = useRef({ who, onOut });
  live.current = { who, onOut };
  useEffect(() => {
    let t: ReturnType<typeof setInterval> | undefined;
    const go = () => {
      const w = window as unknown as { PmcAccount?: PmcAcct };
      if (!w.PmcAccount || !btn.current) return false;
      if (!btn.current.classList.contains('pa-btn')) w.PmcAccount.mount(btn.current, () => ({
        user: { name: live.current.who?.name ?? '', email: live.current.who?.email ?? '', img: live.current.who?.image || undefined },
        manage: `${ACCOUNTS}/info/?from=donow`, addAccount: `${ACCOUNTS}/add/?from=donow`,
        onSignOut: () => live.current.onOut(),
      }));
      w.PmcAccount.paint(btn.current, live.current.who?.image ?? '');
      return true;
    };
    if (!go()) t = setInterval(() => { if (go()) clearInterval(t); }, 50);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { const w = window as unknown as { PmcAccount?: PmcAcct }; if (btn.current && w.PmcAccount) w.PmcAccount.paint(btn.current, who?.image ?? ''); }, [who?.image]);
  return <button type="button" ref={btn} className="me" aria-label="PMC account" />;
}

export function Nav({ active, add = true, bare = false }: { active: Tab; add?: boolean; bare?: boolean }) {
  const { who, signOut, ready } = useStore();
  const [err, setErr] = useState('');
  const out = async () => { if (!(await signOut())) setErr('Could not save your changes first. Check your connection and try again.'); else setErr(''); };
  return (
    <>
      <header className="nav">
        <Link href="/" className="logo"><Tile />Do Now</Link>
        {!bare && <nav className="tabs" aria-label="Pages">
          {TABS.map(([k, href, text]) => <Link key={k} href={href} className={k === active ? 'on' : ''} aria-current={k === active ? 'page' : undefined}>{text}</Link>)}
        </nav>}
        {!bare && add && <Link href="/add/" className="btn on-ink">Add question</Link>}
        {ready && who && <AccountMenu onOut={() => { void out(); }} />}
        {!bare && ready && !who && cloudOn && <Link href="/signin/" className="btn on-ink">Sign in</Link>}
      </header>
      {err && <div className="note bad" role="alert" style={{ margin: '16px 28px 0' }}>{err}</div>}
    </>
  );
}

export function Page({ active, add = true, bare = false, children }: { active: Tab; add?: boolean; bare?: boolean; children: ReactNode }) {
  const { ready, back } = useStore();
  return (
    <div className="pg">
      <Nav active={active} add={add} bare={bare} />
      {back === 'bad' && <div className="note bad" role="alert" style={{ margin: '16px 28px 0' }}>That sign in could not be finished. Please try again.</div>}
      {ready ? children : <main className="wrap"><p className="hint">Loading</p></main>}
    </div>
  );
}
