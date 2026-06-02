import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        capitalist: "#f59e0b",   // amber
        supremo: "#ef4444",      // red
        showstopper: "#a855f7",  // purple
        idealist: "#10b981",     // emerald
        funds: "#f59e0b",
        clout: "#ef4444",
        media: "#a855f7",
        trust: "#10b981",
      },
    },
  },
  plugins: [],
} satisfies Config;
