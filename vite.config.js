// Primary side panel config (used by default `vite build`)
// Run via: node build.js to execute all 3 builds
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { resolve } from 'path'

const root = new URL('.', import.meta.url).pathname

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'public/manifest.json', dest: '.' },
        { src: 'public/icons', dest: '.' }
      ]
    })
  ],
  root: resolve(root, 'src/sidepanel'),
  build: {
    outDir: resolve(root, 'dist/sidepanel'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, 'src/sidepanel/index.html')
    }
  }
})
