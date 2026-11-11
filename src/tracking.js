import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const TASK_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';
const local = path => `${import.meta.env.BASE_URL}mediapipe/${path}`;
const readable = e => e?.message || e?.toString?.() || JSON.stringify(e) || 'Unknown initialization error';
export const NEUTRAL = { curls: [0.12, 0.1, 0.1, 0.1, 0.1], joints: Array.from({length:5},()=>[0,0,0]),spread:[0,0,0,0,0], grip: 0, gesture: 'OPEN', wristX: 0, wristY: 0, roll: 0, pitch: 0 };
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const angle = (a,b,c) => {
  const u = [a.x-b.x,a.y-b.y,a.z-b.z], v = [c.x-b.x,c.y-b.y,c.z-b.z];
  const dot = u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
  const mag = Math.hypot(...u)*Math.hypot(...v);
  return Math.acos(clamp(dot / (mag || 1), -1, 1));
};
export function calculatePose(lm) {
  // Bend measured at MCP/PIP joints, not fingertip-screen distance alone.
  const chains = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
  const joints = chains.map(([a,b,c,d],i)=>{
    const mcp=clamp((Math.PI-angle(lm[0],lm[a],lm[b]))/1.55);
    const pip=clamp((Math.PI-angle(lm[a],lm[b],lm[c]))/1.55);
    const dip=clamp((Math.PI-angle(lm[b],lm[c],lm[d]))/1.55);
    return [i===0?clamp((mcp+pip)*.45):mcp,pip,dip];
  });
  // Relative fingertip MCP spread in image space; approximate only under hand rotation.
  const palmAxis=Math.atan2(lm[5].y-lm[17].y,lm[5].x-lm[17].x);
  const spread=chains.map(([a,b])=>clamp(Math.atan2(lm[b].y-lm[a].y,lm[b].x-lm[a].x)-palmAxis,-1,1));
  const curls = chains.map(([a,b,c,d], i) => {
    const pipBend = 1 - angle(lm[a],lm[b],lm[c]) / Math.PI;
    const dipBend = 1 - angle(lm[b],lm[c],lm[d]) / Math.PI;
    const mcpBend = i === 0 ? 0 : 1 - angle(lm[0],lm[a],lm[b]) / Math.PI;
    return clamp((pipBend * .55 + dipBend * .25 + mcpBend * .20 - .06) * 1.8);
  });
  const base = lm[0], index = lm[5], pinky = lm[17], middle = lm[9];
  // Normalize the thumb/index tip gap by palm width to remain usable at different camera distances.
  const palmWidth = distance(lm[5], lm[17]) || .1;
  const pinchRatio = distance(lm[4],lm[8]) / palmWidth;
  const closedCount = curls.slice(1).filter(c=>c>.48).length;
  const isPinch = pinchRatio < .42;
  const isFist = closedCount >= 3;
  const isOpen = curls.slice(1).every(c=>c<.32);
  const gesture = isPinch ? 'PINCH' : isFist ? 'FIST' : isOpen ? 'OPEN' : 'MOVE';
  const grip = isPinch ? 1 : isFist ? .9 : isOpen ? 0 : clamp(curls.slice(1).reduce((a,b)=>a+b,0)/4);
  const across = {x:index.x-pinky.x,y:index.y-pinky.y};
  const roll = clamp(Math.atan2(across.y,across.x) / 1.5, -1, 1);
  const palmLength = distance(base,middle);
  return {
    curls, joints, spread, grip, gesture, wristX: clamp((.5-base.x)*2,-1,1), wristY: clamp((.55-base.y)*2,-1,1),
    roll, pitch: clamp((middle.z-base.z)/(palmLength || .1),-1,1)
  };
}
export async function createTracker() {
  const failures=[];
  const sources=[
    {wasm:local('wasm'),model:local('hand_landmarker.task'),label:'local cached assets'},
    {wasm:local('wasm'),model:TASK_URL,label:'local WASM + online model'},
    {wasm:WASM_URL,model:TASK_URL,label:'online fallback'}
  ];
  for(const source of sources){
    try {
      // A missing model is a common Vite SPA 200/HTML fallback; check before passing it to MediaPipe.
      const check=await fetch(source.model,{method:'GET',signal:AbortSignal.timeout(12000)});
      const type=check.headers.get('content-type')||'';
      if(!check.ok || type.includes('text/html'))throw new Error(`model URL returned HTTP ${check.status} (${type||'no content-type'})`);
      const vision=await FilesetResolver.forVisionTasks(source.wasm);
      for(const delegate of ['CPU','GPU']){
        try {
          return await HandLandmarker.createFromOptions(vision,{
            baseOptions:{modelAssetPath:source.model,delegate},runningMode:'VIDEO',numHands:1,
            minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5
          });
        }catch(e){failures.push(`${source.label} (${delegate}): ${readable(e)}`);}
      }
    }catch(e){failures.push(`${source.label}: ${readable(e)}`);}
  }
  throw new Error(`Hand model initialization failed. ${failures.join(' | ').slice(0,900)}`);
}
export function drawLandmarks(canvas, landmarks, video) {
  const ctx=canvas.getContext('2d');
  canvas.width=video.videoWidth || 640; canvas.height=video.videoHeight || 480;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!landmarks) return;
  const edges=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  ctx.strokeStyle='#5ef4cb';ctx.lineWidth=2.5;ctx.lineCap='round';
  edges.forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(landmarks[a].x*canvas.width,landmarks[a].y*canvas.height);ctx.lineTo(landmarks[b].x*canvas.width,landmarks[b].y*canvas.height);ctx.stroke();});
  landmarks.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x*canvas.width,p.y*canvas.height,i===0?5:3,0,Math.PI*2);ctx.fillStyle=i===0?'#fff':'#7dfde1';ctx.fill();});
}
