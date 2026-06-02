import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
