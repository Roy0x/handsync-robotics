import React, {useRef} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {Grid,OrbitControls} from '@react-three/drei';
import * as THREE from 'three';

const orange='#ef691d',dark='#1a222b',steel='#a7b2bb';
function Mat({color=orange}){return <meshStandardMaterial color={color} metalness={.65} roughness={.28}/>}
function Cyl({p=[0,0,0],r=[0,0,0],size=[.3,.3,.4,32],color=orange}){return <mesh castShadow receiveShadow position={p} rotation={r}><cylinderGeometry args={size}/><Mat color={color}/></mesh>}
function Link({a,b,r=.25,color=orange}){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());const m=new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5);return <group><mesh castShadow position={m.toArray()} quaternion={q}><cylinderGeometry args={[r*.82,r,v.length(),24]}/><Mat color={color}/></mesh><mesh castShadow position={a}><sphereGeometry args={[r,20,16]}/><Mat color={color}/></mesh><mesh castShadow position={b}><sphereGeometry args={[r*.85,20,16]}/><Mat color={color}/></mesh></group>}
function Motor({radius=.4}){return <group><Cyl r={[Math.PI/2,0,0]} size={[radius,radius,.3,32]}/><Cyl r={[Math.PI/2,0,0]} size={[radius*.77,radius*.77,.315,32]} color={dark}/><Cyl r={[Math.PI/2,0,0]} size={[radius*.55,radius*.55,.33,32]} color="#0d151d"/></group>}
function Hose({points,radius=.035}){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return <mesh castShadow><tubeGeometry args={[curve,32,radius,8,false]}/><Mat color="#10151a"/></mesh>}
function Ring({radius=.3,color='#fcb46b'}){return <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[radius,.012,8,48]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.85}/></mesh>}
function Plate({position=[0,0,0],size=[.2,.6,.035],color='#f78337',rotation=[0,0,0]}){return <mesh castShadow position={position} rotation={rotation}><boxGeometry args={size}/><Mat color={color}/></mesh>}
function Rivets({radius=.3}){return <>{Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return <mesh key={i} castShadow position={[Math.cos(a)*radius,0,Math.sin(a)*radius]}><sphereGeometry args={[.035,8,6]}/><Mat color="#10151a"/></mesh>})}</>}
function Gripper({pose}){const l=useRef(),r=useRef();const close=pose.grip??0;useFrame((_,dt)=>{const x=.29-close*.18;if(l.current)l.current.position.x=THREE.MathUtils.damp(l.current.position.x,-x,10,dt);if(r.current)r.current.position.x=THREE.MathUtils.damp(r.current.position.x,x,10,dt)});return <group><Cyl p={[0,.12,0]} size={[.23,.23,.38,24]} color={dark}/><mesh castShadow position={[0,.36,0]}><boxGeometry args={[.8,.28,.48]}/><Mat color="#677783"/></mesh>{[-1,1].map((s,i)=><group key={i} ref={s<0?l:r} position={[s*.29,.35,0]}><mesh castShadow position={[0,.23,0]}><boxGeometry args={[.15,.5,.28]}/><Mat color={steel}/></mesh><mesh castShadow position={[-s*.027,.5,0]}><boxGeometry args={[.12,.21,.26]}/><Mat color="#81919c"/></mesh><mesh castShadow position={[-s*.04,.6,0]}><boxGeometry args={[.065,.12,.25]}/><Mat color={dark}/></mesh></group>)}</group>}
function Arm({pose}){
  const base=useRef(),shoulder=useRef(),elbow=useRef(),wrist=useRef();
  useFrame((_,dt)=>{
    const damp=(ref,axis,value)=>{if(ref.current)ref.current.rotation[axis]=THREE.MathUtils.damp(ref.current.rotation[axis],value,5,dt)};
    damp(base,'y',pose.wristX*.85);damp(shoulder,'z',-.17+pose.wristY*.48);
    damp(elbow,'z',-.8+pose.wristX*.25);damp(wrist,'z',.4+pose.roll*.5);
  });
  return <group position={[0,-2.1,0]}>
    <mesh receiveShadow position={[0,-.3,0]}><boxGeometry args={[1.86,.18,1.86]}/><Mat color={dark}/></mesh>
    {Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return <Cyl key={i} p={[Math.cos(a)*.73,-.18,Math.sin(a)*.73]} size={[.055,.055,.05,8]} color="#090d12"/>})}
    <Cyl p={[0,-.08,0]} size={[.7,.83,.48,32]} color={dark}/>
    <Cyl p={[0,.16,0]} size={[.57,.57,.12,32]} color="#525c66"/>
    <group ref={base} position={[0,.23,0]}>
      <Cyl p={[0,.13,0]} size={[.64,.67,.46,32]}/>
      <Link a={[0,.1,0]} b={[.21,.62,0]} r={.46}/>
      <Plate position={[.21,.38,.41]} size={[.24,.51,.045]} color="#c54d19" rotation={[0,0,-.35]}/>
      <group ref={shoulder} position={[.21,.62,0]}>
        <Motor radius={.46}/><Ring radius={.345}/>
        <Link a={[0,0,0]} b={[.48,1.32,0]} r={.38}/>
        <Plate position={[.24,.64,.34]} size={[.25,1.01,.055]} color="#ff8b3e" rotation={[0,0,-.35]}/>
        <Link a={[.04,.2,.25]} b={[.47,1.16,.23]} r={.1} color="#ca4b19"/>
        <Hose points={[[-.1,-.08,-.22],[-.38,.44,-.39],[-.14,1.22,-.31],[.48,1.3,-.16]]} radius={.044}/>
        <group ref={elbow} position={[.48,1.32,0]}>
          <Motor radius={.36}/><Ring radius={.265}/>
          <Link a={[0,0,0]} b={[-.3,1.13,0]} r={.3}/>
          <Plate position={[-.14,.58,.28]} size={[.21,.89,.035]} color="#f98a3b" rotation={[0,0,.27]}/>
          <Link a={[.02,.13,.2]} b={[-.28,1.03,.2]} r={.09} color="#d34e19"/>
          <Hose points={[[.05,-.1,-.22],[.3,.35,-.42],[.02,.92,-.35],[-.31,1.11,-.17]]} radius={.035}/>
          <group ref={wrist} position={[-.3,1.13,0]}>
            <Motor radius={.27}/><Ring radius={.195}/>
            <Cyl p={[0,.29,0]} size={[.24,.27,.54,32]}/>
            <Cyl p={[0,.58,0]} size={[.18,.18,.15,24]} color={dark}/>
            <Cyl p={[0,.67,0]} size={[.205,.205,.07,32]} color="#b7c3ca"/>
            <group position={[0,.72,0]}><Gripper pose={pose}/></group>
          </group>
        </group>
      </group>
    </group>
  </group>
}
export default function Robot({pose,scene='dark'}){
  const light=scene==='light';
  return <Canvas camera={{position:[5.1,2.4,7],fov:42}} dpr={[1,1.5]} shadows gl={{antialias:true,powerPreference:'low-power'}}>
    <color attach="background" args={[light?'#d7e3e9':'#0b1625']}/>
    <ambientLight intensity={light?2.05:1.5}/><directionalLight position={[4,8,6]} intensity={light?2.1:2.7} castShadow shadow-mapSize={[1024,1024]}/>
    <pointLight position={[-4,3,-2]} color={light?'#ffffff':'#65dce3'} intensity={light?5:9}/>
    <Arm pose={pose}/>
    <Grid position={[0,-2.52,0]} args={[12,12]} cellSize={.5} cellColor={light?'#aabac7':'#294456'} sectionColor={light?'#8aa1b5':'#35617a'} fadeDistance={16} fadeStrength={2}/>
    <OrbitControls makeDefault target={[0,.2,0]} minDistance={3} maxDistance={12} enablePan={false}/>
  </Canvas>
}
