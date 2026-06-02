// Displays a player's 4 resources, each with its ideologue coin image.
import type { Resource } from "@/engine/types";
import { RESOURCES } from "@/engine/types";

import coinFunds from "@/assets/coins/coin_capitalist.png";
import coinClout from "@/assets/coins/coin_supremo.png";
import coinMedia from "@/assets/coins/coin_showstopper.png";
import coinTrust from "@/assets/coins/coin_idealist.png";

// Each resource maps to its ideologue's coin (rulebook p.15: every resource
// corresponds to one of the four Ideologues).
export const RESOURCE_COIN: Record<Resource, string> = {
  funds: coinFunds,   // The Capitalist
  clout: coinClout,   // The Supremo
  media: coinMedia,   // The Showstopper
  trust: coinTrust,   // The Idealist
};

export const RESOURCE_COLOR: Record<Resource, string> = {
  funds: "text-funds",
  clout: "text-clout",
  media: "text-media",
  trust: "text-trust",
};

export const RESOURCE_BG: Record<Resource, string> = {
  funds: "bg-funds/20 border-funds",
  clout: "bg-clout/20 border-clout",
  media: "bg-media/20 border-media",
  trust: "bg-trust/20 border-trust",
};

export const RESOURCE_LABEL: Record<Resource, string> = {
  funds: "Funds",
  clout: "Clout",
  media: "Media",
  trust: "Trust",
};

// Coin sizes (px). Use class `inline-block` on the img to keep baseline flow.
const COIN_SIZE = { xs: 14, sm: 18, md: 22, lg: 32 } as const;
type CoinSize = keyof typeof COIN_SIZE;

interface ResourceCoinProps {
  resource: Resource;
  size?: CoinSize;
  className?: string;
}

export function ResourceCoin({ resource, size = "sm", className = "" }: ResourceCoinProps) {
  const px = COIN_SIZE[size];
  return (
    <img
      src={RESOURCE_COIN[resource]}
      alt={RESOURCE_LABEL[resource]}
      title={RESOURCE_LABEL[resource]}
      width={px}
      height={px}
      className={`inline-block align-middle select-none pointer-events-none ${className}`}
      draggable={false}
    />
  );
}

interface Props {
  resources: Record<Resource, number>;
  cap?: number;
  compact?: boolean;
}

export default function ResourceTrack({ resources, cap, compact }: Props) {
  return (
    <div className={`grid grid-cols-4 gap-${compact ? "1" : "2"}`}>
      {RESOURCES.map((r) => (
        <div
          key={r}
          className={`flex flex-col items-center justify-center rounded-md border ${RESOURCE_BG[r]} ${
            compact ? "px-1 py-0.5" : "px-2 py-1"
          }`}
          title={RESOURCE_LABEL[r]}
        >
          <ResourceCoin resource={r} size={compact ? "xs" : "md"} />
          <div className={`${compact ? "text-xs" : "text-lg"} font-bold leading-none mt-0.5`}>
            {resources[r] ?? 0}
          </div>
        </div>
      ))}
      {cap !== undefined && !compact ? (
        <div className="col-span-4 text-xs text-neutral-400 text-right mt-0.5">
          Cap: {cap}
        </div>
      ) : null}
    </div>
  );
}
