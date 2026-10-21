/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['"IBM Plex Sans"', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'monospace'],
    },
    extend: {},
  },
  plugins: [],
}
