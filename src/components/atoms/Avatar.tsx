import type { Person } from "@/lib/plan";
import { initials, personColor } from "../tokens";

export function Avatar({ person, size = 20, ring = "#fff" }: { person: Pick<Person, "id" | "name">; size?: number; ring?: string }) {
  const [bg, fg] = personColor(person.id);
  return (
    <span title={person.name} className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.45, boxShadow: `0 0 0 2px ${ring}` }}>
      {initials(person.name)}
    </span>
  );
}
