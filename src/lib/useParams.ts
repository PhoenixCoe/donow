'use client';
import { useEffect, useState } from 'react';

/** The ?name=value part of the address. It is null until the page has loaded in the browser. */
export function useParams(): URLSearchParams | null {
  const [p, setP] = useState<URLSearchParams | null>(null);
  useEffect(() => { setP(new URLSearchParams(location.search)); }, []);
  return p;
}
