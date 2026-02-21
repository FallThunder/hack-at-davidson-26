#!/usr/bin/env node
/**
 * Evident extension build script.
 * Produces:
 *   dist/manifest.json
 *   dist/icons/icon{16,48,128}.png
 *   dist/sidepanel/index.html + assets/
 *   dist/background/service-worker.js
 *   dist/content/content.js
 *   dist/content/highlight.css
 */
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs'

const root = fileURLToPath(new URL('.', import.meta.url))

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

function copyDir(src, dest) {
  ensureDir(dest)
  for (const file of readdirSync(src, { withFileTypes: true })) {
    const srcPath = resolve(src, file.name)
    const destPath = resolve(dest, file.name)
    if (file.isDirectory()) copyDir(srcPath, destPath)
    else copyFileSync(srcPath, destPath)
  }
}

// Clean dist
if (existsSync(resolve(root, 'dist'))) {
  rmSync(resolve(root, 'dist'), { recursive: true })
}

// ─── 1. Side panel ────────────────────────────────────────────────────────────
console.log('▶ Building side panel…')
await build({
  configFile: false,
  plugins: [react()],
  root,
  publicDir: false,
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: { sidepanel: resolve(root, 'src/sidepanel/index.html') },
      output: {
        entryFileNames: 'sidepanel/assets/[name]-[hash].js',
        chunkFileNames: 'sidepanel/assets/[name]-[hash].js',
        assetFileNames: 'sidepanel/assets/[name]-[hash][extname]'
      }
    }
  },
  logLevel: 'warn'
})
console.log('✔ Side panel built')

// ─── 2. Content script ────────────────────────────────────────────────────────
console.log('▶ Building content script…')
await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: resolve(root, 'dist/content'),
    emptyOutDir: false,
    lib: {
      entry: resolve(root, 'src/content/content.js'),
      formats: ['iife'],
      name: 'EvidentContent',
      fileName: () => 'content.js'
    },
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  },
  logLevel: 'warn'
})
// Copy highlight.css separately (it's a standalone CSS file, not imported by content.js)
ensureDir(resolve(root, 'dist/content'))
copyFileSync(
  resolve(root, 'src/content/highlight.css'),
  resolve(root, 'dist/content/highlight.css')
)
console.log('✔ Content script built')

// ─── 3. Service worker ────────────────────────────────────────────────────────
console.log('▶ Building service worker…')
await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: resolve(root, 'dist/background'),
    emptyOutDir: false,
    lib: {
      entry: resolve(root, 'src/background/service-worker.js'),
      formats: ['es'],
      fileName: () => 'service-worker.js'
    },
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  },
  logLevel: 'warn'
})
console.log('✔ Service worker built')

// ─── 4. Copy static assets to dist root ──────────────────────────────────────
copyFileSync(resolve(root, 'public/manifest.json'), resolve(root, 'dist/manifest.json'))
copyDir(resolve(root, 'public/icons'), resolve(root, 'dist/icons'))

// ─── 5. Fix sidepanel index.html location ─────────────────────────────────────
// Vite outputs HTML relative to project root, so it lands at dist/src/sidepanel/index.html.
// Move it to dist/sidepanel/index.html to match the manifest's default_path.
const htmlFromRoot = resolve(root, 'dist/src/sidepanel/index.html')
const htmlTarget = resolve(root, 'dist/sidepanel/index.html')
if (existsSync(htmlFromRoot)) {
  ensureDir(resolve(root, 'dist/sidepanel'))
  copyFileSync(htmlFromRoot, htmlTarget)
  rmSync(resolve(root, 'dist/src'), { recursive: true })
}

console.log('\n✅ All builds complete.')
console.log('   Load /dist as unpacked extension in Chrome.')
