import { FFmpeg } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js';
import { fetchFile, toBlobURL } from 'https://unpkg.com/@ffmpeg/util@0.12.2/dist/esm/index.js';

const $ = (id) => document.getElementById(id);
const clips = {
  1: { file: null, duration: 0, start: 0, end: 0, previewUrl: null },
  2: { file: null, duration: 0, start: 0, end: 0, previewUrl: null }
};
let ffmpeg = null;
let outputUrl = null;
let busy = false;

function fmt(seconds, full = true) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  seconds = Math.floor(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return full ? [h,m,s].map(n => String(n).padStart(2,'0')).join(':') : (h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
}
function parseTime(value) {
  const v = String(value || '').trim();
  if (!v) return NaN;
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v);
  const parts = v.split(':').map(Number);
  if (parts.some(n => !Number.isFinite(n) || n < 0)) return NaN;
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  if (parts.length === 2) return parts[0]*60 + parts[1];
  return NaN;
}
function setProgress(percent, label, detail='') {
  $('progressWrap').hidden = false;
  $('progressBar').style.width = `${Math.max(0, Math.min(100, percent))}%`;
  $('progressPercent').textContent = `${Math.round(percent)}%`;
  $('progressLabel').textContent = label;
  $('progressDetail').textContent = detail;
}
function updateTotal() {
  let total = 0;
  for (const n of [1,2]) {
    const c = clips[n];
    if (c.file) total += Math.max(0, c.end - c.start);
  }
  $('totalDuration').textContent = clips[1].file && clips[2].file ? fmt(total, false) : '—';
  $('joinBtn').disabled = busy || !clips[1].file || !clips[2].file || clips[1].end <= clips[1].start || clips[2].end <= clips[2].start;
  $('joinBtnText').textContent = !clips[1].file || !clips[2].file ? 'Add both videos to continue' : 'Join videos & prepare download';
}
function syncFromInputs(n, source) {
  const c = clips[n];
  if (!c.file) return;
  let start = parseTime($(`start${n}`).value);
  let end = parseTime($(`end${n}`).value);
  if (source === 'start') start = Number($(`rangeStart${n}`).value);
  if (source === 'end') end = Number($(`rangeEnd${n}`).value);
  start = Math.max(0, Math.min(c.duration, Number.isFinite(start) ? start : 0));
  end = Math.max(0, Math.min(c.duration, Number.isFinite(end) ? end : c.duration));
  if (start >= end) {
    if (source === 'start') start = Math.max(0, end - 0.25);
    else end = Math.min(c.duration, start + 0.25);
  }
  c.start = start; c.end = end;
  $('start'+n).value = fmt(start);
  $('end'+n).value = fmt(end);
  $('rangeStart'+n).value = start;
  $('rangeEnd'+n).value = end;
  $('startLabel'+n).textContent = fmt(start, false);
  $('endLabel'+n).textContent = fmt(end, false);
  $('duration'+n).textContent = `Selected: ${fmt(end-start, false)} · Total: ${fmt(c.duration, false)}`;
  updateTotal();
}
function attachClip(n, file) {
  if (!file) return;
  if (!file.type.startsWith('video/')) {
    alert('Please choose a video file.');
    return;
  }
  const c = clips[n];
  c.file = file;
  if (c.previewUrl) URL.revokeObjectURL(c.previewUrl);
  c.previewUrl = URL.createObjectURL(file);
  const video = $('preview'+n);
  video.src = c.previewUrl;
  video.hidden = false;
  $('drop'+n).hidden = true;
  $('info'+n).hidden = false;
  $('info'+n).textContent = `${file.name} · ${(file.size/1024/1024).toFixed(1)} MB · Reading duration…`;
  $('status'+n).textContent = 'LOADING';
  $('status'+n).classList.add('ready');
  video.onloadedmetadata = () => {
    c.duration = Number.isFinite(video.duration) ? video.duration : 0;
    c.start = 0; c.end = c.duration;
    $('info'+n).textContent = `${file.name} · ${(file.size/1024/1024).toFixed(1)} MB`;
    $('status'+n).textContent = 'READY';
    $('rangeStart'+n).disabled = false; $('rangeEnd'+n).disabled = false;
    $('rangeStart'+n).max = Math.floor(c.duration);
    $('rangeEnd'+n).max = Math.floor(c.duration);
    $('rangeStart'+n).value = 0; $('rangeEnd'+n).value = Math.floor(c.duration);
    $('start'+n).value = fmt(0); $('end'+n).value = fmt(c.duration);
    syncFromInputs(n);
  };
  video.onerror = () => {
    $('info'+n).textContent = `${file.name} · ${(file.size/1024/1024).toFixed(1)} MB · Preview unavailable; processing may still work.`;
    $('status'+n).textContent = 'SELECTED';
    // Metadata may be unavailable for some containers; ask for a supported browser video.
  };
}
for (const n of [1,2]) {
  $('file'+n).addEventListener('change', e => attachClip(n, e.target.files[0]));
  for (const event of ['dragenter','dragover']) $('drop'+n).addEventListener(event, e => {e.preventDefault();$('drop'+n).classList.add('dragover');});
  for (const event of ['dragleave','drop']) $('drop'+n).addEventListener(event, e => {e.preventDefault();$('drop'+n).classList.remove('dragover');});
  $('drop'+n).addEventListener('drop', e => attachClip(n, e.dataTransfer.files[0]));
  $('start'+n).addEventListener('change', () => syncFromInputs(n, 'start'));
  $('end'+n).addEventListener('change', () => syncFromInputs(n, 'end'));
  $('rangeStart'+n).addEventListener('input', () => syncFromInputs(n, 'start'));
  $('rangeEnd'+n).addEventListener('input', () => syncFromInputs(n, 'end'));
  $('reset'+n).addEventListener('click', () => {
    const c = clips[n]; if (!c.file) return;
    c.start = 0; c.end = c.duration; syncFromInputs(n);
  });
}
function escapeName(name) { return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'clip.mp4'; }
async function getEngine() {
  if (ffmpeg) return ffmpeg;
  ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => {
    if (busy) setProgress(35 + Math.max(0, Math.min(1, progress))*60, 'Processing clips…', 'Progress is approximate and can vary by file size and device.');
  });
  ffmpeg.on('log', ({ message }) => {
    if (/error/i.test(message)) console.warn('FFmpeg:', message);
  });
  setProgress(5, 'Loading video engine…', 'The first run downloads the FFmpeg WebAssembly engine. This may take a little while.');
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
  });
  return ffmpeg;
}
async function safeDelete(engine, name) {
  try { await engine.deleteFile(name); } catch {}
}
$('joinBtn').addEventListener('click', async () => {
  if (busy || !clips[1].file || !clips[2].file) return;
  busy = true; updateTotal(); $('resultBox').hidden = true; $('joinBtnText').textContent = 'Processing…';
  if (outputUrl) { URL.revokeObjectURL(outputUrl); outputUrl = null; }
  const mode = $('mode').value;
  let engine;
  const inputNames = {1:'input1',2:'input2'};
  const trimmedNames = {1:'trim1.mp4',2:'trim2.mp4'};
  try {
    engine = await getEngine();
    setProgress(20, 'Preparing your clips…', 'Large files require enough free memory in your browser.');
    for (const n of [1,2]) {
      const file = clips[n].file;
      await engine.writeFile(inputNames[n], await fetchFile(file));
    }
    const isFast = mode === 'fast';
    for (const n of [1,2]) {
      const c = clips[n];
      const start = Math.max(0, c.start);
      const duration = Math.max(0.25, c.end-c.start);
      setProgress(25 + n*4, `Trimming video ${n}…`, isFast ? 'Fast mode uses stream copy where possible; cuts may land on nearby keyframes.' : 'Re-encoding provides more precise cuts but may take much longer.');
      let args = ['-ss', String(start), '-i', inputNames[n], '-t', String(duration), '-avoid_negative_ts', 'make_zero'];
      if (isFast) {
        args.push('-c','copy','-fflags','+genpts','-movflags','+faststart',trimmedNames[n]);
      } else {
        const height = mode === '720' ? 720 : 480;
        args.push('-vf', `scale=-2:min(${height}\\,ih)`, '-c:v','libx264','-preset','ultrafast','-crf','23','-c:a','aac','-b:a','128k','-movflags','+faststart',trimmedNames[n]);
      }
      await engine.exec(args);
    }
    setProgress(72, 'Joining the clips…', 'The selected part of Video 1 will play before the selected part of Video 2.');
    await engine.writeFile('concat.txt', new TextEncoder().encode("file 'trim1.mp4'\nfile 'trim2.mp4'\n"));
    const outputArgs = ['-f','concat','-safe','0','-i','concat.txt'];
    if (isFast) outputArgs.push('-c','copy');
    else outputArgs.push('-c','copy');
    outputArgs.push('-movflags','+faststart','joined.mp4');
    await engine.exec(outputArgs);
    setProgress(97, 'Preparing your download…', 'Almost done.');
    const data = await engine.readFile('joined.mp4');
    const blob = new Blob([data.buffer], {type:'video/mp4'});
    outputUrl = URL.createObjectURL(blob);
    $('downloadBtn').href = outputUrl;
    $('downloadBtn').download = 'cutfuse-joined.mp4';
    $('resultInfo').textContent = `${(blob.size/1024/1024).toFixed(1)} MB · ${$('totalDuration').textContent} estimated duration`;
    $('resultBox').hidden = false;
    setProgress(100, 'Complete!', 'Your file is ready. Select Download MP4 to save it.');
  } catch (err) {
    console.error(err);
    const message = String(err?.message || err);
    setProgress(0, 'Could not finish this video', 'Try smaller files, Chrome or Edge on a computer, and Fast mode for matching video formats.');
    $('progressDetail').textContent += ` Details: ${message.slice(0,180)}`;
    alert('Video processing failed. Very large videos can exceed browser memory. Try a desktop browser, smaller files, or matching MP4 files in Fast mode.');
  } finally {
    busy = false; updateTotal();
    if ($('progressPercent').textContent === '100%') $('joinBtnText').textContent = 'Join again';
  }
});
updateTotal();
