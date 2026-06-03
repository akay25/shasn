// A face-up voter card on the HQ Mat, styled to resemble a real SHASN voter
// card: a black, portrait rectangle with a diamond-lattice texture, the cost
// resources as coloured coins down the left edge, and the voter count rendered
// as a single large numeral. Hovering reveals a popover with the full cost
// breakdown; the popover is screen-edge aware (it flips above/below the card
// when there is no room on the preferred side and clamps horizontally so it
// never bleeds past the viewport).
import type { Resource, VoterCard } from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { ResourceCoin, RESOURCE_LABEL } from "./ResourceTrack";
import { useEdgeAwarePopover } from "@/ui/hooks/useEdgeAwarePopover";

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
  // Cards sit near the top of the screen (HQ Mat floats top-right), so the
  // popover usually flips below; the hook handles either direction.
  const { triggerRef, popRef, open, setOpen, pos } =
    useEdgeAwarePopover<HTMLDivElement>({ preferredSide: "top" });

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
    // Wrapper carries the aspect ratio + hover handlers; the actual popover
    // is portal-positioned via `position: fixed`, so it escapes overflow.
    <div
      ref={triggerRef}
      className="relative aspect-[2/3] w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
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

      {open ? (
        <div
          ref={popRef}
          role="tooltip"
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.top,
            zIndex: 50,
          }}
          className="pointer-events-none rounded-md border border-neutral-700 bg-neutral-900/95 px-3 py-2 shadow-xl whitespace-nowrap text-left"
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
      ) : null}
    </div>
  );
}
