// Shown during the "ideology" phase. The player to the active player's RIGHT
// reads the question and both answer texts aloud; the active player then picks
// left or right WITHOUT seeing which ideologue (and reward) each side grants.
// Only after picking is the chosen side's ideology revealed, after which the
// player confirms to bank the payout. A paid redraw (4 of any) is available
// before a choice is made.
//
// Sides are rendered as physical-style cards (dark question header with a
// chevron notch, cream body with the answer, a payout coin row, and a colored
// ideologue ribbon badge) to match the printed Ideology cards.
import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import type { GameState, IdeologyCardSide, Ideologue, Resource } from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { IDEOLOGY_CARDS } from "@/data/cards/ideology";
import { useDispatch } from "@/ui/hooks/useDispatch";
import { activePlayer } from "@/engine/selectors";
import { ResourceCoin } from "./ResourceTrack";
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

  // Which side the player has committed to. The ideology stays hidden until
  // this is set; afterwards the chosen card is revealed and they confirm.
  const [picked, setPicked] = useState<"left" | "right" | null>(null);

  // A fresh card (initial draw or redraw) resets the choice back to hidden.
  useEffect(() => {
    setPicked(null);
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

  // Reveal step: show the chosen side in full, then confirm to bank it.
  if (picked) {
    const chosen = picked === "left" ? card.left : card.right;
    return (
      <Modal title="Ideology Card — your answer" closable={false} wide>
        <div className="space-y-4">
          <div className="text-sm text-neutral-300">
            You chose this answer. It is the{" "}
            <span className="font-semibold">{IDEOLOGUE_LABEL[chosen.ideologue]}</span>.
          </div>
          <div className="mx-auto max-w-xs">
            <SideCard id={card.id} prompt={card.prompt} data={chosen} revealed />
          </div>
          <div className="flex justify-end pt-2 border-t border-neutral-700">
            <button
              type="button"
              onClick={() => dispatch({ t: "answerIdeology", side: picked })}
              className="text-sm px-4 py-1.5 rounded bg-white text-neutral-900 font-semibold hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Continue
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Choice step: ideology hidden, player picks based on the answer text alone.
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
        <div className="text-xs text-neutral-400">
          Pick an answer — the ideology it grants stays hidden until you choose.
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SideCard
            id={card.id}
            prompt={card.prompt}
            data={card.left}
            onPick={() => setPicked("left")}
          />
          <SideCard
            id={card.id}
            prompt={card.prompt}
            data={card.right}
            onPick={() => setPicked("right")}
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
  revealed = false,
}: {
  id: string;
  prompt: string;
  data: IdeologyCardSide;
  onPick?: () => void;
  // When false (the choice step) the ideologue and reward are masked so the
  // player decides on the policy alone.
  revealed?: boolean;
}) {
  const ideologue = data.ideologue;
  const accent = IDEOLOGUE_HEX[ideologue];
  const coins = payoutCoins(data);

  // Concave-ended ribbon banner, like the printed name plate.
  const bannerClip =
    "polygon(0 0, 100% 0, calc(100% - 12px) 50%, 100% 100%, 0 100%, 12px 50%)";

  const ringClass = revealed ? "" : IDEOLOGUE_RING[ideologue];
  const flourish = revealed ? accent : "#a3a3a3"; // neutral-400 when hidden

  const Tag = onPick ? "button" : "div";

  return (
    <Tag
      type={onPick ? "button" : undefined}
      onClick={onPick}
      className={`group flex flex-col overflow-hidden rounded-xl bg-neutral-900 text-left shadow-lg ring-2 ring-transparent transition focus:outline-none ${
        onPick ? `hover:-translate-y-0.5 hover:shadow-xl ${ringClass}` : ""
      }`}
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

        {/* Payout coin strip, flanked by chevron flourishes. Masked until the
            side is revealed. */}
        <div className="mb-4 flex items-center justify-center gap-1.5">
          <span style={{ color: flourish }} className="text-base font-bold leading-none">
            «
          </span>
          {!revealed ? (
            <span className="text-[11px] uppercase tracking-wide text-neutral-400">
              Reward hidden
            </span>
          ) : coins.length === 0 ? (
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
          <span style={{ color: flourish }} className="text-base font-bold leading-none">
            »
          </span>
        </div>

        {/* Ideologue name plate. Masked until the side is revealed. */}
        <div className="relative">
          {revealed ? (
            <div
              className="mx-auto flex w-full max-w-[200px] items-center justify-center px-6 py-1.5"
              style={{ backgroundColor: accent, clipPath: bannerClip }}
            >
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-white">
                {IDEOLOGUE_LABEL[ideologue]}
              </span>
            </div>
          ) : (
            <div
              className="mx-auto flex w-full max-w-[200px] items-center justify-center bg-neutral-300 px-6 py-1.5"
              style={{ clipPath: bannerClip }}
            >
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-500">
                ? ? ?
              </span>
            </div>
          )}
          <span className="absolute right-0 bottom-0 translate-y-1 text-[8px] uppercase tracking-wide text-neutral-400">
            ID {id}
          </span>
        </div>
      </div>
    </Tag>
  );
}
