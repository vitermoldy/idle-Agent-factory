import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// On Windows the project can be opened as c:\... or C:\...; Vite then resolves React once per
// spelling, two copies load, and the first hook crashes. Pin the root to one spelling.
const root = fileURLToPath(new URL('.', import.meta.url)).replace(/^[a-z]:/, (d) => d.toUpperCase())
// The server (npm run server) keeps a copy of the save in MySQL; dev and preview forward /api to it.
const api = { '/api': { target: `http://localhost:${process.env.PORT ?? 8796}` } }

export default defineConfig({
  root,
  // Relative asset paths, so the built game runs from any folder or static host.
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': root + 'src' },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    // three.js alone is about 600 kB; one bundle keeps the module order simple.
    chunkSizeWarningLimit: 1200,
  },
})
