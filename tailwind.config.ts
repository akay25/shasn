import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        capitalist: "#eab308",   // yellow
        supremo: "#ef4444",      // red
        showstopper: "#3b82f6",  // blue
        idealist: "#10b981",     // green
        funds: "#eab308",        // capitalist → yellow
        clout: "#ef4444",        // supremo    → red
        media: "#3b82f6",        // showstopper → blue
        trust: "#10b981",        // idealist   → green
      },
    },
  },
  plugins: [],
} satisfies Config;
