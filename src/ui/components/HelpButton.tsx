// Small "Rules" tab pinned to the right edge of the screen, above the bottom
// ActionBar. Clicking (or activating with the keyboard) opens the bundled
// rulebook.pdf in a new tab. Vite hashes the PDF at build time and serves it
// from /assets/ so the link works in dev and production.
import rulebookUrl from "@/assets/rulebook.pdf";

export default function HelpButton() {
  return (
    <a
      href={rulebookUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Open the SHASN rulebook (PDF)"
      aria-label="Open the SHASN rulebook (PDF) in a new tab"
      className="fixed right-0 bottom-[76px] z-40 flex items-center gap-1.5 rounded-l-lg border border-r-0 border-neutral-700 bg-neutral-800/95 px-3 py-2 text-xs font-semibold text-neutral-100 shadow-lg backdrop-blur transition hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-white"
    >
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-600 bg-neutral-900 text-[11px] font-bold"
      >
        ?
      </span>
      <span>Rules</span>
    </a>
  );
}
