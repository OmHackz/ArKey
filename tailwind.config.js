/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './login.html',
    './dashboard.html',
    './vault.html',
    './authenticator.html',
    './settings.html',
    './src/**/*.{js,html,css}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        secondary: '#f5f5f5',
        background: '#ffffff',
        muted: '#737373',
        border: '#e5e5e5',
        surface: '#fafafa',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.04)',
        card: '0 1px 4px rgba(0, 0, 0, 0.06)',
        elevated: '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}
