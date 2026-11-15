/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dt: {
          bg: "#0f0f11",
          sunken: "#131316",
          surface: "#16161a",
          panel: "#16161a",
          elevated: "#1f1f23",
          hover: "#26262b",
          rowHover: "#1c1c20",
          selected: "#132033",
          border: "#2a2a2e",
          borderSubtle: "#222226",
          borderStrong: "#3a3a40",
          text: "#f2f2f3",
          secondary: "#b0b3b8",
          muted: "#7d8087",
          dim: "#56585f",
          accent: "#35d0e0",
          interactive: "#2f6bff",
          emerald: "#3fb950",
          amber: "#d29922",
          rose: "#f85149",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans Thai",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "Cascadia Code",
          "JetBrains Mono",
          "Fira Code",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
