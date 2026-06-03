// Hover-popover positioning helper that keeps the popover inside the viewport.
//
// Usage:
//   const { triggerRef, popRef, open, setOpen, pos } = useEdgeAwarePopover();
//   return (
//     <div ref={triggerRef} onMouseEnter={() => setOpen(true)} onMouseLeave={...}>
//       {trigger}
//       {open && (
//         <div ref={popRef} style={{ position: "fixed", left: pos.left, top: pos.top }}>
//           {content}
//         </div>
//       )}
//     </div>
//   );
//
// The hook measures the trigger and the (mounted) popover after open is set,
// flips vertically when there isn't room on the preferred side, and clamps
// horizontally so the popover never bleeds past the viewport edges.

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Side = "top" | "bottom";

interface Options {
  /** Preferred vertical side. Default: "top" (above the trigger). */
  preferredSide?: Side;
  /** Px gap between trigger and popover. Default: 8. */
  gap?: number;
  /** Px safety margin from the viewport edges. Default: 8. */
  margin?: number;
}

interface PopoverPos {
  left: number;
  top: number;
  side: Side;
}

export function useEdgeAwarePopover<TTrigger extends HTMLElement = HTMLDivElement>(
  options: Options = {},
) {
  const { preferredSide = "top", gap = 8, margin = 8 } = options;

  const triggerRef = useRef<TTrigger | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos>({ left: 0, top: 0, side: preferredSide });

  // Compute position after both nodes are laid out. useLayoutEffect avoids the
  // one-frame jump that useEffect would produce.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const pop = popRef.current;
    if (!trigger || !pop) return;

    const compute = () => {
      const t = trigger.getBoundingClientRect();
      const p = pop.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Vertical: try preferred side, flip if it doesn't fit, then clamp.
      let side: Side = preferredSide;
      let top =
        side === "top" ? t.top - p.height - gap : t.bottom + gap;
      const overflowsAbove = top < margin;
      const overflowsBelow = top + p.height > vh - margin;
      if (side === "top" && overflowsAbove && !overflowsBelow) {
        side = "bottom";
        top = t.bottom + gap;
      } else if (side === "bottom" && overflowsBelow && !overflowsAbove) {
        side = "top";
        top = t.top - p.height - gap;
      }
      // Final hard clamp so the popover is never cut off vertically.
      top = Math.max(margin, Math.min(top, vh - p.height - margin));

      // Horizontal: centre on the trigger, then clamp to the viewport.
      let left = t.left + (t.width - p.width) / 2;
      left = Math.max(margin, Math.min(left, vw - p.width - margin));

      setPos({ left, top, side });
    };

    compute();

    // Recompute on resize or scroll so the popover follows its trigger.
    const onWin = () => compute();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, preferredSide, gap, margin]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return { triggerRef, popRef, open, setOpen, pos };
}
