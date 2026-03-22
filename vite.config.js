import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // base: './' makes all asset paths relative — works on GitHub Pages,
  // Vercel, Netlify, and any subdirectory deployment without changes.
  base: './',
})
