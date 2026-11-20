import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base './' => relative asset paths, works on any GitHub Pages repo name
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: { environment: 'node' },
})
