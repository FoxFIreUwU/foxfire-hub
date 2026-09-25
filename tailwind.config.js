/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        appbg: "var(--color-appbg)",
        appbg2: "var(--color-appbg2)",
        card: "var(--color-card)",
        card2: "var(--color-card2)",
        border: "var(--color-border)",
        borderstrong: "var(--color-border-strong)",
        warmwhite: "var(--color-text)",
        muted: "var(--color-muted)",
        accent: {
          fire: "var(--color-fire)",
          firedark: "var(--color-firedark)",
          purple: "var(--color-mesh-purple)",
          green: "#22c55e",
          blue: "#3b82f6",
          warning: "#eab308",
          danger: "#ef4444"
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      boxShadow: {
        glow: "0 0 20px var(--color-fire-glow)",
        "glow-sm": "0 0 12px var(--color-fire-glow)",
        "glow-lg": "0 0 40px var(--color-fire-glow)"
      }
    }
  },
  plugins: []
};
