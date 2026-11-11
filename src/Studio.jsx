import React,{useEffect,useRef,useState} from 'react';
import {Camera,CameraOff,Check,ChevronDown,CircleHelp,Focus,Gamepad2,Hand,Maximize,Move3D,Pause,Play,RotateCcw,Settings2,ShieldCheck,SlidersHorizontal,Sparkles,Video,Wifi,WifiOff,X,Zap} from 'lucide-react';
import Robot from './Robot.jsx';
import RobotHand from './RobotHand.jsx';
import {calculatePose,createTracker,drawLandmarks,NEUTRAL} from './tracking.js';
import './studio.css';

const gestures={open:{label:'Open palm',symbol:'✋',grip:0,curls:[0,0,0,0,0]},fist:{label:'Make a fist',symbol:'✊',grip:1,curls:[1,1,1,1,1]},pinch:{label:'Pinch',symbol:'🤏',grip:1,curls:[.8,.8,0,0,0]},point:{label:'Point',symbol:'☝️',grip:.4,curls:[1,0,1,1,1]}};
const challenges=[{gesture:'OPEN',title:'Release the grip',hint:'Show an open palm to release the robot gripper.'},{gesture:'PINCH',title:'Precision grip',hint:'Touch thumb and index fingertips to close the jaws.'},{gesture:'FIST',title:'Power close',hint:'Make a fist to activate the gripper.'}];
const clamp=(x,min=-1,max=1)=>Math.max(min,Math.min(max,x));

export default function Studio(){
  const video=useRef(null),overlay=useRef(null),stream=useRef(null),tracker=useRef(null),frame=useRef(0),lastFrame=useRef(-1),lastSeen=useRef(0),alive=useRef(true),modeRef=useRef('DEMO'),landmarkRef=useRef(true),smoothRef=useRef(38),startingRef=useRef(false),runRef=useRef(0);
  const [pose,setPose]=useState(NEUTRAL),[robot,setRobot]=useState('hand'),[mode,setMode]=useState('DEMO'),[camera,setCamera]=useState(false),[tracking,setTracking]=useState(false),[status,setStatus]=useState('Camera off'),[error,setError]=useState(''),[fps,setFps]=useState(0),[landmark,setLandmark]=useState(true),[mirror,setMirror]=useState(true),[smooth,setSmooth]=useState(38),[preset,setPreset]=useState('open'),[tab,setTab]=useState('control'),[challenge,setChallenge]=useState(0),[score,setScore]=useState(0),[completed,setCompleted]=useState(false),[showHelp,setShowHelp]=useState(false),[scene,setScene]=useState('dark');
  const challengeRef=useRef(0),tabRef=useRef('control'),completeRef=useRef(false),successSince=useRef(0);
  useEffect(()=>{landmarkRef.current=landmark},[landmark]);
  useEffect(()=>{smoothRef.current=smooth},[smooth]);
  useEffect(()=>{tabRef.current=tab;successSince.current=0},[tab]);
  useEffect(()=>{challengeRef.current=challenge;successSince.current=0;completeRef.current=false;setCompleted(false)},[challenge]);
  const stop=()=>{runRef.current++;startingRef.current=false;cancelAnimationFrame(frame.current);tracker.current?.close();tracker.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;lastFrame.current=-1;if(video.current){video.current.pause();video.current.srcObject=null}const c=overlay.current;if(c)c.getContext('2d')?.clearRect(0,0,c.width,c.height);setCamera(false);setTracking(false);setStatus('Camera off');modeRef.current='DEMO';setMode('DEMO')};
  useEffect(()=>()=>{alive.current=false;cancelAnimationFrame(frame.current);tracker.current?.close();stream.current?.getTracks().forEach(t=>t.stop())},[]);
  const start=async()=>{
    if(startingRef.current||stream.current)return;
    startingRef.current=true;
    const run=++runRef.current;
    setError('');setStatus('Requesting camera…');
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Use localhost or an HTTPS site for webcam access.');
      const media=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30},facingMode:'user'},audio:false});
      if(!alive.current||run!==runRef.current){media.getTracks().forEach(t=>t.stop());return}
      stream.current=media;
      const player=video.current;
      player.srcObject=media;
      setCamera(true);
      // An interrupted play promise means the stream was superseded, not that camera permission failed.
      try{await player.play()}catch(e){
        if(run!==runRef.current)return;
        if(e?.name!=='AbortError')throw e;
        await new Promise(resolve=>setTimeout(resolve,120));
        if(run!==runRef.current)return;
        await player.play();
      }
      if(run!==runRef.current)return;
      setStatus('Loading hand model…');
      let loaded;
      try{loaded=await createTracker()}catch(e){if(run!==runRef.current)return;setStatus('Tracking unavailable');setError(`Model failed: ${e?.message||String(e)}. Run npm run prepare:model and restart the app.`);return}
      if(!alive.current||run!==runRef.current||!stream.current){loaded?.close();return}
      tracker.current=loaded;
      modeRef.current='LIVE';setMode('LIVE');setStatus('Show your hand');lastSeen.current=performance.now();
      let count=0,timer=performance.now();
      const loop=()=>{
        if(run!==runRef.current||!tracker.current||!stream.current||!video.current)return;
        const now=performance.now();
        if(video.current.readyState>=2&&video.current.currentTime!==lastFrame.current){
          lastFrame.current=video.current.currentTime;
          try{
            const result=tracker.current.detectForVideo(video.current,now),hand=result.landmarks?.[0];
            if(hand){
              const next=calculatePose(hand);lastSeen.current=now;setTracking(true);setStatus('Hand detected');
              if(modeRef.current==='LIVE')setPose(prev=>{const t=.14+(100-smoothRef.current)/100*.67;return {...next,curls:next.curls.map((v,i)=>prev.curls[i]+(v-prev.curls[i])*t),joints:next.joints.map((finger,i)=>finger.map((v,j)=>(prev.joints?.[i]?.[j]||0)+(v-(prev.joints?.[i]?.[j]||0))*t)),spread:next.spread.map((v,i)=>(prev.spread?.[i]||0)+(v-(prev.spread?.[i]||0))*t),grip:prev.grip+(next.grip-prev.grip)*t,wristX:prev.wristX+(next.wristX-prev.wristX)*t,wristY:prev.wristY+(next.wristY-prev.wristY)*t,roll:prev.roll+(next.roll-prev.roll)*t,pitch:prev.pitch+(next.pitch-prev.pitch)*t}});
              if(tabRef.current==='challenge'&&modeRef.current==='LIVE'&&!completeRef.current){
                if(next.gesture===challenges[challengeRef.current].gesture){if(!successSince.current)successSince.current=now;if(now-successSince.current>650){completeRef.current=true;setCompleted(true);setScore(v=>v+100)}}else successSince.current=0;
              }
            }else if(now-lastSeen.current>500){setTracking(false);setStatus('Looking for a hand');successSince.current=0}
            if(overlay.current)drawLandmarks(overlay.current,landmarkRef.current?hand:null,video.current);
          }catch(e){setStatus('Tracking error');setError(`Tracking frame error: ${e?.message||String(e)}`)}
          count++;if(now-timer>=1000){setFps(Math.round(count*1000/(now-timer)));timer=now;count=0}
        }
        frame.current=requestAnimationFrame(loop);
      };loop();
    }catch(e){if(run!==runRef.current)return;stop();setStatus('Camera blocked');setError(e?.message||String(e))}
    finally{if(run===runRef.current)startingRef.current=false}
  };
  const useGesture=name=>{setPreset(name);const g=gestures[name];modeRef.current='DEMO';setMode('DEMO');setPose(p=>({...p,gesture:name.toUpperCase(),grip:g.grip,curls:g.curls,joints:g.curls.map(c=>[c,c,c]),spread:[0,0,0,0,0]}))};
  const live=()=>{if(tracker.current){modeRef.current='LIVE';setMode('LIVE')}else if(!camera)start();else setError('Camera is running, but the tracking model has not loaded. Retry camera setup.')};
  const updateAxis=(axis,value)=>{modeRef.current='DEMO';setMode('DEMO');setPose(p=>({...p,[axis]:Number(value)}))};
  const updateFinger=(index,value)=>{modeRef.current='DEMO';setMode('DEMO');const v=Number(value);setPose(p=>({...p,curls:p.curls.map((c,i)=>i===index?v:c),joints:p.joints.map((j,i)=>i===index?[v,v,v]:j)}))};
  const next=()=>{setChallenge(v=>(v+1)%challenges.length)};
  return <div className={'hs-app '+(robot==='hand'?'hs-dexterous':'')}>
    <header className="hs-top"><div className="hs-logo"><span className="hs-logo-icon"><Hand size={21}/></span><div>HANDSYNC <small>ROBOT PLAYGROUND</small></div></div><div className="hs-top-mid"><span className="hs-online"/> EXPERIMENTAL ROBOTICS STUDIO <span className="hs-top-sep">/</span> {robot==='hand'?'ROBOT 02':'ROBOT 01'}</div><div className="hs-top-actions"><span className="hs-privacy"><ShieldCheck size={15}/> ON-DEVICE VISION</span><button className="hs-round" title="Help" onClick={()=>setShowHelp(v=>!v)}><CircleHelp size={18}/></button></div></header>
    <main className="hs-main">
      <div className="hs-heading"><div><div className="hs-kicker"><span/> YOUR MOTION. ITS MOVEMENT.</div><h1>Move like you<span>.</span></h1><p>Control five robotic fingers with your webcam. Every bend, every gesture, mirrored live in 3D.</p></div><div className="hs-heading-right"><div className="hs-status"><span className={tracking?'hs-live-dot':'hs-idle-dot'}/><div><strong>{tracking?'HAND TRACKING':camera?'CAMERA CONNECTED':'READY TO PLAY'}</strong><small>{status}</small></div></div></div></div>
      <div className="hs-robot-picker"><span>CHOOSE YOUR ROBOT</span><button className={robot==='industrial'?'selected':''} onClick={()=>setRobot('industrial')}><span className="hs-picker-icon orange">01</span><span><strong>Industrial Arm</strong><small>Two-jaw gripper</small></span></button><button className={robot==='hand'?'selected':''} onClick={()=>setRobot('hand')}><span className="hs-picker-icon purple">02</span><span><strong>Dexterous Hand</strong><small>Five-finger mirroring</small></span></button></div>
      <div className="hs-workspace">
        <section className={'hs-stage '+(scene==='light'?'hs-stage-light':'')}>
          <div className="hs-stage-top"><div className="hs-model-id"><span className="hs-model-icon"><Move3D size={17}/></span><div><strong>{robot==='hand'?'HS-02 / DEXTEROUS HAND':'HS-01 / INDUSTRIAL'}</strong><small>{robot==='hand'?'15 ARTICULATED FINGER JOINTS · POSE MIRROR':'6-AXIS INSPIRED · PARALLEL GRIPPER'}</small></div></div><div className="hs-stage-tools"><button className={scene==='dark'?'active':''} onClick={()=>setScene('dark')}>DARK</button><button className={scene==='light'?'active':''} onClick={()=>setScene('light')}>LIGHT</button></div></div>
          {robot==='hand'?<RobotHand pose={pose} scene={scene}/>:<Robot pose={pose} scene={scene}/>}
          <div className="hs-stage-left"><span>LIVE SIMULATION</span><b>01 <i>/</i> 01</b><small>Drag to rotate<br/>Scroll to zoom</small></div>
          <div className="hs-grip-meter"><div className="hs-grip-top"><span>{robot==='hand'?'HAND FLEXION':'GRIPPER PRESSURE'} <small>(SIMULATED)</small></span><strong>{Math.round((robot==='hand'?pose.curls.reduce((a,b)=>a+b,0)/5:pose.grip||0)*100)}%</strong></div><div className="hs-grip-track"><div style={{width:`${Math.round((robot==='hand'?pose.curls.reduce((a,b)=>a+b,0)/5:pose.grip||0)*100)}%`}}/></div><div className="hs-grip-bottom"><span>OPEN</span><span>CLOSED</span></div></div>
          <div className="hs-stage-foot"><span><span className="hs-stage-pulse"/> {mode==='LIVE'?'LIVE INPUT':'MANUAL INPUT'}</span><span>3D VIEWPORT <b>·</b> ORBIT ENABLED</span></div>
        </section>
        <section className="hs-right">
          <div className="hs-camera-card"><div className="hs-card-top"><div><Video size={17}/><strong>YOUR CAMERA</strong></div><span className={camera?'hs-cam-on':''}>{camera?'● LIVE':'● OFFLINE'}</span></div><div className="hs-video-frame"><video ref={video} muted playsInline style={{display:camera?'block':'none',transform:mirror?'scaleX(-1)':'none'}}/><canvas ref={overlay} style={{display:camera?'block':'none',transform:mirror?'scaleX(-1)':'none'}}/>{!camera&&<div className="hs-video-empty"><div><CameraOff size={30}/></div><strong>You're offline</strong><small>Turn on your camera to mirror your movements.</small></div>}{camera&&<span className="hs-fps">{fps} FPS</span>}</div><div className="hs-camera-bottom"><span><span className={tracking?'hs-online':'hs-idle-dot'}/>{tracking?`${pose.gesture} DETECTED`:status}</span><button className={camera?'hs-cam-stop':'hs-cam-start'} onClick={camera?stop:start}>{camera?<><Pause size={15}/> Stop camera</>:<><Camera size={16}/> Enable camera</>}</button></div></div>
          <div className="hs-gesture-card"><div className="hs-card-top"><div><Zap size={17}/><strong>{robot==='hand'?'LIVE HAND MIRROR':'GESTURE CONTROL'}</strong></div><span>{mode==='LIVE'?'LIVE':'DEMO'}</span></div><div className="hs-gesture-primary"><div className="hs-gesture-symbol">{pose.gesture==='FIST'?'✊':pose.gesture==='PINCH'?'🤏':pose.gesture==='OPEN'?'✋':'🖐️'}</div><div><small>ESTIMATED HAND POSE</small><strong>{pose.gesture||'OPEN'}</strong><span>{mode==='LIVE'?'Webcam is driving the joint motion':'Choose a pose to try it'}</span></div></div><div className="hs-gesture-grid">{Object.entries(gestures).map(([name,g])=><button key={name} onClick={()=>useGesture(name)} className={mode==='DEMO'&&preset===name?'hs-selected':''}><span>{g.symbol}</span><strong>{name.toUpperCase()}</strong></button>)}</div>{camera&&<button className="hs-resume" onClick={live}><Play size={14}/> RESUME LIVE CONTROL</button>}</div>
          <div className="hs-hint"><Sparkles size={17}/><span><strong>Try this:</strong> {robot==='hand'?'Spread your fingers, curl one finger, or make a sign. Robot 02 mirrors the estimated finger joints.':'Pinch your thumb and index finger to close the gripper. Open your hand to release.'}</span></div>
        </section>
      </div>
      <div className="hs-lower"><section className="hs-play-panel"><div className="hs-tabs"><button className={tab==='control'?'selected':''} onClick={()=>setTab('control')}><SlidersHorizontal size={17}/> CONTROL LAB</button><button className={tab==='challenge'?'selected':''} onClick={()=>setTab('challenge')}><Gamepad2 size={17}/> CHALLENGES <span>NEW</span></button></div>{tab==='control'?<div className="hs-manual"><div className="hs-manual-head"><div><strong>{robot==='hand'?'Control each robotic finger':'Fine-tune the movement'}</strong><p>Drag a slider to take manual control. Reset to neutral anytime.</p></div><button onClick={()=>{modeRef.current='DEMO';setMode('DEMO');setPose(NEUTRAL)}}><RotateCcw size={14}/> Reset pose</button></div>{robot==='hand'?<div className="hs-slider-grid">{['Thumb','Index','Middle','Ring','Pinky'].map((name,i)=><label key={name}><span>{name} flexion<b>{Math.round((pose.curls[i]||0)*100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={pose.curls[i]||0} onChange={e=>updateFinger(i,e.target.value)}/></label>)}</div>:<div className="hs-slider-grid">{[['Base rotation','wristX'],['Shoulder reach','wristY'],['Wrist tilt','roll']].map(([name,key])=><label key={key}><span>{name}<b>{Math.round((pose[key]||0)*100)}%</b></span><input type="range" min="-1" max="1" step="0.01" value={pose[key]||0} onChange={e=>updateAxis(key,e.target.value)}/></label>)}<label><span>Gripper close<b>{Math.round((pose.grip||0)*100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={pose.grip||0} onChange={e=>updateAxis('grip',e.target.value)}/></label></div>}</div>:<div className="hs-challenge"><div className="hs-challenge-number">CHALLENGE {String(challenge+1).padStart(2,'0')} / 03</div><div className="hs-challenge-content"><div><h2>{challenges[challenge].title}</h2><p>{challenges[challenge].hint}</p><small>Hold the matching gesture for a moment. Live camera tracking is required.</small></div><div className="hs-challenge-score"><span>YOUR SCORE</span><strong>{score}</strong>PTS</div></div><div className="hs-challenge-actions">{completed?<span className="hs-success"><Check size={17}/> Challenge completed! +100 points</span>:<span>Target: <strong>{challenges[challenge].gesture}</strong></span>}<button onClick={next}>Next challenge →</button></div></div>}</section><section className="hs-settings"><div className="hs-settings-title"><Settings2 size={17}/> TRACKING SETTINGS</div><label><span>Motion smoothing <b>{smooth}%</b></span><input type="range" min="0" max="95" value={smooth} onChange={e=>setSmooth(Number(e.target.value))}/></label><label className="hs-check"><input type="checkbox" checked={landmark} onChange={e=>setLandmark(e.target.checked)}/> Show hand landmarks</label><label className="hs-check"><input type="checkbox" checked={mirror} onChange={e=>setMirror(e.target.checked)}/> Mirror camera preview</label></section></div>
      {error&&<div className="hs-error"><CircleHelp size={17}/><span>{error}</span><button onClick={()=>setError('')}><X size={17}/></button></div>}
      {showHelp&&<div className="hs-modal-backdrop" onClick={()=>setShowHelp(false)}><div className="hs-modal" onClick={e=>e.stopPropagation()}><button className="hs-modal-close" onClick={()=>setShowHelp(false)}><X size={20}/></button><Sparkles size={28} color="#ff9860"/><h2>Welcome to HandSync</h2><p>Choose Robot 02 for a five-finger hand that mirrors finger bending and wrist orientation from your webcam. Robot 01 is an industrial gripper that responds to open, fist and pinch gestures. You can rotate either model and test poses manually.</p><p>HandSync estimates visible hand pose. It does not recognize or translate sign language, and it is not connected to physical hardware.</p><button onClick={()=>setShowHelp(false)}>Got it</button></div></div>}
      <footer className="hs-footer"><span>HANDSYNC STUDIO · EXPERIMENTAL V0.3</span><span>CAMERA PROCESSING STAYS ON YOUR DEVICE · NO PAID API</span></footer>
    </main>
  </div>
}
