import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{vue,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ts: {
          bg: "#0b0c10",
          panel: "#171923",
          panelSoft: "#1f2330",
          text: "#f4f5f7",
          muted: "#a3a9b8",
          accent: "#d4a843",
          accentSoft: "#be9334"
        }
      },
      boxShadow: {
        glow: "0 0 30px rgba(212, 168, 67, 0.35)"
      }
    }
  },
  plugins: []
} satisfies Config;
