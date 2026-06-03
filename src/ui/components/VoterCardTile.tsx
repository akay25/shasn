// A face-up voter card on the HQ Mat, styled to resemble a real SHASN voter
// card: a black, portrait rectangle with a diamond-lattice texture, the cost
// resources as coloured coins down the left edge, and the voter count rendered
// as a single large numeral. Hovering reveals a popover with the full cost
// breakdown (count + coin + resource name) above the card.
import type { Resource, VoterCard } from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { ResourceCoin, RESOURCE_LABEL } from "./ResourceTrack";

interface Props {
  card: VoterCard | null;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}

// Subtle argyle / diamond lattice, matching the printed-card texture.
const LATTICE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Cpath d='M0 11 L11 0 L22 11 L11 22 Z' fill='none' stroke='%23ffffff' stroke-opacity='0.07'/%3E%3C/svg%3E\")";

export default function VoterCardTile({ card, onClick, disabled, label }: Props) {
  if (!card) {
    return (
      <div className="aspect-[2/3] rounded-lg border border-dashed border-neutral-700 bg-neutral-900/40 flex items-center justify-center text-xs text-neutral-500">
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
    // Wrapper carries the aspect ratio so the hover popover can escape the
    // button's own `overflow-hidden`.
    <div className="group relative aspect-[2/3] w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={label}
        className="absolute inset-0 overflow-hidden rounded-lg border-2 border-white bg-black p-1.5 text-left shadow-lg transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundImage: LATTICE, backgroundColor: "#0b0b0d" }}
      >
        {/* thin light inner frame, like the printed card border */}
        <div className="absolute inset-1 rounded-md border border-white/25" />

        <div className="relative flex h-full w-full items-stretch">
          {/* cost coins down the left edge */}
          <div className="flex flex-col justify-start gap-1 pl-0.5 pt-0.5">
            {costEntries.map((c) => (
              <span
                key={c.key}
                className="flex items-center gap-0.5"
                title={c.resource ? undefined : "any resource"}
              >
                {c.resource ? (
                  <ResourceCoin resource={c.resource} size="sm" />
                ) : (
                  <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/40 bg-neutral-700 text-[11px] font-bold text-white">
                    ?
                  </span>
                )}
                <span className="text-[11px] font-bold leading-none text-white drop-shadow">
                  {c.n}
                </span>
              </span>
            ))}
          </div>

          {/* large voter-count numeral */}
          <div className="flex flex-1 items-center justify-center">
            <span className="font-black leading-none text-white text-[clamp(2rem,6vw,3.25rem)] drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
              {card.voters}
            </span>
          </div>
        </div>

        {/* voter-count caption */}
        <div className="absolute bottom-1.5 left-0 right-0 text-center text-[9px] uppercase tracking-widest text-white/50">
          voter{card.voters > 1 ? "s" : ""}
        </div>
      </button>

      {/* Hover popover with the full cost breakdown. Sits ABOVE the card and
          escapes the button's overflow-hidden via this wrapper. */}
      <div
        role="tooltip"
        className="invisible group-hover:visible absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 pointer-events-none rounded-md border border-neutral-700 bg-neutral-900/95 px-3 py-2 shadow-xl whitespace-nowrap"
      >
        <div className="text-[9px] uppercase tracking-widest text-neutral-400 mb-1">
          Cost
        </div>
        <ul className="flex flex-col gap-0.5">
          {costEntries.map((c) => (
            <li
              key={`tt-${c.key}`}
              className="flex items-center gap-1.5 text-xs text-neutral-100"
            >
              <span className="w-3 text-right font-bold tabular-nums">{c.n}</span>
              {c.resource ? (
                <ResourceCoin resource={c.resource} size="xs" />
              ) : (
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/40 bg-neutral-700 text-[9px] font-bold text-white">
                  ?
                </span>
              )}
              <span className="text-neutral-300">
                {c.resource ? RESOURCE_LABEL[c.resource] : "any resource"}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t border-neutral-700/60 pt-1 text-[10px] text-neutral-400">
          Gives {card.voters} voter{card.voters === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}
