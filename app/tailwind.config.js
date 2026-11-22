/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#DD8E45', // Orange
        secondary: '#F0F4FF', // Light blue 
        dark: '#1A1F36', // Dark color for text
      },
    },
  },
  plugins: [],
} 