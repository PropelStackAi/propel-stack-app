/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',   // Enhancement 27 — Dark Mode: toggle via .dark class on <html>
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: '#4F35C2',  // Primary
          coral:  '#F05A28',  // Accent
          teal:   '#01696F',  // Student
          purple: '#6B21A8',  // Parental
        },
        // Subtle warm surface tones for the consumer-grade feel
        surface: {
          DEFAULT: '#FBFAF7',
          raised:  '#FFFFFF',
          sunk:    '#F3F1EC',
          ink:     '#1A1625',
          muted:   '#6B6680',
        },
      },
      fontFamily: {
        display: ['"Cabinet Grotesk"', 'system-ui', 'sans-serif'],
        body:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:   '0 1px 2px rgba(26,22,37,0.04), 0 4px 12px rgba(26,22,37,0.06)',
        raised: '0 4px 8px rgba(26,22,37,0.06), 0 12px 32px rgba(26,22,37,0.08)',
      },
      borderRadius: {
        'xl2': '1.25rem',
      },
    },
  },
  plugins: [],
};
