/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7f9',
          100: '#e9eef2',
          200: '#d1dce3',
          300: '#adc0cc',
          400: '#839fb0',
          500: '#4f7288', // Dark Blue - Primary
          600: '#456479',
          700: '#3a5364',
          800: '#334754',
          900: '#2d3d47',
          950: '#1a242b',
        },
        secondary: {
          50: '#edfcfb',
          100: '#d5f6f4',
          200: '#aeecea',
          300: '#77dcd8',
          400: '#3cc7c2',
          500: '#23bdb5', // Blue - Secondary
          600: '#1a8f89',
          700: '#1a726e',
          800: '#1b5b58',
          900: '#1a4b49',
          950: '#0a2827',
        },
        accent: {
          50: '#fff5ed',
          100: '#ffe8d4',
          200: '#fecba8',
          300: '#fda671',
          400: '#f98d39', // Orange - Accent
          500: '#f67109',
          600: '#e65604',
          700: '#bf4107',
          800: '#97340d',
          900: '#7a2d0d',
          950: '#421407',
        },
        highlight: {
          blue: '#76ffff',
          teal: '#48c282',
          yellow: '#fdbe4b',
          red: '#ff4c54',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 2px 6px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.1)',
        'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale': 'scale 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scale: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};