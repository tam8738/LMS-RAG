/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        // Heading sizes
        'h1': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],       // 32px
        'h2': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],    // 24px
        'h3': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],                             // 18px
        'h4': ['1rem', { lineHeight: '1.4', fontWeight: '600' }],                                 // 16px
        
        // Body sizes
        'body-lg': ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],                      // 15px
        'body-md': ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }],                       // 14px
        'body-sm': ['0.8125rem', { lineHeight: '1.5', fontWeight: '500' }],                      // 13px
        'body-xs': ['0.75rem', { lineHeight: '1.5', fontWeight: '600' }],                        // 12px
      },
      colors: {
        // Text colors with hierarchy
        'text': {
          'primary': '#1E293B',    // slate-900 → text-text-primary
          'secondary': '#475569',  // slate-600 → text-text-secondary
          'tertiary': '#94A3B8',   // slate-400 → text-text-tertiary
          'muted': '#CBD5E1',      // slate-300 → text-text-muted
        },
      },
      spacing: {
        'section': '2rem',    // 32px
        'block': '1rem',      // 16px
        'element': '0.5rem',  // 8px
      },
    },
  },
  plugins: [],
}
