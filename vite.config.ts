import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// On Windows the project can be opened as c:\... or C:\...; Vite then resolves React once per
// spelling, two copies load, and the first hook crashes. Pin the root to one spelling.
const root = fileURLToPath(new URL('.', import.meta.url)).replace(/^[a-z]:/, (d) => d.toUpperCase())

export default defineConfig({
  root,
  // Relative asset paths, so the built game runs from any folder or static host.
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': root + 'src' },
