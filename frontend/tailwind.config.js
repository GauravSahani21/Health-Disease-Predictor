/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: {
          DEFAULT: '#B9FF66',
          50: '#F4FFE6',
          100: '#EAFFCC',
          200: '#DCFF99',
          300: '#B9FF66',
          400: '#A3E85C',
          500: '#8CCF52',
        },
        dark: {
          DEFAULT: '#191A23',
          50: '#292A33',
          100: '#1F202A',
          200: '#191A23',
        },
        light: {
          DEFAULT: '#F3F3F3',
          50: '#FAFAFA',
          100: '#F3F3F3',
        },
        primary: {
          50: '#F4FFE6',
          100: '#EAFFCC',
          200: '#DCFF99',
          300: '#B9FF66',
          400: '#A3E85C',
          500: '#8CCF52',
          600: '#B9FF66',
          700: '#8CCF52',
          800: '#191A23',
          900: '#191A23',
        },
        severity: {
          minor: '#10b981',
          moderate: '#f59e0b',
          severe: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-left': 'slideInLeft 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
