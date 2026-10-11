import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
    manifest: {
      name: 'Rancho da Cozinha', short_name: 'Rancho', description: 'Seu caderno de receitas da casa', lang: 'pt-BR',
      theme_color: '#35150B', background_color: '#F3EAD8', display: 'standalone',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: { navigateFallback: '/index.html', globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] }
  })]
})
