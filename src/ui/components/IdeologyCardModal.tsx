// Shown during the "ideology" phase. Reveals the drawn ideology card so the
// player to the active player's RIGHT can read both options aloud, then the
// active player chooses left or right. Also allows a paid redraw (4 of any).
//
// The two sides are rendered as physical-style cards (dark question header with
// a chevron notch, cream body with the answer, a payout coin row, and a colored
// ideologue ribbon badge) to match the printed Ideology cards.
import { useMemo } from "react";
import Modal from "./Modal";
import type { GameState, IdeologyCardSide, Ideologue, Resource } from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { IDEOLOGY_CARDS } from "@/data/cards/ideology";
import { useDispatch } from "@/ui/hooks/useDispatch";
import { activePlayer } from "@/engine/selectors";
import { RESOURCE_LABEL, ResourceCoin } from "./ResourceTrack";
import { IDEOLOGUE_LABEL } from "./Coin";

interface Props {
  state: GameState;
}

// Ideologue → ribbon/accent color. Mirrors the theme colors in tailwind.config.
const IDEOLOGUE_HEX: Record<Ideologue, string> = {
  capitalist: "#10b981",
  supremo: "#ef4444",
  showstopper: "#3b82f6",
  idealist: "#eab308",
};

const IDEOLOGUE_RING: Record<Ideologue, string> = {
  capitalist: "focus:ring-capitalist hover:ring-capitalist/70",
  supremo: "focus:ring-supremo hover:ring-supremo/70",
  showstopper: "focus:ring-showstopper hover:ring-showstopper/70",
  idealist: "focus:ring-idealist hover:ring-idealist/70",
};

export default function IdeologyCardModal({ state }: Props) {
  const dispatch = useDispatch();
  const active = activePlayer(state);
  const card = useMemo(() => {
    if (!state.currentIdeologyCard) return null;
    return IDEOLOGY_CARDS.find((c) => c.id === state.currentIdeologyCard) ?? null;
  }, [state.currentIdeologyCard]);

  const totalRes = RESOURCES.reduce((s, r) => s + active.resources[r], 0);

  if (!card) {
    return (
      <Modal title="Ideology Card" closable={false}>
        <div className="text-sm text-neutral-300">
          Drawing an ideology card for {active.name}…
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={
        <span>
          Ideology Card —{" "}
          <span className="text-neutral-400">
            read aloud by the player to {active.name}'s right
          </span>
        </span>
      }
      closable={false}
      wide
    >
      <div className="space-y-4">
        {card.advisory ? (
          <div className="text-xs uppercase tracking-wide bg-amber-700/30 border border-amber-700/60 text-amber-200 rounded px-2 py-1">
            Content advisory: {card.advisory}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SideCard
            id={card.id}
            prompt={card.prompt}
            data={card.left}
            onPick={() => dispatch({ t: "answerIdeology", side: "left" })}
          />
          <SideCard
            id={card.id}
            prompt={card.prompt}
            data={card.right}
            onPick={() => dispatch({ t: "answerIdeology", side: "right" })}
          />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-neutral-700">
          <div className="text-xs text-neutral-400">
            {active.name} has {totalRes} resources total.
          </div>
          <button
            type="button"
            onClick={() => dispatch({ t: "redrawIdeology" })}
            disabled={totalRes < 4}
            className="text-xs px-3 py-1 rounded border border-neutral-600 hover:bg-neutral-800 disabled:opacity-40"
            title="Pay any 4 resources to discard this card and draw a new one"
          >
            Redraw (pay 4 any)
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Flatten a payout map into a left-to-right list of coin tokens, repeating a
// coin once per unit so the row reads like the printed card's icon strip.
type CoinToken = { kind: Resource | "any"; key: string };

function payoutCoins(data: IdeologyCardSide): CoinToken[] {
  const out: CoinToken[] = [];
  for (const r of RESOURCES) {
    const n = data.payout[r] ?? 0;
    for (let i = 0; i < n; i++) out.push({ kind: r, key: `${r}-${i}` });
  }
  const any = data.payout.any ?? 0;
  for (let i = 0; i < any; i++) out.push({ kind: "any", key: `any-${i}` });
  return out;
}

function SideCard({
  id,
  prompt,
  data,
  onPick,
}: {
  id: string;
  prompt: string;
  data: IdeologyCardSide;
  onPick: () => void;
}) {
  const ideologue = data.ideologue;
  const accent = IDEOLOGUE_HEX[ideologue];
  const coins = payoutCoins(data);

  // Concave-ended ribbon banner, like the printed name plate.
  const bannerClip =
    "polygon(0 0, 100% 0, calc(100% - 12px) 50%, 100% 100%, 0 100%, 12px 50%)";

  return (
    <button
      type="button"
      onClick={onPick}
      className={`group flex flex-col overflow-hidden rounded-xl bg-neutral-900 text-left shadow-lg ring-2 ring-transparent transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none ${IDEOLOGUE_RING[ideologue]}`}
    >
      {/* Dark question header with a downward chevron notch. */}
      <div className="relative px-4 pt-4 pb-5">
        <div className="text-center text-[11px] font-bold uppercase leading-snug tracking-wide text-neutral-100">
          {prompt}
        </div>
        <div
          aria-hidden
          className="absolute left-1/2 -bottom-[7px] h-0 w-0 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-neutral-900"
        />
      </div>

      {/* Cream card body. */}
      <div className="flex flex-1 flex-col bg-[#f6f1e7] px-4 pt-5 pb-3">
        <p className="mb-4 flex-1 text-center font-serif text-sm leading-relaxed text-neutral-700">
          {data.text}
        </p>

        {/* Payout coin strip, flanked by chevron flourishes. */}
        <div className="mb-4 flex items-center justify-center gap-1.5">
          <span style={{ color: accent }} className="text-base font-bold leading-none">
            «
          </span>
          {coins.length === 0 ? (
            <span className="text-xs text-neutral-400">—</span>
          ) : (
            coins.map((c) =>
              c.kind === "any" ? (
                <span
                  key={c.key}
                  title="Any resource"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-neutral-400 bg-white text-xs font-bold text-neutral-600"
                >
                  ?
                </span>
              ) : (
                <ResourceCoin key={c.key} resource={c.kind} size="md" />
              ),
            )
          )}
          <span style={{ color: accent }} className="text-base font-bold leading-none">
            »
          </span>
        </div>

        {/* Ideologue name plate. */}
        <div className="relative">
          <div
            className="mx-auto flex w-full max-w-[200px] items-center justify-center px-6 py-1.5"
            style={{ backgroundColor: accent, clipPath: bannerClip }}
          >
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-white">
              {IDEOLOGUE_LABEL[ideologue]}
            </span>
          </div>
          <span className="absolute right-0 bottom-0 translate-y-1 text-[8px] uppercase tracking-wide text-neutral-400">
            ID {id}
          </span>
        </div>
      </div>
    </button>
  );
}
