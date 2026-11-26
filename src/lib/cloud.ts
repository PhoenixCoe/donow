/**
 * Do Now signs in with a PMC ID (id.pmcstudios.uk), the same as Coe. The teacher is sent there, signs in, and comes back here.
 * This site never sees a password. With a sign in, the teacher's questions are kept in their own account (one row, only they can read it),
 * as well as on this device. Without one, everything stays on this device and works the same.
 * The address and the key below are meant to be public. What protects the data is the row rule in the database (supabase/donow.sql).
 */
export const ACCOUNTS = (process.env.NEXT_PUBLIC_ACCOUNTS_URL ?? 'https://id.pmcstudios.uk').trim().replace(/\/+$/, '');
const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
export const cloudOn = /^https?:\/\/[a-z0-9.:-]+$/i.test(URL_) && !!KEY && !/^__/.test(KEY) && !/^sb_secre[t]_/.test(KEY);

export interface Session { access: string; refresh: string; exp: number; email: string; uid: string }
export interface Who { name: string; email: string; image: string }
const SKEY = 'pmc:donow:session', WHO = 'pmc:donow:who', ASTATE = 'pmc:donow:astate', ANOTE = 'pmc:donow:anote', SEEN = 'pmc:donow:seen';
export const ACCOUNT_EVENT = 'pmc:donow:account';

const payload = (jwt: string): { sub?: string; email?: string; exp?: number } => {
  try { return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return {}; }
};
export function session(): Session | null { try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); return s && s.access && s.uid ? s : null; } catch { return null; } }
function keep(access: string, refresh: string): Session | null {
  const p = payload(access); if (!p.sub) return null;
  const s: Session = { access, refresh, exp: (p.exp ?? 0) * 1000, email: p.email ?? '', uid: p.sub };
  try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch { /* storage blocked */ }
  return s;
}
const okImg = (v: unknown): v is string => typeof v === 'string' && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 120000;
export function savedWho(): Who | null {
  try { const v = JSON.parse(localStorage.getItem(WHO) || 'null'); return v && typeof v.email === 'string' ? { name: String(v.name || '').slice(0, 40), email: v.email.slice(0, 254), image: okImg(v.image) ? v.image : '' } : null; } catch { return null; }
}
const changed = () => { try { window.dispatchEvent(new Event(ACCOUNT_EVENT)); } catch { /* no window */ } };

const b64u = (a: Uint8Array) => btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const same = (x: string, y: string) => { if (x.length !== y.length) return false; let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i); return d === 0; };
const head = (extra: Record<string, string> = {}, bearer = KEY) => ({ apikey: KEY, ...(bearer.startsWith('sb_') ? {} : { authorization: `Bearer ${bearer}` }), 'content-type': 'application/json', ...extra });
const fail = async (r: Response) => { let m = ''; try { const j = await r.json(); m = j.msg || j.message || j.error_description || (typeof j.error === 'string' ? j.error : ''); } catch { /* no body */ } return Object.assign(new Error(m || `Request failed (${r.status})`), { status: r.status }); };

/** Goes to PMC ID. A one-time value is made here and kept in this tab; the way back is only accepted if it brings the same value. */
export function startSignIn(where: 'signin' | 'create' = 'signin'): void {
  const a = new Uint8Array(24); crypto.getRandomValues(a);
  const st = b64u(a);
  try { sessionStorage.setItem(ASTATE, JSON.stringify({ st, at: Date.now(), from: location.pathname.startsWith('/signin') ? '/' : location.pathname + location.search })); }
  catch { throw new Error('This browser is blocking the storage Do Now needs to sign you in safely. Turn off private mode or allow site data, then try again.'); }
  location.assign(`${ACCOUNTS}/${where === 'create' ? 'create/name' : 'signin'}/?app=donow&state=${st}`);
}

/** Coming back from PMC ID the sign in is in the address. It is taken only if the one-time value matches, and the address is cleaned at once. Returns where to go next ('' = stay), or null if there was nothing to take. */
export async function takeReturn(): Promise<{ ok: boolean; from: string } | null> {
  if (!cloudOn || typeof location === 'undefined') return null;
  let h: URLSearchParams; try { h = new URLSearchParams(location.hash.replace(/^#/, '')); } catch { return null; }
  const st = h.get('pmc_state'); if (!st) return null;
  const a = h.get('access_token') || '', r = h.get('refresh_token') || '';
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ }
  let want: { st?: string; at?: number; from?: string } | null = null;
  try { want = JSON.parse(sessionStorage.getItem(ASTATE) || 'null'); sessionStorage.removeItem(ASTATE); } catch { /* ignore */ }
  const bad = () => { try { sessionStorage.setItem(ANOTE, 'bad'); } catch { /* ignore */ } return { ok: false, from: '' }; };
  if (!want || !want.st || !same(want.st, st) || Date.now() - (want.at ?? 0) > 15 * 60_000 || !a || !r) return bad();
  let na = a, nr = r;
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 5000);
    const x = await fetch(`${URL_}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: head(), body: JSON.stringify({ refresh_token: r }), signal: ctl.signal }).finally(() => clearTimeout(to));
    if (!x.ok) return bad();
    const j = await x.json(); na = j.access_token; nr = j.refresh_token;
  } catch { /* offline or slow: keep what arrived; it is swapped the first time it is refreshed */ }
  const s = keep(na, nr); if (!s) return bad();
  const from = want.from && /^\/(?![/\\])[A-Za-z0-9\-._~/?=&]{0,200}$/.test(want.from) ? want.from : '/';
  await learnWho(s).catch(() => { /* the name falls back to the start of the email */ });
  touchApp(s);
  changed();
  return { ok: true, from: from === '/' ? '' : from };
}
export function takeNote(): boolean { try { const v = sessionStorage.getItem(ANOTE); sessionStorage.removeItem(ANOTE); return v === 'bad'; } catch { return false; } }

/** A token that is still good, refreshed when it is nearly out of date. */
export async function token(): Promise<string | null> {
  const s = session(); if (!s) return null;
  if (s.exp - Date.now() > 60_000) return s.access;
  try {
    const r = await fetch(`${URL_}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: head(), body: JSON.stringify({ refresh_token: s.refresh }) });
    if (!r.ok) { if (r.status === 400 || r.status === 401) { try { localStorage.removeItem(SKEY); } catch { /* ignore */ } changed(); } return null; }
    const j = await r.json(); return keep(j.access_token, j.refresh_token)?.access ?? null;
  } catch { return s.exp > Date.now() ? s.access : null; }
}
async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  const t = await token(); if (!t) throw Object.assign(new Error('Not signed in.'), { status: 401 });
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...head({}, t), ...(init.headers as Record<string, string> | undefined) }, signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw await fail(r);
    return r;
  } finally { clearTimeout(to); }
}

/** The name and picture PMC ID keeps, to show who is signed in. */
async function learnWho(s: Session) {
  let name = '', image = '';
  try {
    const rows = await (await rest('profiles?select=data')).json();
    const d = Array.isArray(rows) && rows[0]?.data ? rows[0].data : {};
    name = d.about && typeof d.about.name === 'string' ? d.about.name.trim().slice(0, 30) : '';
    image = d.avatar && okImg(d.avatar.img) ? d.avatar.img : '';
  } catch { /* keep the email */ }
  try { localStorage.setItem(WHO, JSON.stringify({ name: name || s.email.split('@')[0].slice(0, 30), email: s.email, image })); } catch { /* storage blocked */ }
}
/** Lets the PMC ID page list Do Now among the sites this account has used: a site name and a time, nothing else. */
function touchApp(s: Session) {
  try {
    const last = JSON.parse(localStorage.getItem(SEEN) || 'null'), H = 3600_000;
    if (last && last.u === s.uid && Date.now() - last.t < 6 * H) return;
    localStorage.setItem(SEEN, JSON.stringify({ u: s.uid, t: Date.now() }));
    void rest('app_access?on_conflict=user_id,app', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: s.uid, app: 'donow', label: 'Do Now', pmc: true, last_at: new Date().toISOString() }) }).catch(() => { /* tried again next time */ });
  } catch { /* nothing */ }
}
/** Brings the name and picture up to date while signed in (the person may have changed them on PMC ID). */
export async function refreshWho(): Promise<void> { const s = session(); if (s) { await learnWho(s); changed(); } }

/** What the account holds: the teacher's data and when it was last changed. Null when nothing is saved yet. */
export async function pull(): Promise<{ data: unknown; updated: number } | null> {
  const rows = await (await rest('donow?select=data,updated')).json();
  return Array.isArray(rows) && rows[0] ? { data: rows[0].data, updated: Date.parse(rows[0].updated) || 0 } : null;
}
export async function push(data: unknown): Promise<void> {
  const s = session(); if (!s) throw Object.assign(new Error('Not signed in.'), { status: 401 });
  await rest('donow?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: s.uid, data, updated: new Date().toISOString() }) });
}

/** Signs out of this device only: the sign in goes, and so does the name and picture. */
export function signOutHere(): void {
  const s = session();
  try { localStorage.removeItem(SKEY); localStorage.removeItem(WHO); localStorage.removeItem(SEEN); } catch { /* ignore */ }
  if (s && cloudOn) void fetch(`${URL_}/auth/v1/logout?scope=local`, { method: 'POST', headers: head({}, s.access) }).catch(() => { /* it runs out by itself */ });
  changed();
}
