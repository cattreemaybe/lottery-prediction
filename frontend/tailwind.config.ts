import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#d32f2f',
        secondary: '#1976d2',
        accent: '#ffa000'
      }
    }
  },
  plugins: []
};

export default config;
