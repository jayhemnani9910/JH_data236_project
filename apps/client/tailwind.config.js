module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#ff6d00',
          dark: '#e65f00',
          light: '#ffe0cc',
        },
      },
      boxShadow: {
        'card': '0 8px 24px rgba(15, 23, 42, 0.12)',
      },
      borderRadius: {
        'xl': '1rem',
      },
    },
  },
  plugins: [],
};
