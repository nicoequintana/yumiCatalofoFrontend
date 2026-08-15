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
      // Open Graph: el backend decide bot-vs-humano y devuelve HTML con
      // meta tags (bot) o un 302 a esta misma SPA (humano). Sin este
      // proxy, en dev '/producto/:id' lo serviría directamente Vite sin
      // pasar por el backend, y el flujo de bots no sería probable localmente.
      '/producto': {
        target: 'http://localhost:4000/og/producto',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/producto/, ''),
      },
    },
  },
})
