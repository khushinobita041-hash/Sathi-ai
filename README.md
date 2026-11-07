# SATHI AI – Free Edition

A responsive, installable web app/PWA with a small local AI model. It uses Transformers.js and the public model `onnx-community/SmolLM2-360M-Instruct`.

## Requirements
- Chrome or another modern browser
- Internet for the first model download
- A device with enough free RAM/storage; small phones may struggle
- Microphone permission for voice input

## Run locally
Do not open `index.html` directly as a file. Serve the folder over HTTP:

### Option A: Python
```bash
python -m http.server 8000
```
Open `http://localhost:8000`.

### Option B: Node
```bash
npx serve .
```

## Use on Android
1. Upload the folder to a static HTTPS host (for example GitHub Pages or Netlify).
2. Open the HTTPS site in Chrome on Android.
3. Allow the model to download on first launch.
4. Use Chrome menu → Add to Home screen / Install app.

## Important limitations
- This is a small local model, not ChatGPT-level reasoning.
- The model is downloaded from Hugging Face on first use. There may be large downloads and device-specific performance limits.
- No live web search is included. The assistant must not be treated as a source of current facts.
- Browser speech recognition availability varies by browser/device and may require internet.
- Chat history is stored in localStorage on this device. Clearing browser data removes it.
- The app does not send chat messages to an application server, but model files are fetched from the model host.
- Do not add private API keys to frontend code.

## Troubleshooting
- If WebGPU fails, the app attempts a slower WASM fallback.
- If model loading fails, refresh with a stable connection or try a newer Chrome browser.
- If the device closes the tab or runs out of memory, use a device with more RAM or a smaller supported model.
