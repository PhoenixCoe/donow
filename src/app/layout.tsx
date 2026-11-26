import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import './app.css';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Do Now',
  description: 'Start-of-lesson recall questions for the classroom screen.',
  referrer: 'no-referrer',
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { themeColor: '#171717', viewportFit: 'cover' };

/* A content security policy for the page: it can only load its own files, and talk to its own address, Supabase and the Coe server. Next.js needs inline scripts. */
const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const COE = (process.env.NEXT_PUBLIC_COE_SERVER ?? '').trim().replace(/\/+$/, '');
const CSP = `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ${/^https?:\/\/[a-z0-9.:-]+$/i.test(SB) ? SB : ''} ${/^https:\/\/[a-z0-9.-]+$/i.test(COE) ? COE : ''}; base-uri 'none'; form-action 'self'; object-src 'none'`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head><meta httpEquiv="Content-Security-Policy" content={CSP} /></head>
      <body>
        <StoreProvider><div id="app">{children}</div></StoreProvider>
        <Script src="/js/pmc-account.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
