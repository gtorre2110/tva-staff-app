import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Nell'ambiente beta (VITE_APP_ENV=beta) manifest e icone puntano ai file
// con la fascia rossa "BETA" in public/beta/. In produzione restano
// quelli originali in public/, che non vengono mai modificati.
function iconeBeta(env) {
  return {
    name: 'icone-beta',
    transformIndexHtml(html) {
      if (env.VITE_APP_ENV !== 'beta') return html
      return html
        .replace('href="/manifest.json"', 'href="/beta/manifest.json"')
        .replace('href="/favicon-32.png"', 'href="/beta/favicon-32.png"')
        .replace('href="/favicon-16.png"', 'href="/beta/favicon-16.png"')
        .replace('href="/apple-touch-icon.png"', 'href="/beta/apple-touch-icon.png"')
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), iconeBeta(env)],
  }
})
