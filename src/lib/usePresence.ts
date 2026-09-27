import { useEffect, useState } from "react";

/**
 * Garde la dernière valeur non nulle affichée pendant `ms` après sa disparition,
 * pour laisser jouer l'animation de sortie. `value` doit être stable d'un rendu à l'autre.
 * Renvoie [valeur à afficher, en train de sortir].
 */
export function usePresence<T>(value: T | null | undefined, ms = 200): [T | null, boolean] {
  const [last, setLast] = useState<T | null>(value ?? null);
  if (value && value !== last) setLast(value);
  useEffect(() => {
    if (value || !last) return;
    const t = setTimeout(() => setLast(null), ms);
    return () => clearTimeout(t);
  }, [value, last, ms]);
  return [value ?? last, !value && !!last];
}
