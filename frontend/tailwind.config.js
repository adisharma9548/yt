/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: "var(--bg-primary)",
          card: "var(--bg-card)",
          surface: "var(--bg-surface)",
          input: "var(--bg-input)",
          text: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          border: "var(--border-color)",
          subtle: "var(--border-subtle)",
          tableHover: "var(--table-hover)",
          tableHeader: "var(--table-header)",
          tableAlt: "var(--table-alt)",
          navbarBg: "var(--navbar-bg)",
          navbarText: "var(--navbar-text)",
        },
        brutal: {
          bg: "#0D0D0D",
          card: "#141414",
          surface: "#1F1F1F",
          border: "#000000",
          borderLight: "#333333",
          green: "#00FF66",
          greenDark: "#00CC52",
          yellow: "#FFE600",
          red: "#FF3366",
          cyan: "#00F0FF",
          lightBg: "#F4F4F0",
          lightCard: "#FFFFFF",
        }
      },
      fontFamily: {
        sans: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["Space Mono", "JetBrains Mono", "Courier New", "monospace"],
      },
      boxShadow: {
        brutal: "4px 4px 0px #000000",
        'brutal-green': "4px 4px 0px #00FF66",
        'brutal-lg': "8px 8px 0px #000000",
        'brutal-sm': "2px 2px 0px #000000",
        'brutal-inset': "inset 3px 3px 0px #000000",
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
      }
    },
  },
  plugins: [],
};
