/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#020617",
          panel: "#0b1329",
          card: "#0f172a",
          border: "#1e293b",
          primary: "#06b6d4",
          success: "#10b981",
          danger: "#ef4444",
          warning: "#f59e0b",
          ai: "#8b5cf6"
        }
      },
      fontFamily: {
        mono: ["Consolas", "Monaco", "Courier New", "monospace"],
      }
    },
  },
  plugins: [],
}
