# CutFuse — Flat ZIP Website

A static, dark-theme video trim + join website for GitHub Pages. The ZIP is **flat**: `index.html`, `style.css`, `app.js`, and `README.md` are at the ZIP root, not inside a folder.

## Features
- Select two local video files, in order.
- Set start/end trim points with time fields or sliders.
- Join the kept parts and download an MP4.
- Fast mode attempts stream-copy; 720p and 480p modes re-encode clips.
- No mute feature.
- No video upload server; files are processed in the browser using FFmpeg WebAssembly.

## Publish on GitHub Pages
1. Create a GitHub repository.
2. Extract this ZIP and upload the **four files themselves** to the repository root.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
5. Open the Pages URL. Use a modern desktop Chrome or Edge for best results.

## Important limitations
- This is a browser-only implementation. It is free to host as a static site, but it cannot guarantee that a 1–2 hour video will finish within five minutes.
- FFmpeg WebAssembly may be slow or run out of memory on large files, especially on phones. For large videos, a PC is strongly recommended.
- Fast mode is fastest when both clips have compatible codecs, resolution, frame rate, and audio format. Stream-copy trims may snap to nearby keyframes and concatenation may fail if the clips are incompatible.
- 720p/480p modes re-encode clips and are more likely to give consistent output, but can take much longer.
- The first run downloads FFmpeg WebAssembly from unpkg.com, so an internet connection is required. A static GitHub Pages site does not itself provide server-side video processing.
- Use videos you own or have permission to edit.

## Troubleshooting
- If the browser cannot process large files, try a PC, close other tabs, and use Fast mode.
- If joining fails, try MP4 clips with matching encoding settings, or choose 720p mode.
- This version is a functional starter, not a replacement for a native desktop FFmpeg installation.
