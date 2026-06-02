// Shown during the "ideology" phase. Reveals the drawn ideology card so the
// player to the active player's RIGHT can read both options aloud, then the
// active player chooses left or right. Also allows a paid redraw (4 of any).
import { useMemo } from "react";
import Modal from "./Modal";
import type { GameState, IdeologyCardSide, Resource } from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { IDEOLOGY_CARDS } from "@/data/cards/ideology";
import { useDispatch } from "@/ui/hooks/useDispatch";
import { activePlayer } from "@/engine/selectors";
import { RESOURCE_COLOR, RESOURCE_LABEL, ResourceCoin } from "./ResourceTrack";

interface Props {
  state: GameState;
}

const IDEOLOGUE_BG: Record<string, string> = {
  capitalist: "bg-capitalist/20 border-capitalist",
  supremo: "bg-supremo/20 border-supremo",
  showstopper: "bg-showstopper/20 border-showstopper",
  idealist: "bg-idealist/20 border-idealist",
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
          Ideology Card — <span className="text-neutral-400">read aloud by the player to {active.name}'s right</span>
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
        <div className="text-base font-medium">{card.prompt}</div>
        <div className="grid grid-cols-2 gap-3">
          <SideButton
            side="left"
            data={card.left}
            onPick={() => dispatch({ t: "answerIdeology", side: "left" })}
          />
          <SideButton
            side="right"
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

function SideButton({
  side,
  data,
  onPick,
}: {
  side: "left" | "right";
  data: IdeologyCardSide;
  onPick: () => void;
}) {
  const ideologue = data.ideologue;
  const payout: { r: Resource | "any"; n: number; color: string }[] = [];
  for (const r of RESOURCES) {
    const n = data.payout[r] ?? 0;
    if (n > 0) payout.push({ r, n, color: RESOURCE_COLOR[r] });
  }
  if (data.payout.any) {
    payout.push({ r: "any", n: data.payout.any, color: "text-neutral-200" });
  }
  return (
    <button
      type="button"
      onClick={onPick}
      className={`text-left rounded-lg border ${IDEOLOGUE_BG[ideologue]} p-3 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white`}
    >
      <div className="text-[10px] uppercase text-neutral-300 mb-1">
        {side === "left" ? "Left" : "Right"} · {ideologue}
      </div>
      <div className="text-sm font-medium mb-2">{data.text}</div>
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
        {payout.map((p, i) => (
          <span
            key={`${p.r}-${i}`}
            className={`${p.color} inline-flex items-center gap-0.5`}
            title={p.r === "any" ? "Any resource" : RESOURCE_LABEL[p.r]}
          >
            +{p.n}
            {p.r === "any" ? <span>?</span> : <ResourceCoin resource={p.r} size="sm" />}
          </span>
        ))}
      </div>
    </button>
  );
}
