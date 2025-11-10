/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html"
    ],
    theme: {
      extend: {
        colors: {
          // Nature-inspired color palette
          forest: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
            950: '#052e16'
          },
          earth: {
            50: '#fefdf8',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f',
            950: '#451a03'
          },
          sage: {
            50: '#f7fee7',
            100: '#ecfccb',
            200: '#d9f99d',
            300: '#bef264',
            400: '#a3e635',
            500: '#84cc16',
            600: '#65a30d',
            700: '#4d7c0f',
            800: '#3f6212',
            900: '#365314',
            950: '#1a2e05'
          }
        },
        fontFamily: {
          sans: [
            'Inter',
            '-apple-system',
            'BlinkMacSystemFont',
            'Segoe UI',
            'Roboto',
            'Oxygen',
            'Ubuntu',
            'Cantarell',
            'Fira Sans',
            'Droid Sans',
            'Helvetica Neue',
            'sans-serif'
          ]
        },
        spacing: {
          '18': '4.5rem',
          '88': '22rem',
          '128': '32rem'
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-in-out',
          'slide-up': 'slideUp 0.5s ease-out',
          'slide-down': 'slideDown 0.5s ease-out',
          'scale-in': 'scaleIn 0.3s ease-out',
          'bounce-slow': 'bounce 2s infinite',
          'pulse-slow': 'pulse 2s infinite'
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' }
          },
          slideUp: {
            '0%': { transform: 'translateY(20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' }
          },
          slideDown: {
            '0%': { transform: 'translateY(-20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' }
          },
          scaleIn: {
            '0%': { transform: 'scale(0.95)', opacity: '0' },
            '100%': { transform: 'scale(1)', opacity: '1' }
          }
        },
        backgroundImage: {
          'nature-gradient': 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #fef7ed 100%)',
          'forest-gradient': 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)',
          'earth-gradient': 'linear-gradient(135deg, #92400e 0%, #a16207 50%, #ca8a04 100%)',
          'sage-gradient': 'linear-gradient(135deg, #365314 0%, #4d7c0f 50%, #65a30d 100%)'
        },
        boxShadow: {
          'nature': '0 4px 6px -1px rgba(16, 185, 129, 0.1), 0 2px 4px -1px rgba(16, 185, 129, 0.06)',
          'nature-lg': '0 10px 15px -3px rgba(16, 185, 129, 0.1), 0 4px 6px -2px rgba(16, 185, 129, 0.05)',
          'earth': '0 4px 6px -1px rgba(146, 64, 14, 0.1), 0 2px 4px -1px rgba(146, 64, 14, 0.06)',
          'earth-lg': '0 10px 15px -3px rgba(146, 64, 14, 0.1), 0 4px 6px -2px rgba(146, 64, 14, 0.05)'
        },
        borderRadius: {
          'xl': '0.75rem',
          '2xl': '1rem',
          '3xl': '1.5rem'
        },
        screens: {
          'xs': '475px'
        },
        zIndex: {
          '60': '60',
          '70': '70',
          '80': '80',
          '90': '90',
          '100': '100'
        }
      }
    },
    plugins: [
      require('@tailwindcss/forms')({
        strategy: 'class'
      }),
      require('@tailwindcss/typography'),
      require('@tailwindcss/aspect-ratio'),
      function({ addUtilities, addComponents, theme }) {
        // Custom utilities
        addUtilities({
          '.text-shadow': {
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          },
          '.text-shadow-md': {
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          },
          '.text-shadow-lg': {
            textShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          },
          '.scrollbar-hide': {
            '-ms-overflow-style': 'none',
            'scrollbar-width': 'none',
            '&::-webkit-scrollbar': {
              display: 'none'
            }
          }
        });
  
        // Custom components
        addComponents({
          '.btn-nature': {
            '@apply inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2': {},
          },
          '.btn-nature-primary': {
            '@apply btn-nature bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 focus:ring-green-500': {},
          },
          '.btn-nature-secondary': {
            '@apply btn-nature bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 focus:ring-amber-500': {},
          },
          '.card-nature': {
            '@apply bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-green-100': {},
          },
          '.input-nature': {
            '@apply block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors': {},
          }
        });
      }
    ]
  };