/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      container: {
        center: true,
        padding: '2rem',
        screens: {
          DEFAULT: '1280px',
        },
      },
      colors: {
        darkGrey: '#18211C',
        paleGrey: '#FAF9F7',
        redText: '#C52F2F',
        darkText: '#1C1B18',
        greyText: '#6E685E',
      },
    },
  },
  plugins: [],
};
