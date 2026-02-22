# Deploying Evident

Full deployment reference for all three independently deployable pieces:

1. [Chrome + Firefox extension](#1-chrome--firefox-extension-release)
2. [TTS proxy (Google Cloud Run)](#2-tts-proxy-google-cloud-run)
3. [Backend (Bun server on VPS)](#3-backend-bun-server-on-vps)

---

## 1. Chrome + Firefox Extension Release

### Prerequisites

- `npm` installed
- `gh` CLI authenticated (`gh auth status`)
- Both manifests bumped to the new version (`public/manifest.json` and `public/manifest-firefox.json`)

### Steps

```bash
# 1. Bump version in BOTH manifests (e.g. 2.3.0 → 2.4.0)
#    Edit public/manifest.json and public/manifest-firefox.json manually

# 2. Build and zip both targets
npm run zip:chrome    # → evident-chrome.zip (from dist/)
npm run zip:firefox   # → evident-firefox.zip (from dist-firefox/)

# 3. Commit, tag, and push
git add public/manifest.json public/manifest-firefox.json
git commit -m "v2.x.x — <short description>"
git push origin main
git tag v2.x.x
git push origin v2.x.x

# 4. Create GitHub release with both zips attached
gh release create v2.x.x evident-chrome.zip evident-firefox.zip \
  --title "v2.x.x — <short description>" \
  --notes "<release notes>"
```

Stable download URLs (always resolve to the latest release):
- Chrome: `https://github.com/FallThunder/hack-at-davidson-26/releases/latest/download/evident-chrome.zip`
- Firefox: `https://github.com/FallThunder/hack-at-davidson-26/releases/latest/download/evident-firefox.zip`

---

## 2. TTS Proxy (Google Cloud Run)

Flask + Gunicorn server in `tts-proxy/`. Deployed to GCP project `evident-tts`, region `us-east1`.

### Prerequisites

- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- Active project set: `gcloud config set project evident-tts`
- Environment variables configured in Cloud Run (set once via Console or CLI — they persist across deploys):
  - `GEMINI_API_KEY` — Google AI Studio key
  - `ELEVENLABS_API_KEY` — ElevenLabs key
  - `VOICE_ID` — ElevenLabs voice ID (default: Rachel `21m00Tcm4TlvDq8ikWAM`)

### Deploy

```bash
gcloud run deploy tts-proxy \
  --source tts-proxy/ \
  --region us-east1 \
  --project evident-tts \
  --allow-unauthenticated
```

Cloud Run builds from `tts-proxy/` using the `Dockerfile` (or buildpacks if none). The service URL is:

```
https://tts-proxy-949682912789.us-east1.run.app
```

Set this in `.env` (not committed — see `.env.example`):

```
VITE_TTS_PROXY_URL=https://tts-proxy-949682912789.us-east1.run.app
```

### Verify

```bash
curl -X POST https://tts-proxy-949682912789.us-east1.run.app/tts \
  -H "Content-Type: application/json" \
  -d '{"headline":"Test","trustScore":{"score":72,"tier":"caution"},"flags":[],"siteProfile":{}}' \
  --output test.mp3 && open test.mp3
```

Health check: `curl https://tts-proxy-949682912789.us-east1.run.app/health`

### Update environment variables

```bash
gcloud run services update tts-proxy \
  --region us-east1 \
  --project evident-tts \
  --set-env-vars GEMINI_API_KEY=...,ELEVENLABS_API_KEY=...,VOICE_ID=...
```

---

## 3. Backend (Bun Server on VPS)

The analysis backend (`backend/main.ts`) is a Bun server deployed to a VPS by a collaborator. It is NOT part of this repo's CI — deploy manually via rsync when needed.

### Deploy

```bash
rsync -avP backend/main.ts debian@core-psnsv:/home/debian/had26/hack-at-davidson-26/backend/main.ts
```

Then SSH in and restart the server process as needed.

Backend URL: `https://factcheck2.coredoes.dev`
