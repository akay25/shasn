// Shared round-coin renderer keyed by Ideologue. Every place in the UI that
// needs to show "this player / this resource / this ideology" uses <Coin />
// so the visual identity stays consistent.
//
// Sizes (px) — pick the closest one to your layout context:
//   xs : 14   (inline with body text, cost coins on voter cards)
//   sm : 18   (chip / inline near a name)
//   md : 24   (resource track, payout badges)
//   lg : 32   (player mat header)
//   xl : 48   (setup screen picker)
//   xxl: 72   (handoff hero)

import type { Ideologue, Resource } from "@/engine/types";

import coinCapitalist from "@/assets/coins/coin_capitalist.png";
import coinSupremo from "@/assets/coins/coin_supremo.png";
import coinShowstopper from "@/assets/coins/coin_showstopper.png";
import coinIdealist from "@/assets/coins/coin_idealist.png";

export const COIN_SRC: Record<Ideologue, string> = {
  capitalist: coinCapitalist,
  supremo: coinSupremo,
  showstopper: coinShowstopper,
  idealist: coinIdealist,
};

export const IDEOLOGUE_LABEL: Record<Ideologue, string> = {
  capitalist: "The Capitalist",
  supremo: "The Supremo",
  showstopper: "The Showstopper",
  idealist: "The Idealist",
};

// Each resource maps to one ideologue (rulebook p.15). Useful for resource
// callsites that want a coin without translating Resource → Ideologue
// themselves.
export const RESOURCE_TO_IDEOLOGUE: Record<Resource, Ideologue> = {
  funds: "capitalist",
  clout: "supremo",
  media: "showstopper",
  trust: "idealist",
};

const COIN_PX = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 72,
} as const;
export type CoinSize = keyof typeof COIN_PX;

interface Props {
  ideologue: Ideologue;
  size?: CoinSize;
  className?: string;
  title?: string;
}

export default function Coin({
  ideologue,
  size = "sm",
  className = "",
  title,
}: Props) {
  const px = COIN_PX[size];
  return (
    <img
      src={COIN_SRC[ideologue]}
      alt={IDEOLOGUE_LABEL[ideologue]}
      title={title ?? IDEOLOGUE_LABEL[ideologue]}
      width={px}
      height={px}
      draggable={false}
      className={`inline-block align-middle rounded-full select-none pointer-events-none ${className}`}
    />
  );
}
