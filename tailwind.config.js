/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: { toy: { ink: "#18212f", yellow: "#ffd84d", pink: "#ff6f91", blue: "#5ec8ff", green: "#72d6a4", purple: "#9a7cff" } }
    }
  },
  plugins: []
};
