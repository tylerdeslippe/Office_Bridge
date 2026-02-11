/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Construction-themed colors
        'hard-hat': '#F59E0B',
        'steel': '#64748B',
        'concrete': '#9CA3AF',
        'safety-orange': '#F97316',
        'blueprint': '#1E40AF',
        'field-green': '#22C55E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
