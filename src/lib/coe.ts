import { cloudOn, token } from './cloud';

/** Ideas from Coe: the teacher's own PMC ID is used, so it counts against their own Coe tokens for the day. Nothing is saved until the teacher presses Add. */
export const COE_SERVER = (process.env.NEXT_PUBLIC_COE_SERVER ?? '').trim().replace(/\/+$/, '');
export const coeOn = cloudOn && /^https:\/\/[a-z0-9.-]+$/i.test(COE_SERVER);

export interface Idea { q: string; a: string }

const SYSTEM = 'You write short recall questions for the first five minutes of a school lesson in England. Each question has one clear, correct, short answer that a student can write in their book. Keep questions plain and fair. No multiple choice. No trick questions. Reply with only a JSON array and no other words.';

export async function getIdeas(o: { topic: string; year: string; n: number; missed?: string; have: string[] }): Promise<Idea[]> {
  const t = await token();
  if (!t) throw new Error('Sign in with your PMC ID to get ideas.');
  const lines = [
    `Topic: ${o.topic.slice(0, 80)}`,
    `Year group: ${o.year}`,
    `Number of questions: ${o.n}`,
    o.missed ? `The class found this hard, so include one different question that checks the same idea: "${o.missed.slice(0, 200)}"` : '',
    o.have.length ? `Do not repeat these questions:\n${o.have.slice(0, 25).map((h) => '- ' + h.slice(0, 120)).join('\n')}` : '',
    'Reply like this: [{"q":"the question","a":"the answer"}]',
  ].filter(Boolean).join('\n');
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 70_000);
  let r: Response;
  try {
    r = await fetch(COE_SERVER + '/', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify({ model: 'core', max_tokens: 1500, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: lines }] }), signal: ctl.signal });
  } catch { clearTimeout(to); throw new Error('Could not reach Coe. Check your connection and try again.'); }
  if (!r.ok) {
    clearTimeout(to);
    let m = ''; try { const j = await r.json(); m = j?.error?.message || ''; } catch { /* no message */ }
    throw new Error(m || 'Coe could not answer just now. Try again in a moment.');
  }
  let text = '';
  try {
    const rd = r.body!.getReader(), dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n'); buf = parts.pop() ?? '';
      for (const ln of parts) {
        if (!ln.startsWith('data:')) continue;
        const d = ln.slice(5).trim(); if (!d || d === '[DONE]') continue;
        try { const j = JSON.parse(d); const c = j?.choices?.[0]?.delta?.content; if (typeof c === 'string') text += c; } catch { /* a note that is not text */ }
      }
    }
  } catch { throw new Error('Coe stopped part way. Try again.'); } finally { clearTimeout(to); }
  const a = text.indexOf('['), b = text.lastIndexOf(']');
  let arr: unknown = null;
  if (a >= 0 && b > a) { try { arr = JSON.parse(text.slice(a, b + 1)); } catch { /* not JSON */ } }
  const out = (Array.isArray(arr) ? arr : []).map((x) => ({ q: String((x as Idea)?.q ?? '').trim().slice(0, 300), a: String((x as Idea)?.a ?? '').trim().slice(0, 300) })).filter((x) => x.q && x.a).slice(0, o.n);
  if (!out.length) throw new Error('Coe did not give usable questions. Try again.');
  return out;
}
