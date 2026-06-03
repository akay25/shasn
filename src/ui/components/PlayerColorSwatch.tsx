// Round colour dot used everywhere we need to show *which player* something
// belongs to (the player's own setup choice). Distinct from <Coin>, which
// belongs to the Ideologue concept (resources, ideology cards).
//
// PLAYER_COLOR_HEX is the SINGLE source of truth for player identity colours.
// Swatches, voter slot fills, voter pegs on the canvas map, and coloured
// player-name text all read from this map (via inline style), so the
// "Oxblood Noir" theme's Tailwind ramp remap (which turns `bg-blue-500`
// into deep red, etc.) can never drift the player palette.

import type { PlayerColor } from "@/engine/types";

export const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  red:    "#ef4444",
  blue:   "#3b82f6",
  yellow: "#eab308",
  green:  "#10b981",
  purple: "#a855f7",
  pink:   "#ec4899",
};

export const PLAYER_COLOR_LABEL: Record<PlayerColor, string> = {
  red: "Red", blue: "Blue", yellow: "Yellow",
  green: "Green", purple: "Purple", pink: "Pink",
};

const SWATCH_PX = {
  xs: 10,
  sm: 14,
  md: 20,
  lg: 32,
  xl: 48,
  xxl: 80,
} as const;
export type SwatchSize = keyof typeof SWATCH_PX;

interface Props {
  color: PlayerColor;
  size?: SwatchSize;
  className?: string;
  ring?: boolean;
}

export default function PlayerColorSwatch({
  color,
  size = "md",
  className = "",
  ring = true,
}: Props) {
  const px = SWATCH_PX[size];
  return (
    <span
      className={`inline-block rounded-full align-middle ${
        ring ? "ring-1 ring-black/40" : ""
      } ${className}`}
      style={{
        width: px,
        height: px,
        backgroundColor: PLAYER_COLOR_HEX[color],
      }}
      title={PLAYER_COLOR_LABEL[color]}
      aria-label={`${PLAYER_COLOR_LABEL[color]} swatch`}
    />
  );
}
