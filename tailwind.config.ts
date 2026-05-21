import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        mono:  ["var(--font-jetbrains)", "monospace"],
        sans:  ["var(--font-lato)", "system-ui", "sans-serif"],
      },
      colors: {
        ledger: {
          bg:       "#0D0C0A",
          surface:  "#17150F",
          s2:       "#1E1B13",
          border:   "#2A261A",
          gold:     "#C9A84C",
          dim:      "#7A6228",
          text:     "#EDE8DC",
          muted:    "#A09580",
          faint:    "#5C5247",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.35s ease forwards",
        shimmer:   "shimmer 3s linear infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
