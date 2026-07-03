/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        liberty: {
          DEFAULT: '#004B8D',
          sky: '#00ABE7',
        }
      }
    },
  },
  plugins: [],
}
