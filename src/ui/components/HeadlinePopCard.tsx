// Standalone, reusable "headline pop" card. Renders a HeadlineCard over a
// blurred, gray-tinted headline.jpg background. The image lives behind two
// layers so the headline text stays crisp and legible:
//   1. background layer — headline.jpg, blurred + desaturated, scaled up
//      slightly so the blur doesn't reveal soft edges.
//   2. tint layer — a grayish wash + bottom-up darkening for contrast.
//   3. content layer — the eyebrow / name / description (never blurred).
//
// Not tied to the headlines modal; drop it anywhere you want to surface a
// headline. Pass `children` to add an action row (e.g. a Resolve button).
import type { ReactNode } from "react";
import type { HeadlineCard } from "@/engine/types";
import headlineArt from "@/assets/art/headline.jpg";

interface Props {
  card: HeadlineCard;
  /** Small uppercase label above the name. Defaults to "Headline". */
  eyebrow?: ReactNode;
  /** Optional action row rendered at the bottom of the card. */
  children?: ReactNode;
  className?: string;
}

export default function HeadlinePopCard({
  card,
  eyebrow = "Headline",
  children,
  className = "",
}: Props) {
  return (
    <div
      // ISO/IEC 7810 ID-1 (credit card) is 85.60 x 53.98 mm — 1.586 : 1,
      // matching the other art cards (see ConspiracyBuyPanel).
      className={`relative overflow-hidden border border-neutral-700 rounded-xl shadow-lg ${className}`}
      style={{ aspectRatio: "85.60 / 53.98" }}
    >
      {/* 1. Blurred + desaturated background. Scaled past the edges so the
          blur radius never exposes the card border. */}
      <div
        className="absolute inset-0 scale-110"
        style={{
          backgroundImage: `url(${headlineArt})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(6px) grayscale(60%)",
        }}
      />
      {/* 2. Grayish tint + bottom-up darkening for text contrast. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(38,38,42,0.45) 0%, rgba(20,20,24,0.78) 100%)",
        }}
      />
      {/* 3. Crisp content. */}
      <div className="relative h-full p-4 flex flex-col justify-between">
        <div className="text-[10px] uppercase tracking-widest text-neutral-200/80 drop-shadow">
          {eyebrow}
        </div>
        <div className="space-y-1">
          <div className="text-base font-semibold leading-snug drop-shadow">
            {card.name}
          </div>
          <div className="text-sm text-neutral-200/90 leading-snug drop-shadow">
            {card.description}
          </div>
        </div>
        {children ? <div className="pt-2">{children}</div> : null}
      </div>
    </div>
  );
}
