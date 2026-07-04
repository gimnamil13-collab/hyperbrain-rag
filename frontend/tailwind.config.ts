import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#06080f",
          panel: "rgba(12, 18, 32, 0.72)",
          border: "rgba(6, 182, 212, 0.22)",
          cyan: "#06b6d4",
          purple: "#a855f7",
          glow: "#22d3ee",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-orbitron)", "monospace"],
      },
      boxShadow: {
        neon: "0 0 20px rgba(6, 182, 212, 0.35), 0 0 40px rgba(168, 85, 247, 0.15)",
        "neon-sm": "0 0 12px rgba(6, 182, 212, 0.4)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        scan: "scan 3s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
