// Generic, reusable "pop" card: a name/description rendered over a blurred,
// gray-tinted background image. Used for headline and conspiracy popups (and
// anywhere else a card-shaped art callout is wanted). The image lives behind
// two layers so the text stays crisp:
//   1. background layer — the image, blurred + desaturated, scaled up slightly
//      so the blur doesn't reveal soft edges.
//   2. tint layer — a grayish wash + bottom-up darkening for contrast.
//   3. content layer — the eyebrow / name / description (never blurred).
//
// Pass `children` to add a detail/action row at the bottom of the card.
import type { ReactNode } from "react";

interface Props {
  /** Background image URL (import a .jpg/.png from @/assets/art/...). */
  image: string;
  name: ReactNode;
  description: ReactNode;
  /** Small uppercase label above the name. */
  eyebrow?: ReactNode;
  /** Optional detail/action row rendered at the bottom of the card. */
  children?: ReactNode;
  className?: string;
}

export default function ArtPopCard({
  image,
  name,
  description,
  eyebrow,
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
          backgroundImage: `url(${image})`,
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
        {eyebrow ? (
          <div className="text-[10px] uppercase tracking-widest text-neutral-200/80 drop-shadow">
            {eyebrow}
          </div>
        ) : null}
        <div className="space-y-1">
          <div className="text-base font-semibold leading-snug drop-shadow">
            {name}
          </div>
          <div className="text-sm text-neutral-200/90 leading-snug drop-shadow">
            {description}
          </div>
        </div>
        {children ? <div className="pt-2">{children}</div> : null}
      </div>
    </div>
  );
}
