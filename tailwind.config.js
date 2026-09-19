/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0a0c14',
          card: '#161b22',
          panel: '#0d1117',
          cyan: '#00f2ff',
          amber: '#ffaa00',
          red: '#ff4d4d',
          green: '#00ff88',
          purple: '#bb86fc',
          border: 'rgba(0, 242, 255, 0.15)',
          text: '#e6edf3',
          dim: '#8b949e'
        }
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        noto: ['Noto Sans KR', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
