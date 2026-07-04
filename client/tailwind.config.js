/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0EA5E9',
          dark: '#0284C7',
          light: '#38BDF8',
        },
        accent: '#1E3A5F',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
  safelist: [
    'flex-row-reverse',
    'rtl:flex-row-reverse',
    'ltr:translate-x-8',
    'rtl:-translate-x-8',
    'ltr:origin-bottom-right',
    'rtl:origin-bottom-left',
  ],
}
