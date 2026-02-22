#!/usr/bin/env node
/**
 * Evident extension build script.
 *
 * Usage:
 *   node build.js              → Chrome build → dist/
 *   BROWSER=firefox node build.js → Firefox build → dist-firefox/
 *
 * Produces (in the target outDir):
 *   manifest.json
 *   icons/icon{16,48,128}.png
 *   sidepanel/index.html + assets/
 *   background/service-worker.js
 *   content/content.js
 *   content/highlight.css
 */
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs'

const root = fileURLToPath(new URL('.', import.meta.url))
const BROWSER = process.env.BROWSER || 'chrome'
const isFirefox = BROWSER === 'firefox'
const outDir = resolve(root, isFirefox ? 'dist-firefox' : 'dist')
const manifestSrc = resolve(root, isFirefox ? 'public/manifest-firefox.json' : 'public/manifest.json')

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

// Clean output directory
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true })
}

// ─── 1. Side panel ────────────────────────────────────────────────────────────
console.log('▶ Building side panel…')
await build({
  configFile: false,
  plugins: [react()],
  root,
  publicDir: false,
  build: {
    outDir,
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
    outDir: resolve(outDir, 'content'),
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
ensureDir(resolve(outDir, 'content'))
copyFileSync(
  resolve(root, 'src/content/highlight.css'),
  resolve(outDir, 'content/highlight.css')
)
console.log('✔ Content script built')

// ─── 3. Service worker ────────────────────────────────────────────────────────
// Chrome: ES module format (service_worker with "type": "module")
// Firefox: IIFE format (background.scripts — event page, no ES module support)
console.log('▶ Building service worker…')
await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: resolve(outDir, 'background'),
    emptyOutDir: false,
    lib: {
      entry: resolve(root, 'src/background/service-worker.js'),
      formats: [isFirefox ? 'iife' : 'es'],
      name: isFirefox ? 'EvidentBackground' : undefined,
      fileName: () => 'service-worker.js'
    },
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  },
  logLevel: 'warn'
})
console.log('✔ Service worker built')

// ─── 4. Copy static assets ────────────────────────────────────────────────────
copyFileSync(manifestSrc, resolve(outDir, 'manifest.json'))
copyDir(resolve(root, 'public/icons'), resolve(outDir, 'icons'))
// Use nobg logo for extension icons (toolbar, etc.)
const nobgPath = resolve(root, 'public/evident-nobg.png')
if (existsSync(nobgPath)) {
  for (const size of [16, 48, 128]) {
    copyFileSync(nobgPath, resolve(outDir, 'icons', `icon${size}.png`))
  }
}
// Score-colored icons for toolbar (setIcon by tier; same size keys as default_icon)
const tierIcons = [
  { tier: 'green', file: 'evident-nobg-green.png' },
  { tier: 'yellow', file: 'evident-nobg-yellow.png' },
  { tier: 'red', file: 'evident-nobg-red.png' }
]
for (const { tier, file } of tierIcons) {
  const src = resolve(root, 'public', file)
  if (existsSync(src)) {
    for (const size of [16, 48]) {
      copyFileSync(src, resolve(outDir, 'icons', `icon${size}-${tier}.png`))
    }
  }
}

// ─── 5. Fix sidepanel index.html location ─────────────────────────────────────
// Vite outputs HTML relative to project root, so it lands at <outDir>/src/sidepanel/index.html.
// Move it to <outDir>/sidepanel/index.html to match the manifest's default_path.
const htmlFromRoot = resolve(outDir, 'src/sidepanel/index.html')
const htmlTarget = resolve(outDir, 'sidepanel/index.html')
if (existsSync(htmlFromRoot)) {
  ensureDir(resolve(outDir, 'sidepanel'))
  copyFileSync(htmlFromRoot, htmlTarget)
  rmSync(resolve(outDir, 'src'), { recursive: true })
}

const targetDirName = isFirefox ? 'dist-firefox' : 'dist'
const loadInstructions = isFirefox
  ? `   Load /${targetDirName} in Firefox: about:debugging → Load Temporary Add-on → select manifest.json`
  : `   Load /${targetDirName} as unpacked extension in Chrome.`

console.log(`\n✅ All builds complete (${BROWSER}).`)
console.log(loadInstructions)
