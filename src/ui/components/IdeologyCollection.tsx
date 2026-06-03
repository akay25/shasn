// The active player's collected Ideology Cards, grouped by Ideologue with
// progress bars and L3/L5 power buttons. Hovering an ideologue's coin opens
// a screen-edge-aware popover with that ideologue's passive + L3 + L5 powers.
import type { Player, Ideologue } from "@/engine/types";
import { IDEOLOGUES } from "@/engine/types";
import {
  ideologueCardCount,
  passiveResourcesFor,
  powerUnlocked,
} from "@/engine/selectors";
import Coin, { IDEOLOGUE_LABEL } from "./Coin";
import { IDEOLOGUE_INFO } from "@/data/ideologueInfo";
import { RESOURCE_COLOR, RESOURCE_LABEL } from "./ResourceTrack";
import { useEdgeAwarePopover } from "@/ui/hooks/useEdgeAwarePopover";

interface Props {
  player: Player;
  onUsePower?: (ideologue: Ideologue, level: 3 | 5) => void;
}

// Progress-bar fills, per Ideologue.
const IDEO_BG: Record<string, string> = {
  capitalist: "bg-capitalist",
  supremo: "bg-supremo",
  showstopper: "bg-showstopper",
  idealist: "bg-idealist",
};

export default function IdeologyCollection({ player, onUsePower }: Props) {
  const passive = passiveResourcesFor(player);

  return (
    <div className="bg-neutral-900/70 border border-neutral-700 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">
        Ideology Cards · {player.name}
      </div>
      <div className="flex flex-col gap-1">
        {IDEOLOGUES.map((ig) => (
          <IdeologyRow
            key={ig}
            ideologue={ig}
            player={player}
            onUsePower={onUsePower}
          />
        ))}
      </div>
      {Object.keys(passive).length > 0 ? (
        <div className="text-[10px] text-neutral-400 mt-2">
          Passive bonus on next ideology turn:{" "}
          {Object.entries(passive)
            .map(([r, n]) => `+${n} ${r}`)
            .join(", ")}
        </div>
      ) : null}
      <div className="text-[10px] text-neutral-500 mt-1">
        Each pair of cards in one ideologue grants +1 of that ideologue's
        resource on your ideology turn.
      </div>
    </div>
  );
}

function IdeologyRow({
  ideologue,
  player,
  onUsePower,
}: {
  ideologue: Ideologue;
  player: Player;
  onUsePower?: (ideologue: Ideologue, level: 3 | 5) => void;
}) {
  const n = ideologueCardCount(player, ideologue);
  const pct = Math.min(100, (n / 5) * 100);
  const l3 = powerUnlocked(player, ideologue, 3);
  const l5 = powerUnlocked(player, ideologue, 5);

  // Hover popover for the ideologue icon — passive + L3 + L5 explainer.
  const { triggerRef, popRef, open, setOpen, pos } =
    useEdgeAwarePopover<HTMLDivElement>({ preferredSide: "top" });

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Coin trigger — hover/focus reveals the powers popover. */}
      <div
        ref={triggerRef}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        aria-describedby={open ? `ideo-pop-${ideologue}` : undefined}
        className="inline-flex rounded-full focus:outline-none focus:ring-2 focus:ring-white/70"
      >
        <Coin ideologue={ideologue} size="sm" />
      </div>
      <div className="w-20 truncate">{IDEOLOGUE_LABEL[ideologue]}</div>
      <div className="flex-1 h-2 bg-neutral-800 rounded relative overflow-hidden">
        <div
          className={`h-full ${IDEO_BG[ideologue]}`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute top-0 left-[60%] w-px h-full bg-white/60" title="L3" />
        <div className="absolute top-0 left-[100%] w-px h-full bg-white/60" title="L5" />
      </div>
      <div className="w-6 text-right tabular-nums">{n}</div>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={!l3}
          onClick={() => l3 && onUsePower?.(ideologue, 3)}
          className="text-[10px] px-1 py-0.5 rounded border border-neutral-700 disabled:opacity-30 hover:bg-neutral-800"
          title="Level 3 Power"
        >
          L3
        </button>
        <button
          type="button"
          disabled={!l5}
          onClick={() => l5 && onUsePower?.(ideologue, 5)}
          className="text-[10px] px-1 py-0.5 rounded border border-neutral-700 disabled:opacity-30 hover:bg-neutral-800"
          title="Level 5 Power"
        >
          L5
        </button>
      </div>

      {open ? (
        <div
          ref={popRef}
          id={`ideo-pop-${ideologue}`}
          role="tooltip"
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.top,
            zIndex: 50,
          }}
          className="pointer-events-none rounded-md border border-neutral-700 bg-neutral-900/95 px-3 py-2 shadow-xl text-left w-[260px]"
        >
          <PowerInfo ideologue={ideologue} cards={n} />
        </div>
      ) : null}
    </div>
  );
}

function PowerInfo({ ideologue, cards }: { ideologue: Ideologue; cards: number }) {
  const info = IDEOLOGUE_INFO[ideologue];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Coin ideologue={ideologue} size="md" />
        <div>
          <div className="text-sm font-bold text-neutral-50 leading-none">
            The {IDEOLOGUE_LABEL[ideologue].replace(/^The\s+/, "")}
          </div>
          <div className={`text-[10px] uppercase tracking-widest ${RESOURCE_COLOR[info.resource]}`}>
            {RESOURCE_LABEL[info.resource]}
          </div>
        </div>
      </div>
      <div className="text-[11px] text-neutral-300 italic leading-snug">
        {info.tagline}
      </div>

      <Section heading="Passive" unlocked={cards >= 2}>
        <p className="text-[11px] text-neutral-100 leading-snug">{info.passive}</p>
        <UnlockLine condition="Active from 2 cards" />
      </Section>

      <Section heading={`Level 3 · ${info.level3.name}`} unlocked={cards >= 3}>
        <p className="text-[11px] text-neutral-100 leading-snug">
          {info.level3.description}
        </p>
        <UnlockLine
          condition="Unlocks at 3 cards"
          extra={
            info.level3.perTurn
              ? `Max ${info.level3.perTurn}× per turn`
              : undefined
          }
        />
      </Section>

      <Section heading={`Level 5 · ${info.level5.name}`} unlocked={cards >= 5}>
        <p className="text-[11px] text-neutral-100 leading-snug">
          {info.level5.description}
        </p>
        <UnlockLine
          condition="Unlocks at 5 cards"
          extra={
            info.level5.perTurn
              ? `Max ${info.level5.perTurn}× per turn`
              : undefined
          }
        />
      </Section>

      <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-800">
        You have <span className="text-neutral-200 font-semibold">{cards}</span>{" "}
        {ideologue} card{cards === 1 ? "" : "s"}.
      </div>
    </div>
  );
}

function Section({
  heading,
  unlocked,
  children,
}: {
  heading: string;
  unlocked: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded border px-2 py-1.5 ${
        unlocked
          ? "border-emerald-800/60 bg-emerald-900/10"
          : "border-neutral-800 bg-neutral-950/40"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-widest mb-0.5 ${
          unlocked ? "text-emerald-300" : "text-neutral-500"
        }`}
      >
        {heading}
        {unlocked ? " · unlocked" : ""}
      </div>
      {children}
    </div>
  );
}

function UnlockLine({ condition, extra }: { condition: string; extra?: string }) {
  return (
    <div className="mt-0.5 text-[10px] text-neutral-500">
      {condition}
      {extra ? <span className="text-neutral-400"> · {extra}</span> : null}
    </div>
  );
}
