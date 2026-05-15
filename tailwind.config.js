/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#040d1a',
          surface: '#0c1929',
          card: '#0a2040',
          border: 'rgba(0, 180, 255, 0.2)',
          text: '#aaccdd',
          muted: '#667788'
        },
        cyber: {
          cyan: '#00d4ff',
          blue: '#0066ff',
          teal: '#00ccaa',
          glow: 'rgba(0, 212, 255, 0.5)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        'glow': '0 0 15px rgba(0, 212, 255, 0.3)',
        'glow-lg': '0 0 30px rgba(0, 212, 255, 0.4)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.4)'
      },
      backdropBlur: {
        glass: '12px'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'wave': 'wave 1.2s ease-in-out infinite'
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(2.5)' }
        }
      }
    }
  },
  plugins: []
}
