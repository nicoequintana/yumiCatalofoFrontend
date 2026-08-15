import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev convenience only — `products.js` calls the backend via an
    // absolute `VITE_API_BASE_URL`, so this proxy isn't load-bearing, but
    // it keeps `/api/*` reachable same-origin too (design D8) and avoids
    // surprises for anything that assumes a relative path.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
