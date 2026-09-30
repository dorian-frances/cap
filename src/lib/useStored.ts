"use client";

import { useEffect, useState } from "react";

/** useState mémorisé dans le localStorage de ce navigateur (préférences d'affichage). */
export function useStored<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => { try { const s = localStorage.getItem(key); return s === null ? initial : JSON.parse(s); } catch { return initial; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV] as const;
}
