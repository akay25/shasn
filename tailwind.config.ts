import type { Config } from "tailwindcss";

/**
 * Theme pack: "Oxblood Noir"
 * --------------------------
 * Built from a four-colour palette:
 *   #000000  ink     – app background
 *   #6A0003  oxblood – primary action / deep red
 *   #B0A084  sand    – accent (highlights, accent text & borders)
 *   #4B4843  stone   – light borders
 *
 * The UI is themed by remapping the three Tailwind scales the app leans on:
 *   neutral → warm (tan-tinted) grayscale for backgrounds, borders & text
 *   blue    → oxblood ramp for primary actions
 *   amber   → sand ramp for accents
 * Gameplay faction colours (capitalist/supremo/… and funds/clout/…) and the
 * parchment map illustration are intentionally left alone — they carry meaning.
 */

const palette = {
  ink: "#000000",
  oxblood: "#6A0003",
  sand: "#B0A084",
  stone: "#4B4843",
};

// Warm grayscale: 950 = pure ink (darkest bg), 50 = warm off-white (lightest text).
const neutral = {
  50: "#f6f3ec",
  100: "#ebe7dd",
  200: "#d3cdc0",
  300: "#bdb7a8",
  400: "#a39d8e",
  500: "#837e73",
  600: "#5c5851",
  700: palette.stone, // #4B4843 — borders
  800: "#1c1a16", // cards / surfaces (sit above the ink background)
  900: "#0c0b0a", // header / panel background
  950: palette.ink, // #000000 — app background
};

// Primary actions: oxblood ramp around #6A0003.
const blue = {
  300: "#b53b3e",
  400: "#9a2326",
  500: "#8a0f12",
  600: palette.oxblood, // #6A0003 — primary
  700: "#520002", // hover / pressed
  800: "#3c0001",
};

// Accent: warm sand ramp around #B0A084.
const amber = {
  50: "#f3efe6",
  100: "#e4ddcb",
  200: "#d8cdb2",
  300: "#c9bb98",
  400: palette.sand, // #B0A084 — canonical accent
  500: "#9c8f72",
  600: "#8a7c5c",
  700: "#6f6347",
};

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-pack ramps
        neutral,
        blue,
        amber,

        // Semantic tokens for new code
        ink: palette.ink,
        oxblood: palette.oxblood,
        sand: palette.sand,
        stone: palette.stone,
        accent: palette.sand,

        // Gameplay faction colours (unchanged)
        capitalist: "#10b981",   // green
        supremo: "#ef4444",      // red
        showstopper: "#3b82f6",  // blue
        idealist: "#eab308",     // yellow
        funds: "#10b981",        // capitalist → green
        clout: "#ef4444",        // supremo    → red
        media: "#3b82f6",        // showstopper → blue
        trust: "#eab308",        // idealist   → yellow
      },
    },
  },
  plugins: [],
} satisfies Config;
