import React,{useRef,useMemo} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {OrbitControls,Environment} from '@react-three/drei';
import * as THREE from 'three';

// Robot 02: lightweight, articulated likeness of the supplied black prosthetic-hand photo.
// A photograph is not a 3D scan: the geometry below is an original approximation.
const C={armor:'#24262a',shell:'#303238',rubber:'#101114',metal:'#92918d',darkMetal:'#53565b',hinge:'#b1a99e',pink:'#81374e'};
const mat=(color,metalness=.42,roughness=.49)=><meshStandardMaterial color={color} metalness={metalness} roughness={roughness}/>;
const damp=(a,b,dt)=>THREE.MathUtils.damp(a,b,9,dt);
function Ellipsoid({at=[0,0,0],size=[1,1,1],color=C.armor,rot=[0,0,0],metal=.42,rough=.5}){
 return <mesh castShadow receiveShadow position={at} rotation={rot} scale={size}><sphereGeometry args={[1,26,18]}/>{mat(color,metal,rough)}</mesh>;
}
function Cylinder({at=[0,0,0],radiusTop=.2,radiusBottom=.2,height=.2,color=C.armor,rot=[0,0,0],n=24}){
 return <mesh castShadow receiveShadow position={at} rotation={rot}><cylinderGeometry args={[radiusTop,radiusBottom,height,n]}/>{mat(color)}</mesh>;
}
function Box({at=[0,0,0],size=[1,1,1],color=C.armor,rot=[0,0,0]}){
 return <mesh castShadow receiveShadow position={at} rotation={rot}><boxGeometry args={size}/>{mat(color)}</mesh>;
}
function Screw({at=[0,0,0],radius=.028}){
 return <mesh position={at}><sphereGeometry args={[radius,10,8]}/>{mat(C.metal,.8,.28)}</mesh>;
}
function Hinge({width=.18,at=[0,0,0]}){
 return <group position={at}>
   <Cylinder radiusTop={.075} radiusBottom={.075} height={width*1.2} rot={[Math.PI/2,0,0]} color={C.metal}/>
   <Cylinder at={[0,0,width*.67]} radiusTop={.054} radiusBottom={.054} height={.016} rot={[Math.PI/2,0,0]} color={C.rubber}/>
   <Cylinder at={[0,0,-width*.67]} radiusTop={.054} radiusBottom={.054} height={.016} rot={[Math.PI/2,0,0]} color={C.rubber}/>
 </group>;
}
function FingerBone({length,width,tip=false}){
 return <group>
  <Ellipsoid at={[0,length*.48,0]} size={[width*.55,length*.52,width*.43]} color={C.armor}/>
  <Ellipsoid at={[0,length*.48,.053]} size={[width*.42,length*.45,.033]} color={C.shell} rough={.62}/>
  <Box at={[0,length*.16,-width*.46]} size={[width*.55,length*.24,.026]} color={C.metal}/>
  <Hinge width={width} at={[0,.035,0]}/>
  <Screw at={[width*.56,.07,.025]}/><Screw at={[-width*.56,.07,.025]}/>
  {tip&&<><Ellipsoid at={[0,length*.94,.015]} size={[width*.54,.105,width*.51]} color={C.rubber} metal={.12} rough={.9}/>
    <Cylinder at={[0,length*.955,width*.4]} radiusTop={width*.22} radiusBottom={width*.22} height={.006} rot={[Math.PI/2,0,0]} color={C.darkMetal}/></>}
 </group>;
}
function Digit({origin,lengths,width,bend=[0,0,0],splay=0,thumb=false,rest=0}){
 const root=useRef(),a=useRef(),b=useRef(),c=useRef();
 useFrame((_,dt)=>{
  if(root.current)root.current.rotation.z=damp(root.current.rotation.z,rest+splay*.16,dt);
  if(a.current)a.current.rotation.x=damp(a.current.rotation.x,-(bend[0]||0)*1.38,dt);
  if(b.current)b.current.rotation.x=damp(b.current.rotation.x,-(bend[1]||0)*1.48,dt);
  if(c.current)c.current.rotation.x=damp(c.current.rotation.x,-(bend[2]||0)*1.36,dt);
 });
 return <group position={origin} ref={root} rotation={[0,0,rest]}>
  <group ref={a}><FingerBone length={lengths[0]} width={width}/>
   <group position={[0,lengths[0],0]} ref={b}><FingerBone length={lengths[1]} width={width*.85}/>
    <group position={[0,lengths[1],0]} ref={c}><FingerBone length={lengths[2]} width={width*.75} tip/></group>
   </group>
  </group>
 </group>;
}
function Palm(){
 return <group>
  <Ellipsoid at={[0,.73,-.01]} size={[.69,.62,.25]} color={C.armor}/>
  <Ellipsoid at={[-.13,.69,.196]} size={[.54,.50,.081]} color={C.shell} metal={.22} rough={.68}/>
  <Ellipsoid at={[.30,.57,.20]} size={[.30,.31,.073]} color={C.shell} metal={.25}/>
  <Ellipsoid at={[-.39,.66,.192]} size={[.24,.36,.072]} color={C.shell} metal={.2}/>
  <Ellipsoid at={[0,.69,-.21]} size={[.60,.51,.06]} color={C.rubber} metal={.12}/>
  <Cylinder at={[0,.24,0]} radiusTop={.34} radiusBottom={.32} height={.13} color={C.darkMetal}/>
  {[-.50,-.18,.15,.46].map((x,i)=><group key={i}>
    <Cylinder at={[x,1.19,0]} radiusTop={.11} radiusBottom={.11} height={.21} color={C.metal} rot={[Math.PI/2,0,0]}/>
    <Screw at={[x,1.19,.14]} radius={.032}/>
   </group>)}
 </group>;
}
function Forearm(){
 return <group>
  <Cylinder at={[0,-.78,0]} radiusTop={.33} radiusBottom={.46} height={1.62} color={C.rubber}/>
  <Ellipsoid at={[0,-.74,.17]} size={[.34,.74,.31]} color={C.armor} rot={[0,0,-.045]}/>
  <Ellipsoid at={[.02,-.60,.42]} size={[.27,.63,.10]} color={C.shell} metal={.27} rough={.62}/>
  <Ellipsoid at={[.05,-.62,.518]} size={[.19,.47,.025]} color={C.armor} metal={.22}/>
  <Box at={[.06,-.53,.54]} size={[.20,.16,.018]} color={C.rubber}/>
  <Cylinder at={[0,-1.48,0]} radiusTop={.43} radiusBottom={.47} height={.13} color={C.darkMetal}/>
  <Cylinder at={[0,-1.56,0]} radiusTop={.46} radiusBottom={.46} height={.07} color={C.rubber}/>
  <Cylinder at={[0,-1.67,0]} radiusTop={.46} radiusBottom={.43} height={.18} color={C.armor}/>
  <Cylinder at={[0,-1.86,0]} radiusTop={.43} radiusBottom={.40} height={.20} color={C.darkMetal}/>
  <Cylinder at={[0,-1.95,0]} radiusTop={.34} radiusBottom={.34} height={.12} color={C.rubber} rot={[Math.PI/2,0,0]}/>
  {[-.18,.18].map((x,i)=><Screw key={i} at={[x,-1.88,.37]}/>)}
  <Cylinder at={[0,.07,0]} radiusTop={.32} radiusBottom={.35} height={.35} color={C.metal}/>
  <Ellipsoid at={[0,.18,.16]} size={[.29,.23,.20]} color={C.armor}/>
 </group>;
}
function HandModel({pose}){
 const root=useRef();
 useFrame((_,dt)=>{
  if(!root.current)return;
  root.current.rotation.z=damp(root.current.rotation.z,(pose.roll||0)*.55,dt);
  root.current.rotation.x=damp(root.current.rotation.x,-(pose.pitch||0)*.45,dt);
  root.current.position.x=damp(root.current.position.x,(pose.wristX||0)*.12,dt);
  root.current.position.y=damp(root.current.position.y,.28+(pose.wristY||0)*.12,dt);
 });
 const joints=pose.joints?.length===5?pose.joints:Array.from({length:5},(_,i)=>[pose.curls?.[i]||0,pose.curls?.[i]||0,pose.curls?.[i]||0]);
 const spread=pose.spread||[0,0,0,0,0];
 return <group position={[0,.28,0]} ref={root}>
  <Forearm/><Palm/>
  <Digit origin={[-.72,.35,.06]} lengths={[.36,.31,.20]} width={.23} bend={joints[0]} splay={spread[0]} thumb rest={-.82}/>
  <Digit origin={[-.49,1.20,0]} lengths={[.48,.31,.24]} width={.22} bend={joints[1]} splay={spread[1]} rest={.08}/>
  <Digit origin={[-.16,1.24,0]} lengths={[.56,.38,.26]} width={.23} bend={joints[2]} splay={spread[2]}/>
  <Digit origin={[.18,1.22,0]} lengths={[.50,.34,.24]} width={.22} bend={joints[3]} splay={spread[3]} rest={-.05}/>
  <Digit origin={[.49,1.15,0]} lengths={[.40,.30,.21]} width={.20} bend={joints[4]} splay={spread[4]} rest={-.15}/>
 </group>;
}
export default function RobotHand({pose,scene='dark',leftPose,rightPose}){
 const light=scene==='light';
 const left=leftPose||pose,right=rightPose||pose;
 return <Canvas camera={{position:[1.15,1.25,9.2],fov:39}} dpr={[1,1.15]} gl={{antialias:true,powerPreference:'low-power'}} shadows>
  <color attach="background" args={[light?'#ded6da':'#682739']}/>
  <ambientLight intensity={light?2.25:1.45}/>
  <directionalLight position={[-3,7,6]} intensity={2.7} castShadow shadow-mapSize={[512,512]}/>
  <pointLight position={[4,0,-3]} color="#f7a3b8" intensity={light?3:6}/>
  <pointLight position={[-4,2,2]} color="#ffffff" intensity={2.5}/>
  <group position={[-1.45,0,0]} scale={[-.80,.80,.80]}><HandModel pose={left}/></group>
  <group position={[1.45,0,0]} scale={[.80,.80,.80]}><HandModel pose={right}/></group>
  <OrbitControls target={[0,.25,0]} minDistance={6.2} maxDistance={13} enablePan={false}/>
 </Canvas>;
}
