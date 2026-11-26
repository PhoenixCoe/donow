'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Page } from '@/components/Page';
import { cloudOn, startSignIn } from '@/lib/cloud';
import { useStore } from '@/lib/store';

/** Teachers sign in with a PMC ID. The sign in itself happens on the PMC ID site. */
export default function SignIn() {
  const { who, ready } = useStore();
  const router = useRouter();
  const [err, setErr] = useState('');
  useEffect(() => { if (ready && who) router.replace('/'); }, [ready, who, router]);

  const go = (where: 'signin' | 'create') => { try { setErr(''); startSignIn(where); } catch (e) { setErr((e as Error).message); } };

  return (
    <Page active="" bare>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '33px 23px 52px' }}>
        <div className="sg">
          <div className="sl"><h1 className="h1" style={{ fontSize: 62, maxWidth: '6ch' }}>Sign in</h1></div>
          <div className="sx">
            <h2>Teachers sign in with PMC ID</h2>
            <p>Your questions are saved to your account, so they are there on any classroom computer.</p>
            {err && <div className="note bad" role="alert">{err}</div>}
            {cloudOn ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
                <button type="button" className="btn p big" onClick={() => go('signin')}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/img/logo-id.svg" alt="" />Sign in with PMC ID</button>
                <span className="hint">No PMC ID yet? <button type="button" className="lnk" onClick={() => go('create')}>Create one</button></span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
                <p>Signing in is not available right now. Do Now still works, and keeps your questions on this computer.</p>
                <Link href="/" className="btn p big">Back to Today</Link>
              </div>
            )}
            <span className="hint" style={{ borderTop: '3px solid #171717', paddingTop: 16 }}>Students do not need to sign in. They only look at the board.</span>
          </div>
        </div>
      </main>
    </Page>
  );
}
