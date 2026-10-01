import { lateBy, fmtDay, type Item, type Plan } from "@/lib/plan";
import type { Axis } from "@/lib/axis";
import { Diamond } from "../atoms/Diamond";

export const weekendBg = (px: number) => ({
  backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${5 * px}px, var(--weekend) ${5 * px}px ${7 * px}px)`,
});

const msLate = (m: Item, items: Item[], plan: Plan) => items.some((i) => i.target_id === m.id && lateBy(i, plan.spans.get(i.id), items) > 0);

/** En-tête de l'échelle : mois, semaines ou jours, pastille d'aujourd'hui, jalons. */
export function AxisHeader({ ax, milestones, items, plan }: { ax: Axis; milestones: Item[]; items: Item[]; plan: Plan }) {
  const dated = milestones.filter((m) => m.milestone_date);
  const lane = dated.length ? 22 : 0; // ligne dédiée aux jalons, pour ne pas masquer les mois
  return (
    <div className="relative shrink-0 text-[11px] text-stone-500" style={{ width: ax.width, height: 56 + lane }}>
      {ax.months.map((m) => (
        <div key={m.left} className="absolute h-7 whitespace-nowrap border-l border-stone-200/70 pl-2 font-medium capitalize leading-7 text-stone-600" style={{ left: m.left, top: lane }}>
          {m.label}
        </div>
      ))}
      {ax.ticks.map((t) => (
        <div key={t.left} className="absolute h-7 whitespace-nowrap border-l border-stone-100 leading-7" style={{ left: t.left, top: 28 + lane, width: t.width, paddingLeft: ax.px >= 12 ? 6 : 3 }}>
          {t.sub && <span className="text-stone-400">{t.sub}</span>} {t.label}
        </div>
      ))}
      <div className="absolute flex h-[18px] min-w-[18px] -translate-x-1/2 items-center justify-center rounded-full bg-accent-solid px-1 text-[11px] font-medium text-white"
        style={{ left: (ax.today - ax.from) * ax.px + ax.px / 2, top: 33 + lane }} title="Aujourd'hui">
        {new Date(ax.today * 86_400_000).getUTCDate()}
      </div>
      {dated.map((m) => {
        const late = msLate(m, items, plan);
        return (
          <div key={m.id} title={`${m.title} · ${fmtDay(m.milestone_date!)}`}
            className={`absolute top-1 flex h-[18px] items-center gap-1 whitespace-nowrap rounded-[5px] pl-1 pr-1.5 text-[11px] font-medium transition-[left,background-color,color] duration-300 ease-out-quint ${late ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-700"}`}
            style={{ left: ax.x(m.milestone_date!) + ax.px / 2 - 6 }}>
            <Diamond late={late} />{m.title}
          </div>
        );
      })}
    </div>
  );
}

/** Lignes verticales : aujourd'hui + jalons, sur toute la hauteur. */
export function AxisLines({ ax, milestones, left, items, plan }: { ax: Axis; milestones: Item[]; left: number; items: Item[]; plan: Plan }) {
  return (
    <>
      <div className="pointer-events-none absolute bottom-0 top-0 z-[1] w-px bg-accent-500/70" style={{ left: left + (ax.today - ax.from) * ax.px + ax.px / 2 }} />
      {milestones.filter((m) => m.milestone_date).map((m) => (
        <div key={m.id} className={`pointer-events-none absolute bottom-0 top-0 z-[1] border-l border-dashed transition-[left,border-color] duration-300 ease-out-quint ${msLate(m, items, plan) ? "border-red-400" : "border-stone-300"}`}
          style={{ left: left + ax.x(m.milestone_date!) + ax.px / 2 }} />
      ))}
    </>
  );
}
