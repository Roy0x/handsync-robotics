import React,{useEffect,useRef,useState} from 'react';
import { Activity, Camera, CameraOff, CircleHelp, Cpu, Hand, Maximize2, RotateCcw, ShieldCheck, SlidersHorizontal, Video, Zap } from 'lucide-react';
import Robot from './Robot.jsx';
import { calculatePose, createTracker, drawLandmarks, NEUTRAL } from './tracking.js';

const presets={open:[.02,.02,.02,.02,.02], fist:[1,1,1,1,1], pinch:[.8,.85,.05,.05,.05], point:[.9,.02,1,1,1], peace:[.9,.02,.02,1,1]};
export default function App(){
  const video=useRef(null),overlay=useRef(null),stream=useRef(null),tracker=useRef(null),raf=useRef(0),lastTime=useRef(-1),lastSeen=useRef(0),mounted=useRef(true);
  const [pose,setPose]=useState(NEUTRAL),[cameraOn,setCameraOn]=useState(false),[status,setStatus]=useState('READY'),[error,setError]=useState(''),[tracked,setTracked]=useState(false),[mode,setMode]=useState('DEMO'),[gesture,setGesture]=useState('open'),[smoothing,setSmoothing]=useState(72),[mirror,setMirror]=useState(true),[landmarks,setLandmarks]=useState(true),[fps,setFps]=useState(0);
  const smoothingRef=useRef(smoothing),landmarksRef=useRef(landmarks),modeRef=useRef(mode);
  useEffect(()=>{smoothingRef.current=smoothing},[smoothing]);
  useEffect(()=>{landmarksRef.current=landmarks},[landmarks]);
  useEffect(()=>{modeRef.current=mode},[mode]);
  const stop=()=>{
    cancelAnimationFrame(raf.current);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
    tracker.current?.close();tracker.current=null;lastTime.current=-1;
    if(video.current)video.current.srcObject=null;
    if(overlay.current)overlay.current.getContext('2d')?.clearRect(0,0,overlay.current.width,overlay.current.height);
    setCameraOn(false);setTracked(false);setStatus('READY');setMode('DEMO');
  };
  useEffect(()=>()=>{mounted.current=false;cancelAnimationFrame(raf.current);stream.current?.getTracks().forEach(t=>t.stop());tracker.current?.close()},[]);
  const start=async()=>{
    setError('');setStatus('STARTING');
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera requires HTTPS or localhost and a supported browser.');
      const feed=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:30}},audio:false});
      if(!mounted.current){feed.getTracks().forEach(t=>t.stop());return;}
      stream.current=feed;video.current.srcObject=feed;await video.current.play();setCameraOn(true);setStatus('LOADING MODEL');
      try { tracker.current=await createTracker(); }
      catch(modelError) {
        // Model/CDN failure must never tear down a functioning webcam stream.
        setStatus('MODEL UNAVAILABLE');
        setError(`Camera is running, but hand tracking could not load: ${modelError.message}. Check network access to MediaPipe assets and retry.`);
        return;
      }
      if(!mounted.current)return;
      setMode('LIVE');setStatus('SEARCHING');lastSeen.current=performance.now();
      let frames=0,stamp=performance.now();
      const tick=()=>{
        if(!tracker.current||!video.current||!stream.current)return;
        const now=performance.now();
        if(video.current.readyState>=2 && video.current.currentTime!==lastTime.current){
          lastTime.current=video.current.currentTime;
          try{
            const result=tracker.current.detectForVideo(video.current,now);
            const hand=result.landmarks?.[0];
            if(hand){
              lastSeen.current=now;setTracked(true);setStatus('TRACKING');
              const next=calculatePose(hand);
              setPose(prev=>{const factor=.12+(100-smoothingRef.current)/100*.75;return {...next,curls:next.curls.map((v,i)=>prev.curls[i]+(v-prev.curls[i])*factor),wristX:prev.wristX+(next.wristX-prev.wristX)*factor,wristY:prev.wristY+(next.wristY-prev.wristY)*factor,roll:prev.roll+(next.roll-prev.roll)*factor,pitch:prev.pitch+(next.pitch-prev.pitch)*factor};});
            }else if(now-lastSeen.current>650){setTracked(false);setStatus('SEARCHING');}
            drawLandmarks(overlay.current,landmarksRef.current?hand:null,video.current);
          }catch(e){setError(`Tracking issue: ${e.message}`);}
          frames++;
          if(now-stamp>1000){setFps(Math.round(frames*1000/(now-stamp)));frames=0;stamp=now;}
        }
        raf.current=requestAnimationFrame(tick);
      };tick();
    }catch(e){stop();setStatus('ERROR');setError(e?.message||'Unable to start camera. Check browser camera permission.');}
  };
  const selectGesture=(name)=>{if(cameraOn)stop();setGesture(name);setPose({...NEUTRAL,curls:presets[name]});setMode('DEMO');};
  const reset=()=>{setPose(NEUTRAL);setGesture('open');if(!cameraOn)setMode('DEMO');};
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-symbol"><Hand size={22}/></div><div><strong>HANDSYNC<span className="brand-dot">.</span></strong><small>ROBOTICS LAB</small></div></div>
      <div className="side-caption">WORKSPACE</div>
      <div className="nav-item active"><Activity size={17}/> Motion Studio <span className="nav-marker"/></div>
      <div className="nav-item muted"><Cpu size={17}/> Robot Configuration <span className="soon">SOON</span></div>
      <div className="nav-item muted"><Video size={17}/> Motion Recorder <span className="soon">SOON</span></div>
      <div className="side-spacer"/>
      <div className="system-card"><div className="system-heading"><span className="pulse"/> SYSTEM ONLINE</div><p>Browser-based simulation</p><div className="sys-line"><span>Tracking engine</span><b>MediaPipe</b></div><div className="sys-line"><span>Renderer</span><b>Three.js</b></div><div className="sys-line"><span>Processing</span><b>On-device</b></div></div>
      <div className="side-footer">HANDSYNC / V 0.1.0<br/>EXPERIMENTAL BUILD</div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumbs">WORKSPACE <span>/</span> <strong>MOTION STUDIO</strong></div><div className="top-right"><span className="secure"><ShieldCheck size={14}/> LOCAL PROCESSING</span><div className="avatar">MK</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> LIVE TELEOPERATION INTERFACE</div><h1>Motion Studio <span className="version">BETA 01</span></h1><p>Mirror your hand movements onto a virtual robotic arm in real time.</p></div><div className={'status-pill '+(tracked?'success':'')}><span className="pulse"/> {tracked?'HAND DETECTED':status}</div></div>
        <div className="studio-grid">
          <section className="panel camera-panel"><div className="panel-head"><div className="panel-name"><span className="panel-icon"><Camera size={16}/></span><div><strong>Camera Feed</strong><small>INPUT / HAND TRACKING</small></div></div><span className="panel-tag">CAM 01</span></div>
            <div className="camera-view">
              <video ref={video} autoPlay playsInline muted style={{transform:mirror?'scaleX(-1)':'none',display:cameraOn?'block':'none'}}/>
              <canvas ref={overlay} style={{transform:mirror?'scaleX(-1)':'none',display:cameraOn?'block':'none'}}/>
              {!cameraOn&&<div className="camera-placeholder"><div className="camera-halo"><CameraOff size={35}/></div><strong>Camera is offline</strong><span>Enable your webcam to start hand tracking.</span><button className="primary" onClick={start}><Camera size={16}/> Enable Camera</button></div>}
              {cameraOn&&<><span className="cam-overlay tl">● LIVE INPUT</span><span className="cam-overlay tr">{fps} FPS</span><span className="cam-overlay bl">{tracked?'21 LANDMARKS ACTIVE':'SHOW YOUR HAND'}</span></>}
              <i className="corner c1"/><i className="corner c2"/><i className="corner c3"/><i className="corner c4"/>
            </div>
            <div className="panel-bottom"><span><span className={'dot '+(tracked?'green':'')}/> {cameraOn?(tracked?'Tracking hand':'Waiting for hand'):'No video input'}</span><button className="subtle-button" onClick={cameraOn?stop:start}>{cameraOn?'Stop Camera':'Connect Camera'}</button></div>
          </section>
          <section className="panel robot-panel"><div className="panel-head"><div className="panel-name"><span className="panel-icon aqua"><Cpu size={16}/></span><div><strong>Industrial Robot Simulation</strong><small>OUTPUT / 6-AXIS STYLE ARM + GRIPPER</small></div></div><span className="panel-tag live-tag"><span className="pulse"/> ROBOT 01</span></div>
            <div className="robot-view"><Robot pose={pose}/><div className="robot-watermark">HS-01 <span>/</span> ORANGE INDUSTRIAL ARM</div><div className="viewport-tip">DRAG TO ORBIT · SCROLL TO ZOOM</div><div className="axis-label"><span className="red">X</span><span className="green-text">Y</span><span className="blue">Z</span></div></div>
            <div className="panel-bottom"><span><span className="dot green"/> Simulated joints responding</span><button className="icon-button" title="Reset pose" onClick={reset}><RotateCcw size={16}/></button></div>
          </section>
        </div>
        {error&&<div className="error-banner"><CircleHelp size={17}/><span>{error} You can still use demo gestures below.</span>{cameraOn&&<button onClick={()=>{stop();setTimeout(start,100)}}>Retry tracking</button>}<button onClick={()=>setError('')}>Dismiss</button></div>}
        <div className="bottom-grid">
          <section className="panel controls"><div className="section-head"><div><h2><SlidersHorizontal size={17}/> Motion Controls</h2><p>Test poses without your camera or customize tracking behavior.</p></div><span className="panel-tag">{mode} MODE</span></div>
            <div className="control-label">QUICK GESTURES <span>DEMO MODE</span></div><div className="gestures">{Object.keys(presets).map(g=><button key={g} className={'gesture '+(mode==='DEMO'&&gesture===g?'selected':'')} onClick={()=>selectGesture(g)}><span className="gesture-emoji">{{open:'✋',fist:'✊',pinch:'🤏',point:'☝️',peace:'✌️'}[g]}</span>{g.toUpperCase()}</button>)}</div>
            <div className="slider-line"><div><strong>Motion smoothing</strong><span>Higher values reduce jitter but add lag.</span></div><span className="number">{smoothing}%</span></div><input type="range" min="0" max="95" value={smoothing} onChange={e=>setSmoothing(Number(e.target.value))}/>
            <div className="toggle-row"><label><input type="checkbox" checked={mirror} onChange={e=>setMirror(e.target.checked)}/> Mirror camera preview</label><label><input type="checkbox" checked={landmarks} onChange={e=>setLandmarks(e.target.checked)}/> Show landmarks</label></div>
          </section>
          <section className="panel telemetry"><div className="section-head"><div><h2><Zap size={17}/> Gesture Telemetry</h2><p>Finger flexion drives gripper closure; hand position drives approximate arm motion.</p></div><span className="panel-tag">5 CHANNELS</span></div>
            <div className="joint-bars">{['Thumb','Index','Middle','Ring','Pinky'].map((name,i)=><div className="joint-row" key={name}><span>{name}</span><div className="bar-track"><div className="bar-fill" style={{width:`${Math.round(pose.curls[i]*100)}%`}}/></div><b>{Math.round(pose.curls[i]*100)}%</b></div>)}</div>
            <div className="telemetry-note"><Activity size={14}/> {tracked?'Receiving estimated joint motion from webcam':'Demo values — connect camera for live motion'}</div>
          </section>
        </div>
        <footer className="footer"><span>Prototype: gesture-to-robot mapping, not precise physical teleoperation.</span><span>CAMERA STAYS IN YOUR BROWSER · MODEL DOWNLOAD REQUIRES INTERNET</span></footer>
      </div>
    </main>
  </div>;
}
