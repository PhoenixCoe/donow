'use client';
import type { ReactNode } from 'react';
import { useStore } from '@/lib/store';

const COE_PATH = 'M786.886 22.9033C790.107 14.1976 802.421 14.1978 805.643 22.9033L825.213 75.79C875.855 212.649 983.761 320.556 1120.62 371.198L1173.51 390.768C1182.21 393.989 1182.21 406.304 1173.51 409.525L1120.62 429.095C983.761 479.737 875.855 587.643 825.213 724.503L805.643 777.39C802.421 786.095 790.107 786.095 786.886 777.39L767.316 724.503C716.674 587.643 608.768 479.737 471.908 429.095L419.021 409.525C410.316 406.304 410.316 393.989 419.021 390.768L471.908 371.198C608.768 320.556 716.674 212.65 767.316 75.79L786.886 22.9033ZM796.265 272.595C726.494 272.595 669.934 329.155 669.934 398.926C669.934 468.696 726.494 525.257 796.265 525.257C866.035 525.257 922.595 468.696 922.596 398.926C922.596 329.155 866.035 272.595 796.265 272.595Z';
export function CoeMark({ fill = 'currentColor', style }: { fill?: string; style?: React.CSSProperties }) {
  return <svg className="coe-s" viewBox="760 0 440 799" aria-hidden="true" style={style}><path fill={fill} fillRule="evenodd" clipRule="evenodd" d={COE_PATH} /></svg>;
}

/** A pick-one bar. The chosen one is filled. */
export function Seg<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => <button key={String(v)} type="button" className={v === value ? 'on' : ''} aria-pressed={v === value} onClick={() => onChange(v)}>{text}</button>)}
    </div>
  );
}

/** A dropdown with the PMC arrow. */
export function Sel({ value, onChange, children, label, width }: { value: string; onChange: (v: string) => void; children: ReactNode; label: string; width?: number }) {
  return (
    <span className="sel" style={width ? { width } : undefined}>
      <select className="f" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    </span>
  );
}

export function Switch({ on, onChange, children, color = '#171717' }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode; color?: string }) {
  return <button type="button" className={on ? 'sw on' : 'sw'} aria-pressed={on} onClick={() => onChange(!on)} style={{ color }}><b />{children}</button>;
}

/** Where the teacher's questions are kept, in words. */
export function SyncChip() {
  const { sync, who } = useStore();
  if (!who) return <span className="chip none">On this device only</span>;
  if (sync === 'saving') return <span className="chip">Saving</span>;
  if (sync === 'offline') return <span className="chip gold">Saved on this device</span>;
  return <span className="chip">Saved to your account</span>;
}
