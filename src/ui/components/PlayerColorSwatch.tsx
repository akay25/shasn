// Round colour dot used everywhere we need to show *which player* something
// belongs to (the player's own setup choice). Distinct from <Coin>, which
// belongs to the Ideologue concept (resources, ideology cards).
//
// Voter pegs on the board are also rendered in this colour palette via the
// PLAYER_COLOR_HEX map, so a player's pegs match their swatch.

import type { PlayerColor } from "@/engine/types";

export const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  red:    "#ef4444",
  blue:   "#3b82f6",
  yellow: "#eab308",
  green:  "#10b981",
  purple: "#a855f7",
  pink:   "#ec4899",
};

export const PLAYER_COLOR_BG: Record<PlayerColor, string> = {
  red:    "bg-red-500",
  blue:   "bg-blue-500",
  yellow: "bg-yellow-400",
  green:  "bg-emerald-500",
  purple: "bg-purple-500",
  pink:   "bg-pink-500",
};

export const PLAYER_COLOR_TEXT: Record<PlayerColor, string> = {
  red:    "text-red-400",
  blue:   "text-blue-400",
  yellow: "text-yellow-400",
  green:  "text-emerald-400",
  purple: "text-purple-400",
  pink:   "text-pink-400",
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
      className={`inline-block rounded-full align-middle ${PLAYER_COLOR_BG[color]} ${
        ring ? "ring-1 ring-black/40" : ""
      } ${className}`}
      style={{ width: px, height: px }}
      title={PLAYER_COLOR_LABEL[color]}
      aria-label={`${PLAYER_COLOR_LABEL[color]} swatch`}
    />
  );
}
