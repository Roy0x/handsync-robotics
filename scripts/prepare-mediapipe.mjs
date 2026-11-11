import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const src = resolve('node_modules/@mediapipe/tasks-vision/wasm');
const dest = resolve('public/mediapipe/wasm');
const model = resolve('public/mediapipe/hand_landmarker.task');
const url = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

try {
  await mkdir(dest, {recursive:true});
  await cp(src,dest,{recursive:true,force:true});
  console.log('[HandSync] MediaPipe WASM installed locally.');
} catch (e) {
  console.warn('[HandSync] Could not copy WASM:', e.message);
}

try {
  if ((await stat(model)).size > 1000000) {
    console.log('[HandSync] Hand model is already cached locally.');
    process.exit(0);
  }
} catch { /* model absent */ }

try {
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<1000000)throw new Error('Unexpectedly small model file');
  await mkdir(resolve('public/mediapipe'),{recursive:true});
  await writeFile(model,bytes);
  console.log(`[HandSync] Hand model cached locally (${(bytes.length/1048576).toFixed(1)} MiB).`);
}catch(e){
  console.warn(`[HandSync] Model download unavailable: ${e.message}. App will attempt online fallback.`);
}
