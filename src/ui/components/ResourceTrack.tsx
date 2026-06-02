// Displays a player's 4 resources with their colored token and glyph.
import type { Resource } from "@/engine/types";
import { RESOURCES } from "@/engine/types";

export const RESOURCE_GLYPH: Record<Resource, string> = {
  funds: "¤",   // ¤
  clout: "★",   // ★
  media: "✦",   // ✦
  trust: "❤",   // ❤
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
          <div className={`${RESOURCE_COLOR[r]} ${compact ? "text-xs" : "text-base"} leading-none`}>
            {RESOURCE_GLYPH[r]}
          </div>
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
