/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        main: '#FFFFFF',
        soft: '#CAF0F8',
        accent: '#90E0EF',
        primary: '#0077B6',
        'primary-dark': '#03045E',
      }
    },
  },
  plugins: [],
}
