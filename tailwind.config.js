/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#f15e75',
          600: '#e11d48',
          700: '#be123c',
          hover: '#f58d9d',
          dark: '#333333',
          light: '#f8f9fa'
        },
        homey: {
          coral: '#f15e75',
          coralHover: '#f58d9d',
          teal: '#54c4d3',
          navy: '#2b2b2b',
          gray: '#707070',
          border: '#e4e4e4',
          card: '#ffffff'
        }
      },
      fontFamily: {
        sans: ['var(--font-quicksand)', 'Quicksand', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
