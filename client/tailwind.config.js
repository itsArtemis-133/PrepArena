/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // covers all relevant React files
  ],
  darkMode: 'class', // or 'media' if you want OS-level control
  theme: {
    extend: {},
  },
  plugins: [],
}
