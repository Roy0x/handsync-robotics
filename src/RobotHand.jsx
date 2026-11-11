import React,{useRef} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {Grid,OrbitControls} from '@react-three/drei';
import * as THREE from 'three';

const shell='#242a31',rubber='#10151a',metal='#8b9298',trim='#414a53',light='#7fe2dc';
const smooth=(current,target,dt)=>THREE.MathUtils.damp(current,target,11,dt);
function Material({color=shell,roughness=.42}){return <meshStandardMaterial color={color} metalness={.65} roughness={roughness}/>}
function Box({p=[0,0,0],size=[.2,.2,.2],color=shell,r=[0,0,0]}){return <mesh castShadow position={p} rotation={r}><boxGeometry args={size}/><Material color={color}/></mesh>}
function Cyl({p=[0,0,0],size=[.2,.2,.3,20],color=shell,r=[0,0,0]}){return <mesh castShadow position={p} rotation={r}><cylinderGeometry args={size}/><Material color={color}/></mesh>}
function Bolt({p}){return <mesh position={p}><sphereGeometry args={[.022,8,8]}/><Material color={metal}/></mesh>}
function FingerSegment({length,width,index=0}){
  return <group>
    <Box p={[0,length*.5,0]} size={[width,length*.92,width*.87]} color={shell}/>
    <Box p={[0,length*.5,width*.45]} size={[width*.75,length*.68,.025]} color={index===2?rubber:trim}/>
    <Cyl p={[0,length*.08,0]} size={[width*.45,width*.45,width*1.14,14]} color={metal} r={[Math.PI/2,0,0]}/>
    <Bolt p={[width*.44,length*.1,.025]}/><Bolt p={[-width*.44,length*.1,.025]}/>
    {index===2&&<mesh position={[0,length*.98,.01]}><sphereGeometry args={[width*.53,14,12]}/><Material color={rubber} roughness={.9}/></mesh>}
  </group>
}
function Finger({base,lengths=[.47,.31,.21],width=.18,joints=[0,0,0],splay=0,thumb=false}){
  const a=useRef(),b=useRef(),c=useRef(),spread=useRef();
  useFrame((_,dt)=>{
    if(a.current)a.current.rotation.x=smooth(a.current.rotation.x,(joints[0]||0)*1.25,dt);
    if(b.current)b.current.rotation.x=smooth(b.current.rotation.x,(joints[1]||0)*1.45,dt);
    if(c.current)c.current.rotation.x=smooth(c.current.rotation.x,(joints[2]||0)*1.25,dt);
    if(spread.current)spread.current.rotation.z=smooth(spread.current.rotation.z,(thumb?-.82:0)+splay*.32,dt);
  });
  return <group position={base}><group ref={spread}>
    <group ref={a}><FingerSegment length={lengths[0]} width={width}/>
      <group position={[0,lengths[0],0]} ref={b}><FingerSegment length={lengths[1]} width={width*.87} index={1}/>
        <group position={[0,lengths[1],0]} ref={c}><FingerSegment length={lengths[2]} width={width*.77} index={2}/></group>
      </group>
    </group>
  </group></group>
}
function HandAssembly({pose}){
  const wrist=useRef();
  useFrame((_,dt)=>{if(!wrist.current)return;wrist.current.rotation.z=smooth(wrist.current.rotation.z,pose.roll*.75,dt);wrist.current.rotation.x=smooth(wrist.current.rotation.x,-pose.pitch*.65,dt)});
  const joints=pose.joints||[];
  const spread=pose.spread||[0,0,0,0,0];
  return <group ref={wrist} position={[0,1.5,0]}>
    <Cyl p={[0,-.55,0]} size={[.36,.42,1.08,24]} color={rubber}/>
    <Cyl p={[0,-1.16,0]} size={[.46,.42,.34,28]} color={trim}/>
    <Cyl p={[0,-1.35,0]} size={[.5,.5,.13,28]} color={metal}/>
    <Box p={[0,-.25,.30]} size={[.56,.66,.065]} color={trim}/>
    <Box p={[0,-.25,.34]} size={[.36,.28,.018]} color={rubber}/>
    <Cyl p={[0,.08,0]} size={[.36,.36,.36,24]} color={metal}/>
    <Box p={[0,.57,0]} size={[1.25,1.03,.42]} color={shell}/>
    <Box p={[0,.62,.22]} size={[1.15,.87,.07]} color={trim}/>
    <Box p={[0,.54,.27]} size={[1,.55,.045]} color={shell}/>
    <Box p={[0,.32,.282]} size={[.35,.05,.022]} color={light}/>
    {[-.49,-.24,.01,.26,.5].map((x,i)=><Bolt key={i} p={[x,.98,.23]}/>)}
    <Finger base={[-.66,.29,.02]} lengths={[.4,.3,.22]} width={.22} joints={joints[0]||[0,0,0]} splay={spread[0]||0} thumb/>
    <Finger base={[-.43,1.03,0]} lengths={[.48,.32,.24]} width={.195} joints={joints[1]||[0,0,0]} splay={spread[1]||0}/>
    <Finger base={[-.14,1.03,0]} lengths={[.57,.37,.27]} width={.2} joints={joints[2]||[0,0,0]} splay={spread[2]||0}/>
    <Finger base={[.17,1.03,0]} lengths={[.52,.34,.25]} width={.19} joints={joints[3]||[0,0,0]} splay={spread[3]||0}/>
    <Finger base={[.46,.98,0]} lengths={[.4,.28,.21]} width={.17} joints={joints[4]||[0,0,0]} splay={spread[4]||0}/>
  </group>
}
export default function RobotHand({pose,scene='dark'}){
  const lightMode=scene==='light';
  return <Canvas camera={{position:[3.15,2.7,6.7],fov:39}} dpr={[1,1.5]} shadows gl={{antialias:true,powerPreference:'low-power'}}>
    <color attach="background" args={[lightMode?'#e1e5e8':'#11131b']}/>
    <ambientLight intensity={lightMode?2.1:1.65}/>
    <directionalLight position={[3,6,5]} intensity={2.7} castShadow shadow-mapSize={[1024,1024]}/>
    <pointLight position={[-3,3,-2]} intensity={8} color={lightMode?'#ffffff':'#d85d8f'}/>
    <HandAssembly pose={pose}/>
    <Grid position={[0,-.1,0]} args={[10,10]} cellSize={.45} cellColor={lightMode?'#bfc5cb':'#303042'} sectionColor={lightMode?'#959eaa':'#45455f'} fadeDistance={12} fadeStrength={2}/>
    <OrbitControls target={[0,1.8,0]} minDistance={3} maxDistance={10} enablePan={false}/>
  </Canvas>
}
