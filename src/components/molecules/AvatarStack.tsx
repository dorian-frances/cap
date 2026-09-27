import type { Person } from "@/lib/plan";
import { Avatar } from "../atoms/Avatar";

/** Avatars superposés, avec « +n » au-delà de `max`. */
export function AvatarStack({ people, max = 3, ring, size = 20, faded }: { people: Person[]; max?: number; ring?: string; size?: number; faded?: boolean }) {
  return (
    <span className={`flex items-center ${faded ? "opacity-60" : ""}`}>
      {people.slice(0, max).map((p, i) => (
        <span key={p.id} style={{ marginLeft: i ? -5 : 0 }}><Avatar person={p} ring={ring} size={size} /></span>
      ))}
      {people.length > max && <span className="ml-0.5 text-[11px] text-stone-400">+{people.length - max}</span>}
    </span>
  );
}
