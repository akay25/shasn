// A face-up voter card on the HQ Mat, showing voter count and cost coins.
import type { Resource, VoterCard } from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { ResourceCoin } from "./ResourceTrack";

interface Props {
  card: VoterCard | null;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}

export default function VoterCardTile({ card, onClick, disabled, label }: Props) {
  if (!card) {
    return (
      <div className="rounded-md border border-dashed border-neutral-700 bg-neutral-900/40 p-2 text-center text-xs text-neutral-500 h-24 flex items-center justify-center">
        (empty)
      </div>
    );
  }
  const costEntries: { key: string; resource: Resource | null; n: number }[] = [];
  for (const r of RESOURCES) {
    const n = card.cost[r] ?? 0;
    if (n > 0) costEntries.push({ key: r, resource: r, n });
  }
  if (card.cost.any) {
    costEntries.push({ key: "any", resource: null, n: card.cost.any });
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group rounded-md border border-neutral-600 bg-neutral-800 p-2 text-left h-24 flex flex-col justify-between hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold leading-none">{card.voters}</div>
        <div className="text-[10px] uppercase tracking-wide text-neutral-400">
          voter{card.voters > 1 ? "s" : ""}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-xs">
        {costEntries.map((c) => (
          <span key={c.key} className="font-bold inline-flex items-center gap-0.5">
            {c.n}
            {c.resource ? (
              <ResourceCoin resource={c.resource} size="xs" />
            ) : (
              <span className="text-neutral-300">?</span>
            )}
          </span>
        ))}
      </div>
      {label ? (
        <div className="text-[10px] text-neutral-400 truncate">{label}</div>
      ) : null}
    </button>
  );
}
