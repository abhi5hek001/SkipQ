/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        skipqYellow: '#fef3c7',
        skipqGray: '#f3f4f6',
      }
    },
  },
  plugins: [],
}
