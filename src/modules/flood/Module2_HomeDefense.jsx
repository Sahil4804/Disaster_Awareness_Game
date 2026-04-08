import { useReducer, useEffect } from 'react'
import { useGame } from '../../context/GameContext'

const MONO = "'JetBrains Mono','Courier New',Courier,monospace"
const TICK_MS=500,SIM_TICKS=220,PEAK_TICK=132
const BASEMENT_FT=8,PANEL_FT=5.0,PRESSURE_THRESH=3.0
const EXT_RISE=0.028,EXT_FALL=0.022,MAX_EXT=6   // realistic 6ft surface flood
const SEWER_RATE=0.04,VENT_COEFF=0.10            // reduced so pump can keep pace
const PUMP_MAX=0.26,STRUCT_DMG=5
const BAT_START=100,BAT_DRAIN=0.75,BACKWATER_COST=150
const SVG_W=700,SVG_H=400,G_LINE=240,B_FLOOR=SVG_H-2
const PX_PER_FT=(B_FLOOR-G_LINE)/BASEMENT_FT
const PANEL_Y=B_FLOOR-PANEL_FT*PX_PER_FT

const INIT={phase:'setup',tick:0,failMsg:null,score:null,ext:0,int:0,struct:100,battery:BAT_START,backwater:false,vents:false,breaker:true,throttle:0,budget:500}

function reducer(s,a){
  switch(a.type){
    case 'TICK':{
      if(s.phase!=='running')return s
      const tick=s.tick+1
      let{ext,int,struct,battery}=s
      ext=tick<PEAK_TICK?Math.min(MAX_EXT,ext+EXT_RISE):Math.max(0,ext-EXT_FALL)
      if(!s.backwater&&ext>1.0)int=Math.min(BASEMENT_FT+3,int+SEWER_RATE)
      if(s.vents&&ext>int)int+=(ext-int)*VENT_COEFF
      const dP=ext-int
      if(dP>PRESSURE_THRESH)struct=Math.max(0,struct-STRUCT_DMG)
      if(s.throttle>0&&int>0){
        const rm=PUMP_MAX*s.throttle
        if(s.breaker){int=Math.max(0,int-rm)}
        else if(battery>0){int=Math.max(0,int-rm);battery=Math.max(0,battery-BAT_DRAIN*s.throttle)}
      }
      int=Math.max(0,int)
      if(struct<=0)return{...s,tick,ext,int,struct,battery,phase:'failed',failMsg:'FOUNDATION COLLAPSE'}
      if(s.breaker&&int>=PANEL_FT)return{...s,tick,ext,int,struct,battery,phase:'failed',failMsg:'ARC FLASH — ELECTROCUTION'}
      if(int>=BASEMENT_FT)return{...s,tick,ext,int,struct,battery,phase:'failed',failMsg:'LIVING SPACE FLOODED'}
      if(tick>=SIM_TICKS){const score=Math.round(struct*0.70+(battery/BAT_START)*30);return{...s,tick,ext,int,struct,battery,phase:'passed',score}}
      return{...s,tick,ext,int,struct,battery}
    }
    case 'START':return{...s,phase:'running',tick:0,ext:0,int:0,struct:100,battery:BAT_START,failMsg:null,score:null}
    case 'RESET':return{...INIT,backwater:s.backwater,budget:s.budget}
    case 'FULL_RESET':return{...INIT}
    case 'BACKWATER':
      if(s.backwater||s.phase==='running'||s.budget<BACKWATER_COST)return s
      return{...s,backwater:true,budget:s.budget-BACKWATER_COST}
    case 'SET_VENTS':return{...s,vents:a.v}
    case 'SET_BREAKER':return{...s,breaker:a.v}
    case 'SET_THROTTLE':return{...s,throttle:a.v}
    default:return s
  }
}

function VGauge({topLabel,bottomLabel,value,max,colorFn,px=165}){
  const pct=Math.min(1,Math.max(0,value/max))
  const color=colorFn(pct)
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,flex:1}}>
      <div style={{color:'#334155',fontFamily:MONO,fontSize:8,letterSpacing:1,textTransform:'uppercase',textAlign:'center',lineHeight:1.4,maxWidth:52}}>{topLabel}</div>
      <div style={{position:'relative',width:36,height:px,background:'#0a0a0a',border:'1px solid #1a2a3a',borderRadius:4,overflow:'hidden'}}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:`${pct*100}%`,background:`linear-gradient(0deg,${color}ee,${color}55)`,transition:'height 0.25s ease-out,background 0.35s',boxShadow:`0 0 12px ${color}44`}}/>
        {[0.25,0.5,0.75].map(t=><div key={t} style={{position:'absolute',bottom:`${t*100}%`,left:0,right:0,height:1,background:'rgba(255,255,255,0.05)'}}/>)}
        {bottomLabel==='ΔP (ft)'&&<div style={{position:'absolute',bottom:`${(PRESSURE_THRESH/BASEMENT_FT)*100}%`,left:0,right:0,height:2,background:'#ef444480'}}/>}
      </div>
      <div style={{color,fontFamily:MONO,fontSize:13,fontWeight:700}}>{value.toFixed(1)}</div>
      <div style={{color:'#1e3050',fontFamily:MONO,fontSize:8,textAlign:'center'}}>{bottomLabel}</div>
    </div>
  )
}

function Tog({label,value,onLabel,offLabel,onChange,disabled}){
  const c=value?'#22c55e':'#ef4444'
  return(
    <div style={{display:'flex',flexDirection:'column',gap:3}}>
      <span style={{fontSize:8,color:'#334155',fontFamily:MONO,letterSpacing:1,textTransform:'uppercase'}}>{label}</span>
      <button onClick={()=>!disabled&&onChange(!value)} disabled={disabled}
        style={{padding:'7px 14px',borderRadius:3,fontFamily:MONO,fontSize:11,fontWeight:700,letterSpacing:1,cursor:disabled?'not-allowed':'pointer',border:`1px solid ${c}`,background:`${c}14`,color:c,opacity:disabled?0.4:1,transition:'all 0.2s'}}>
        {value?onLabel:offLabel}
      </button>
    </div>
  )
}

export default function Module2_HomeDefense(){
  const{dispatch:gd}=useGame()
  const[s,dispatch]=useReducer(reducer,INIT)

  useEffect(()=>{
    if(s.phase!=='running')return
    const id=setInterval(()=>dispatch({type:'TICK'}),TICK_MS)
    return()=>clearInterval(id)
  },[s.phase])

  useEffect(()=>{
    if(s.phase!=='passed'&&s.phase!=='failed')return
    const score=Math.min(100,Math.max(0,s.score??Math.round(s.struct*0.5)))
    gd({type:'RECORD_SCORE',payload:{key:'flood-2',result:{score,passed:s.phase==='passed'}}})
  },[s.phase]) // eslint-disable-line

  const dP=Math.max(0,s.ext-s.int)
  const clearance=Math.max(0,BASEMENT_FT-s.int)
  const shaking=s.struct<50&&s.phase==='running'
  const pumpOn=s.throttle>0&&s.int>0&&(s.breaker||s.battery>0)
  const pumpSrc=s.breaker?'GRID':s.battery>0?'BATTERY':'DEAD'
  const extTopY=Math.max(0,G_LINE-s.ext*PX_PER_FT)
  const intTopY=Math.min(B_FLOOR,B_FLOOR-s.int*PX_PER_FT)

  if(s.phase==='setup')return(
    <div style={{position:'fixed',inset:0,background:'#0a0a0a',fontFamily:MONO,display:'flex',alignItems:'center',justifyContent:'center',padding:24,overflowY:'auto'}}>
      <style>{`@keyframes rain{0%{transform:translateY(-20px);opacity:0}15%{opacity:.6}100%{transform:translateY(100vh);opacity:0}}@keyframes flicker{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{position:'fixed',inset:0,overflow:'hidden',pointerEvents:'none'}}>
        {Array.from({length:25}).map((_,i)=><div key={i} style={{position:'absolute',top:-20,left:`${(i*4.1)%100}%`,width:1,height:`${26+i%18}px`,background:'rgba(96,165,250,0.18)',animation:`rain ${1.1+i*0.06}s linear ${i*0.09}s infinite`}}/>)}
      </div>
      <div style={{maxWidth:700,width:'100%',position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:26}}>
          <div style={{color:'#ef4444',fontSize:11,letterSpacing:4,marginBottom:10,animation:'flicker 1.4s ease-in-out infinite'}}>⚠ FLOOD WARNING — EVACUATION ORDER IMMINENT</div>
          <div style={{color:'#00e5ff',fontSize:24,fontWeight:700,letterSpacing:3}}>MODULE 2: HOME DEFENSE</div>
          <div style={{color:'#1e3050',fontSize:11,letterSpacing:2,marginTop:5}}>FEMA WET-FLOODPROOFING SIMULATION · REAL-TIME FLUID DYNAMICS</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:18}}>
          <div style={{background:'#0d0d0d',border:'1px solid #1a2535',borderRadius:6,padding:18}}>
            <div style={{color:'#fbbf24',fontSize:9,letterSpacing:2,marginBottom:10}}>SCENARIO</div>
            <p style={{color:'#647a8e',fontSize:12,lineHeight:1.8,margin:'0 0 14px'}}>A Category-3 flood approaches. Your basement faces rising hydrostatic pressure. Configure defences before the simulation, then manage them in real-time.</p>
            <div style={{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.18)',borderRadius:4,padding:'10px 14px'}}>
              <div style={{color:'#ef4444',fontSize:9,letterSpacing:1,marginBottom:8}}>3 FAIL CONDITIONS</div>
              {[['FOUNDATION COLLAPSE',`ΔP > ${PRESSURE_THRESH}ft cracks the foundation`],['ARC FLASH',`Live panel + water at ${PANEL_FT}ft = electrocution`],['LIVING SPACE FLOODED',`Interior reaches ${BASEMENT_FT}ft`]].map(([t,d])=>(
                <div key={t} style={{marginBottom:6}}>
                  <span style={{color:'#f87171',fontSize:10,fontWeight:700}}>▪ {t}</span>
                  <div style={{color:'#2a4055',fontSize:10,marginLeft:10}}>{d}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:'#0d0d0d',border:'1px solid #1a2535',borderRadius:6,padding:18}}>
            <div style={{color:'#00e5ff',fontSize:9,letterSpacing:2,marginBottom:10}}>CONTROLS</div>
            {[['BACKWATER VALVE ($150)','Cuts sewer backflow. Pre-flood, one-time.','#a78bfa'],['HYDROSTATIC VENTS','OPEN equalizes ΔP. Floods basement, saves structure.','#fbbf24'],['MAIN BREAKER','ISOLATE before water hits the panel. Live = arc flash.','#ef4444'],['SUMP PUMP 0–100%','Removes interior water. Grid=unlimited. Battery=finite.','#0ea5e9']].map(([n,d,c])=>(
              <div key={n} style={{marginBottom:11}}>
                <div style={{color:c,fontSize:11,fontWeight:700}}>{n}</div>
                <div style={{color:'#2a4055',fontSize:10,lineHeight:1.6,marginTop:2}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'#0d0d0d',border:'1px solid #1a2535',borderRadius:6,padding:'12px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:18}}>
          <div style={{flex:1}}>
            <div style={{color:s.backwater?'#22c55e':'#a78bfa',fontSize:11,fontWeight:700}}>{s.backwater?'✓ BACKWATER VALVE INSTALLED':'↳ INSTALL BACKWATER VALVE (pre-flood only)'}</div>
            <div style={{color:'#2a4055',fontSize:10,marginTop:4,lineHeight:1.6}}>{s.backwater?'Sewer backflow blocked at main line. (FEMA P-312 §5.3).':`FEMA P-312 §5.3: blocks sewer reversal. Without it, backflow adds ${(SEWER_RATE*SIM_TICKS).toFixed(1)}ft of interior water. $${BACKWATER_COST}.`}</div>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center',flexShrink:0}}>
            <span style={{color:'#2a4055',fontSize:11}}>💰 <span style={{color:'#22c55e'}}>${s.budget}</span></span>
            {!s.backwater&&<button onClick={()=>dispatch({type:'BACKWATER'})} disabled={s.budget<BACKWATER_COST}
              style={{padding:'8px 18px',borderRadius:3,fontFamily:MONO,fontSize:12,fontWeight:700,letterSpacing:1,cursor:s.budget<BACKWATER_COST?'not-allowed':'pointer',border:'1px solid #7c3aed',background:'rgba(124,58,237,0.1)',color:'#a78bfa',opacity:s.budget<BACKWATER_COST?0.4:1}}>
              INSTALL ${BACKWATER_COST}</button>}
          </div>
        </div>
        <div style={{textAlign:'center'}}>
          <button onClick={()=>dispatch({type:'START'})} style={{padding:'14px 60px',borderRadius:4,fontFamily:MONO,fontSize:16,fontWeight:700,letterSpacing:3,cursor:'pointer',border:'2px solid #ef4444',background:'rgba(239,68,68,0.08)',color:'#ef4444'}}>▶ START SIMULATION</button>
          <div style={{marginTop:10}}><button onClick={()=>gd({type:'BACK_TO_MODULES'})} style={{background:'none',border:'none',color:'#1e3050',fontFamily:MONO,fontSize:11,cursor:'pointer'}}>← BACK TO MODULES</button></div>
        </div>
      </div>
    </div>
  )

  return(
    <div style={{position:'fixed',inset:0,background:'#0a0a0a',fontFamily:MONO,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <style>{`
        @keyframes shake{0%,100%{transform:translate(0,0)}25%{transform:translate(-2px,1px)}75%{transform:translate(2px,-1px)}}
        @keyframes scan{from{transform:translateY(-4px)}to{transform:translateY(405px)}}
        @keyframes glow{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes arc{0%,100%{opacity:0}15%,45%{opacity:1}30%,60%{opacity:.1}}
        @keyframes shim{0%,100%{opacity:.55}50%{opacity:.78}}
        @keyframes pdash{to{stroke-dashoffset:-14}}
      `}</style>

      {/* TOP HUD */}
      <div style={{height:50,background:'#080808',borderBottom:'1px solid #111',display:'flex',alignItems:'center',padding:'0 16px',gap:14,flexShrink:0}}>
        <button onClick={()=>{dispatch({type:'FULL_RESET'});gd({type:'BACK_TO_MODULES'})}} style={{background:'none',border:'none',color:'#1e3050',fontFamily:MONO,fontSize:11,cursor:'pointer'}}>← EXIT</button>
        <div style={{color:'#00e5ff',fontSize:12,fontWeight:700,letterSpacing:2}}>M2 · HOME DEFENSE</div>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,maxWidth:340}}>
          <span style={{color:'#1e3050',fontSize:8,letterSpacing:1,flexShrink:0}}>FLOOD</span>
          <div style={{position:'relative',height:7,flex:1,background:'#0d0d0d',border:'1px solid #141414',borderRadius:3,overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,right:'auto',width:`${(s.tick/SIM_TICKS)*100}%`,background:s.tick<PEAK_TICK?'linear-gradient(90deg,#ef4444,#f97316)':'linear-gradient(90deg,#f97316,#22c55e)',transition:'width 0.3s'}}/>
            <div style={{position:'absolute',top:0,bottom:0,left:`${(PEAK_TICK/SIM_TICKS)*100}%`,width:2,background:'#fbbf24',opacity:0.5}}/>
          </div>
          <span style={{color:s.tick<PEAK_TICK?'#ef4444':'#22c55e',fontSize:9,fontWeight:700,flexShrink:0,minWidth:72}}>{s.tick<PEAK_TICK?'▲ RISING':'▼ RECEDING'}</span>
        </div>
        {[{l:'EXT',v:`${s.ext.toFixed(1)}ft`,c:'#3b82f6'},{l:'INT',v:`${s.int.toFixed(1)}ft`,c:'#60a5fa'},{l:'ΔP',v:`${dP.toFixed(1)}ft`,c:dP>PRESSURE_THRESH?'#ef4444':dP>1.5?'#f59e0b':'#22c55e'},{l:'STRUCT',v:`${s.struct.toFixed(0)}%`,c:s.struct>60?'#22c55e':s.struct>30?'#f59e0b':'#ef4444'}].map(({l,v,c})=>(
          <div key={l} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1,flexShrink:0}}>
            <span style={{color:'#1e3050',fontSize:8,letterSpacing:1}}>{l}</span>
            <span style={{color:c,fontSize:12,fontWeight:700}}>{v}</span>
          </div>
        ))}
        <div style={{color:'#22c55e',fontSize:11}}>💰 ${s.budget}</div>
      </div>

      <div style={{flex:1,display:'flex',minHeight:0}}>
        {/* SVG HOUSE */}
        <div style={{flex:1,padding:10,display:'flex',alignItems:'stretch',animation:shaking?'shake 0.12s ease-in-out infinite':'none'}}>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{width:'100%',height:'100%'}}>
            <defs>
              <linearGradient id="gEW2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.65"/><stop offset="100%" stopColor="#1e40af" stopOpacity="0.4"/></linearGradient>
              <linearGradient id="gIW2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.72"/><stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.5"/></linearGradient>
              <marker id="aR2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><polygon points="0,0 8,4 0,8" fill="#ef4444"/></marker>
              <marker id="aU2" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="auto"><polygon points="0,8 4,0 8,8" fill="#ef4444"/></marker>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="#060606"/>
            <rect x={0} y={0} width={SVG_W} height={G_LINE} fill="#090d12"/>
            <rect x={0} y={G_LINE} width={SVG_W} height={SVG_H-G_LINE} fill="#0c0a06"/>
            {s.ext>0.05&&<>
              <rect x={0} y={extTopY} width={80} height={G_LINE-extTopY} fill="url(#gEW2)" style={{animation:'shim 2s ease-in-out infinite'}}/>
              <rect x={0} y={G_LINE} width={80} height={SVG_H-G_LINE} fill="#1e3558" opacity="0.45"/>
              <rect x={620} y={extTopY} width={SVG_W-620} height={G_LINE-extTopY} fill="url(#gEW2)" style={{animation:'shim 2s ease-in-out .5s infinite'}}/>
              <rect x={620} y={G_LINE} width={SVG_W-620} height={SVG_H-G_LINE} fill="#1e3558" opacity="0.45"/>
              <line x1={0} y1={extTopY} x2={80} y2={extTopY} stroke="#60a5fa" strokeWidth="2"/>
              <line x1={620} y1={extTopY} x2={SVG_W} y2={extTopY} stroke="#60a5fa" strokeWidth="2"/>
              <text x="3" y={Math.max(13,extTopY-4)} fill="#60a5fa" fontSize="10" fontFamily="monospace">EXT {s.ext.toFixed(1)}ft</text>
            </>}
            {s.int>0.05&&<>
              <rect x={83} y={intTopY} width={534} height={B_FLOOR-intTopY} fill="url(#gIW2)" style={{animation:'shim 1.8s ease-in-out .3s infinite'}}/>
              <line x1={83} y1={intTopY} x2={617} y2={intTopY} stroke="#93c5fd" strokeWidth="2"/>
              <text x="88" y={Math.max(intTopY-4,G_LINE+14)} fill="#93c5fd" fontSize="10" fontFamily="monospace">INT {s.int.toFixed(1)}ft</text>
            </>}
            <path d="M85 132 L350 22 L615 132 Z" fill="rgba(0,229,255,0.012)" stroke="#00e5ff" strokeWidth="1.5"/>
            <rect x={100} y={132} width={500} height={G_LINE-132} fill="rgba(0,229,255,0.014)" stroke="#00e5ff" strokeWidth="1.5"/>
            <line x1={350} y1={132} x2={350} y2={G_LINE-6} stroke="#00e5ff" strokeWidth="0.8" strokeDasharray="5,4" opacity="0.3"/>
            <rect x={82} y={G_LINE} width={536} height={B_FLOOR-G_LINE} fill="none" stroke="#00e5ff" strokeWidth="2.5"/>
            <rect x={82} y={B_FLOOR-5} width={536} height={5} fill="#00e5ff" opacity="0.35"/>
            <rect x={82} y={G_LINE-7} width={536} height={9} fill="#0f1a0f" stroke="#00e5ff" strokeWidth="0.8"/>
            {[[130,150,70,46],[490,150,70,46]].map(([x,y,w,h],i)=><g key={i}><rect x={x} y={y} width={w} height={h} fill="rgba(0,229,255,0.04)" stroke="#00e5ff" strokeWidth="1" opacity="0.5"/><line x1={x} y1={y+h/2} x2={x+w} y2={y+h/2} stroke="#00e5ff" strokeWidth="0.5" opacity="0.3"/></g>)}
            <rect x={308} y={172} width={78} height={G_LINE-172} fill="rgba(0,229,255,0.03)" stroke="#00e5ff" strokeWidth="1" opacity="0.5"/>
            <circle cx={376} cy={G_LINE-18} r={3} fill="#fbbf24" opacity="0.45"/>
            {[[118,G_LINE-30,54,22],[528,G_LINE-30,54,22]].map(([x,y,w,h],i)=><rect key={i} x={x} y={y} width={w} height={h} fill="rgba(0,229,255,0.04)" stroke="#00e5ff" strokeWidth="0.7" opacity="0.4"/>)}
            <line x1={0} y1={G_LINE} x2={82} y2={G_LINE} stroke="#22c55e" strokeWidth="1" strokeDasharray="4,3"/>
            <line x1={618} y1={G_LINE} x2={SVG_W} y2={G_LINE} stroke="#22c55e" strokeWidth="1" strokeDasharray="4,3"/>
            <text x="3" y={G_LINE-4} fill="#22c55e" fontSize="9" fontFamily="monospace">GRADE</text>
            {(()=>{const danger=s.breaker&&s.int>=PANEL_FT-0.5;const pc=s.breaker?(danger?'#ef4444':'#d97706'):'#059669';return(<g>
              <rect x={88} y={PANEL_Y-22} width={46} height={33} fill={pc} opacity="0.9" rx="3"/>
              <text x={92} y={PANEL_Y-9} fill="#000" fontSize="8" fontFamily="monospace" fontWeight="bold">⚡ {s.breaker?'LIVE':'OFF'}</text>
              <text x={92} y={PANEL_Y+3} fill="#000" fontSize="7" fontFamily="monospace">PANEL</text>
              <line x1={134} y1={PANEL_Y-10} x2={200} y2={PANEL_Y-10} stroke={pc} strokeWidth="1" strokeDasharray="3,2"/>
              <text x={204} y={PANEL_Y-6} fill={pc} fontSize="9" fontFamily="monospace">ELEC PANEL @ {PANEL_FT}ft {danger&&'⚠ DANGER'}</text>
              {danger&&s.phase==='running'&&<rect x={83} y={PANEL_Y-26} width={534} height={32} fill="rgba(239,68,68,0.1)" style={{animation:'glow 0.3s ease-in-out infinite'}}/>}
              {s.phase==='failed'&&s.failMsg.includes('ARC')&&<text x={220} y={PANEL_Y-38} fill="#fbbf24" fontSize="22" style={{animation:'arc 0.12s linear infinite'}}>⚡⚡⚡</text>}
            </g>)})()}
            {(()=>{const sc=s.backwater?'#059669':'#7c3aed';const bf=!s.backwater&&s.ext>1&&s.phase==='running';return(<g>
              <ellipse cx={225} cy={B_FLOOR-10} rx={22} ry={8} fill={sc} opacity="0.85" stroke={s.backwater?'#34d399':'#8b5cf6'} strokeWidth="1.5"/>
              <text x={251} y={B_FLOOR-7} fill={sc} fontSize="9" fontFamily="monospace">SEWER {s.backwater?'✓SEALED':'⚠OPEN'}</text>
              {bf&&<g style={{animation:'glow 0.7s ease-in-out infinite'}}><line x1={225} y1={B_FLOOR-18} x2={225} y2={B_FLOOR-46} stroke="#ef4444" strokeWidth="2" markerEnd="url(#aU2)"/><text x={233} y={B_FLOOR-31} fill="#ef4444" fontSize="8" fontFamily="monospace">BACKFLOW</text></g>}
            </g>)})()}
            {(()=>{const pc=pumpOn?'#0ea5e9':'#1a2535';return(<g>
              <circle cx={490} cy={B_FLOOR-20} r={16} fill={pc} stroke={pumpOn?'#38bdf8':'#1e3a5f'} strokeWidth="1.5"/>
              <text x={482} y={B_FLOOR-15} fill={pumpOn?'#fff':'#2a4055'} fontSize="9" fontFamily="monospace" fontWeight="bold">PUMP</text>
              {pumpOn&&<><line x1={490} y1={B_FLOOR-36} x2={490} y2={B_FLOOR-68} stroke="#38bdf8" strokeWidth="2" strokeDasharray="5,3" style={{animation:'pdash 0.4s linear infinite'}}/><text x={497} y={B_FLOOR-52} fill="#38bdf8" fontSize="8" fontFamily="monospace">{Math.round(s.throttle*100)}%</text><text x={497} y={B_FLOOR-41} fill="#0ea5e9" fontSize="7" fontFamily="monospace">{pumpSrc}</text></>}
            </g>)})()}
            {dP>0.4&&s.phase==='running'&&<g><line x1={52} y1={G_LINE+42} x2={81} y2={G_LINE+42} stroke="#ef4444" strokeWidth="2" markerEnd="url(#aR2)"/><line x1={648} y1={G_LINE+42} x2={619} y2={G_LINE+42} stroke="#ef4444" strokeWidth="2" style={{transform:'scaleX(-1)',transformOrigin:'633px 0'}} markerEnd="url(#aR2)"/><text x="4" y={G_LINE+39} fill="#ef4444" fontSize="9" fontFamily="monospace">ΔP={dP.toFixed(1)}</text></g>}
            {s.vents&&<><text x={150} y={G_LINE-34} fill="#00e5ff" fontSize="9" fontFamily="monospace" style={{animation:'glow 1.2s ease-in-out infinite'}}>↓VENT OPEN</text><text x={495} y={G_LINE-34} fill="#00e5ff" fontSize="9" fontFamily="monospace" style={{animation:'glow 1.2s ease-in-out .4s infinite'}}>↓VENT OPEN</text></>}
            <text x={350} y={182} fill="rgba(0,229,255,0.18)" fontSize="13" textAnchor="middle" fontFamily="monospace">LIVING SPACE</text>
            <text x={350} y={325} fill="rgba(0,229,255,0.14)" fontSize="12" textAnchor="middle" fontFamily="monospace">BASEMENT</text>
            {s.phase==='running'&&<rect x={0} y={0} width={SVG_W} height={3} fill="rgba(0,229,255,0.05)" style={{animation:'scan 3.5s linear infinite'}}/>}
          </svg>
        </div>

        {/* TELEMETRY */}
        <div style={{width:190,background:'#080808',borderLeft:'1px solid #101010',display:'flex',flexDirection:'column',padding:'16px 12px',gap:16}}>
          <div style={{color:'#1a2d40',fontSize:8,letterSpacing:3}}>TELEMETRY</div>
          <div style={{display:'flex',justifyContent:'space-around',flex:1,alignItems:'center'}}>
            <VGauge topLabel="Δ PRESSURE" bottomLabel="ΔP (ft)" value={dP} max={BASEMENT_FT} colorFn={p=>p<0.375?'#22c55e':p<0.75?'#f59e0b':'#ef4444'}/>
            <VGauge topLabel="STRUCTURAL INTEGRITY" bottomLabel="INTEG %" value={s.struct} max={100} colorFn={p=>p>0.60?'#22c55e':p>0.30?'#f59e0b':'#ef4444'}/>
            <VGauge topLabel="GROUND FLOOR CLEARANCE" bottomLabel="CLR (ft)" value={clearance} max={BASEMENT_FT} colorFn={p=>p>0.50?'#22c55e':p>0.25?'#f59e0b':'#ef4444'}/>
          </div>
          <div style={{borderTop:'1px solid #101010',paddingTop:12}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#1e3050',marginBottom:5}}><span>🔋 BATTERY</span><span style={{color:s.battery>50?'#22c55e':s.battery>20?'#f59e0b':'#ef4444'}}>{s.battery.toFixed(0)}%</span></div>
            <div style={{height:5,background:'#0a0a0a',border:'1px solid #141e2a',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,transition:'width 0.3s,background 0.4s',width:`${s.battery}%`,background:s.battery>50?'#22c55e':s.battery>20?'#f59e0b':'#ef4444'}}/></div>
            <div style={{fontSize:9,color:s.breaker?'#fbbf24':'#22c55e',letterSpacing:1,marginTop:6}}>SRC: {pumpSrc}</div>
          </div>
        </div>
      </div>

      {/* ══ CONTROL DECK — 5-card grid ══ */}
      <div style={{background:'#080808',borderTop:'2px solid #1a2535',padding:'12px 16px',flexShrink:0}}>

        {/* Section label */}
        <div style={{fontSize:8,color:'#1e3050',letterSpacing:3,textTransform:'uppercase',marginBottom:8}}>
          CONTROL DECK — {s.phase==='running'?<span style={{color:'#22c55e'}}>● SIM ACTIVE  TICK {s.tick}/{SIM_TICKS}</span>:'CONFIGURE BEFORE STARTING'}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'auto auto auto 1fr auto',gap:10,alignItems:'stretch'}}>

          {/* Card 1 — Backwater Valve (pre-flood) */}
          <div style={{background:'#0d0d0d',border:`1px solid ${s.backwater?'#22c55e33':'#7c3aed44'}`,borderRadius:6,padding:'10px 14px',display:'flex',flexDirection:'column',gap:6,minWidth:160}}>
            <div style={{fontSize:8,color:'#7c3aed',letterSpacing:2,textTransform:'uppercase'}}>🔧 PRE-FLOOD SETUP</div>
            <button onClick={()=>dispatch({type:'BACKWATER'})}
              disabled={s.backwater||s.phase==='running'||s.budget<BACKWATER_COST}
              style={{padding:'8px 12px',borderRadius:4,fontFamily:MONO,fontSize:11,fontWeight:700,letterSpacing:1,
                cursor:(s.backwater||s.phase==='running')?'not-allowed':'pointer',
                border:`1px solid ${s.backwater?'#22c55e':'#7c3aed'}`,
                background:s.backwater?'rgba(34,197,94,0.1)':'rgba(124,58,237,0.12)',
                color:s.backwater?'#22c55e':'#a78bfa',
                opacity:s.phase==='running'?0.4:1}}>
              {s.backwater?'✓ VALVE INSTALLED':`INSTALL VALVE  $${BACKWATER_COST}`}
            </button>
            <div style={{fontSize:9,color:'#2a4055',lineHeight:1.4}}>
              {s.backwater?'Sewer backflow blocked.':'Blocks sewage reversal via drain lines.'}
            </div>
            <div style={{fontSize:9,color:'#334155'}}>Budget: <span style={{color:'#22c55e'}}>${s.budget}</span></div>
          </div>

          {/* Card 2 — Hydrostatic Vents */}
          <div style={{background:'#0d0d0d',border:`1px solid ${s.vents?'#fbbf2444':'#1a2535'}`,borderRadius:6,padding:'10px 14px',display:'flex',flexDirection:'column',gap:6,minWidth:160}}>
            <div style={{fontSize:8,color:'#fbbf24',letterSpacing:2,textTransform:'uppercase'}}>💨 HYDROSTATIC VENTS</div>
            <button onClick={()=>dispatch({type:'SET_VENTS',v:!s.vents})}
              style={{padding:'8px 12px',borderRadius:4,fontFamily:MONO,fontSize:12,fontWeight:700,letterSpacing:1,cursor:'pointer',
                border:`1px solid ${s.vents?'#fbbf24':'#374151'}`,
                background:s.vents?'rgba(251,191,36,0.1)':'rgba(55,65,81,0.2)',
                color:s.vents?'#fbbf24':'#6b7280',transition:'all 0.2s'}}>
              {s.vents?'● OPEN — EQUALIZING':'○ CLOSED'}
            </button>
            <div style={{fontSize:9,color:'#2a4055',lineHeight:1.4}}>
              {s.vents?<span style={{color:'#fbbf24'}}>Water entering to equalize ΔP →</span>:'Open to relieve wall pressure (allows water in).'}
            </div>
          </div>

          {/* Card 3 — Main Breaker */}
          <div style={{background:'#0d0d0d',border:`1px solid ${!s.breaker?'#22c55e33':'#ef444433'}`,borderRadius:6,padding:'10px 14px',display:'flex',flexDirection:'column',gap:6,minWidth:160}}>
            <div style={{fontSize:8,color:s.breaker?'#ef4444':'#22c55e',letterSpacing:2,textTransform:'uppercase'}}>⚡ MAIN BREAKER</div>
            <button onClick={()=>dispatch({type:'SET_BREAKER',v:!s.breaker})}
              style={{padding:'8px 12px',borderRadius:4,fontFamily:MONO,fontSize:12,fontWeight:700,letterSpacing:1,cursor:'pointer',
                border:`1px solid ${s.breaker?'#ef4444':'#22c55e'}`,
                background:s.breaker?'rgba(239,68,68,0.1)':'rgba(34,197,94,0.08)',
                color:s.breaker?'#ef4444':'#22c55e',transition:'all 0.2s'}}>
              {s.breaker?'⚡ ON — LIVE (DANGER)':'○ ISOLATED — SAFE'}
            </button>
            <div style={{fontSize:9,lineHeight:1.4,color:s.breaker?'#7f1d1d':'#2a4055'}}>
              {s.breaker
                ?<span style={{color:'#f87171'}}>⚠ Water at {PANEL_FT}ft = ARC FLASH. Isolate now!</span>
                :'Breaker isolated. Pump runs on battery only.'}
            </div>
          </div>

          {/* Card 4 — Sump Pump Throttle (biggest card) */}
          <div style={{background:'#0d0d0d',border:`1px solid ${pumpOn?'#0ea5e944':'#1a2535'}`,borderRadius:6,padding:'10px 16px',display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:8,color:'#0ea5e9',letterSpacing:2,textTransform:'uppercase'}}>💧 SUMP PUMP THROTTLE</div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:pumpOn?'#0ea5e9':'#1e3a5f',boxShadow:pumpOn?'0 0 6px #0ea5e9':'none',transition:'all 0.3s'}}/>
                <span style={{color:pumpOn?'#38bdf8':'#334155',fontFamily:MONO,fontSize:11,fontWeight:700}}>{Math.round(s.throttle*100)}%  {pumpOn?'PUMPING':'IDLE'}</span>
              </div>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={s.throttle}
              onChange={e=>dispatch({type:'SET_THROTTLE',v:+e.target.value})}
              style={{accentColor:'#0ea5e9',width:'100%',height:6,cursor:'pointer'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:9,color:'#2a4055'}}>
                Power: <span style={{color:s.breaker?'#fbbf24':s.battery>0?'#22c55e':'#ef4444',fontWeight:700}}>{pumpSrc}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:9,color:'#1e3050'}}>🔋</span>
                <div style={{width:80,height:6,background:'#0a0a0a',border:'1px solid #141e2a',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,transition:'width 0.3s,background 0.4s',
                    width:`${s.battery}%`,
                    background:s.battery>50?'#22c55e':s.battery>20?'#f59e0b':'#ef4444'}}/>
                </div>
                <span style={{color:s.battery>50?'#22c55e':s.battery>20?'#f59e0b':'#ef4444',fontFamily:MONO,fontSize:10,fontWeight:700}}>{s.battery.toFixed(0)}%</span>
              </div>
            </div>
            <div style={{fontSize:9,color:'#1e3050'}}>
              {s.throttle===0?'▸ Drag slider right to start pumping water out of basement'
               :s.breaker?'Running on GRID — unlimited runtime'
               :s.battery>0?`Running on BATTERY — ${(s.battery/BAT_DRAIN/2).toFixed(0)}s remaining at this throttle`
               :'⚠ BATTERY DEAD — pump stopped. Switch to grid or reduce flood.'}
            </div>
          </div>

          {/* Card 5 — Action */}
          <div style={{background:'#0d0d0d',border:'1px solid #1a2535',borderRadius:6,padding:'10px 14px',display:'flex',flexDirection:'column',gap:8,justifyContent:'center',minWidth:130}}>
            {s.phase==='running'?(
              <div style={{textAlign:'center'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 8px #22c55e',margin:'0 auto 8px',animation:'glow 1s ease-in-out infinite'}}/>
                <div style={{color:'#22c55e',fontFamily:MONO,fontSize:10,letterSpacing:1}}>SIM ACTIVE</div>
                <div style={{color:'#1e3050',fontFamily:MONO,fontSize:9,marginTop:4}}>{s.tick} / {SIM_TICKS} ticks</div>
              </div>
            ):(
              <>
                <button onClick={()=>dispatch({type:s.phase==='setup'?'START':'RESET'})}
                  style={{padding:'11px',borderRadius:4,fontFamily:MONO,fontSize:13,fontWeight:700,letterSpacing:2,cursor:'pointer',
                    border:'2px solid #ef4444',background:'rgba(239,68,68,0.08)',color:'#ef4444',
                    boxShadow:'0 0 12px rgba(239,68,68,0.2)'}}>
                  {s.phase==='setup'?'▶ START':'↺ RETRY'}
                </button>
                {s.phase!=='setup'&&(
                  <button onClick={()=>dispatch({type:'FULL_RESET'})}
                    style={{padding:'7px',borderRadius:3,fontFamily:MONO,fontSize:10,cursor:'pointer',
                      border:'1px solid #141e2a',background:'transparent',color:'#2a4055'}}>
                    NEW SIM
                  </button>
                )}
              </>
            )}
          </div>

        </div>
      </div>

      {/* RESULT OVERLAY */}
      {(s.phase==='passed'||s.phase==='failed')&&(
        <div style={{position:'absolute',inset:0,zIndex:20,background:s.phase==='failed'?'rgba(239,68,68,0.07)':'rgba(34,197,94,0.05)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)'}}>
          <div style={{background:'#0e0e0e',borderRadius:8,padding:'34px 48px',textAlign:'center',maxWidth:560,width:'100%',border:`2px solid ${s.phase==='failed'?'#ef4444':'#22c55e'}`,boxShadow:`0 0 50px ${s.phase==='failed'?'rgba(239,68,68,0.18)':'rgba(34,197,94,0.12)'}`}}>
            <div style={{fontSize:48,marginBottom:10}}>{s.phase==='failed'?'💀':'✅'}</div>
            <div style={{color:s.phase==='failed'?'#ef4444':'#22c55e',fontFamily:MONO,fontSize:18,fontWeight:700,letterSpacing:3,marginBottom:6}}>{s.phase==='failed'?`FAIL: ${s.failMsg}`:'SIMULATION PASSED'}</div>
            {s.phase==='passed'&&<>
              <div style={{color:'#00e5ff',fontFamily:MONO,fontSize:42,fontWeight:900,margin:'6px 0'}}>{s.score}%</div>
              <div style={{display:'flex',justifyContent:'center',gap:28,margin:'10px 0 16px'}}>
                {[['STRUCTURAL',`${s.struct.toFixed(0)}%`,'#22c55e'],['BATTERY',`${s.battery.toFixed(0)}%`,'#0ea5e9']].map(([l,v,c])=>(
                  <div key={l}><div style={{color:'#1e3050',fontFamily:MONO,fontSize:9,letterSpacing:1}}>{l}</div><div style={{color:c,fontFamily:MONO,fontSize:20,fontWeight:700}}>{v}</div></div>
                ))}
              </div>
            </>}
            {s.phase==='failed'&&(
              <div style={{margin:'16px 0',padding:'14px 18px',background:'rgba(0,0,0,0.35)',border:'1px solid #1a2535',borderRadius:4,textAlign:'left'}}>
                <div style={{color:'#fbbf24',fontFamily:MONO,fontSize:9,letterSpacing:2,marginBottom:8}}>📋 FEMA REFERENCE</div>
                <div style={{color:'#647a8e',fontFamily:MONO,fontSize:11,lineHeight:1.8}}>
                  {s.failMsg==='FOUNDATION COLLAPSE'&&<><b style={{color:'#f87171'}}>FEMA P-312 §6.4:</b> Hydrostatic vents must equalize lateral wall pressure. ΔP &gt; {PRESSURE_THRESH}ft applies &gt;1,200 lbs/ft² to walls. Peak ΔP: <b>{dP.toFixed(1)}ft</b>. <span style={{color:'#fbbf24'}}>LESSON: Open vents before ΔP exceeds {PRESSURE_THRESH}ft.</span></>}
                  {s.failMsg==='ARC FLASH — ELECTROCUTION'&&<><b style={{color:'#f87171'}}>FEMA P-348:</b> Isolate main breaker BEFORE floodwater reaches electrical components. Submerged live panels arc-flash through conductive water. <span style={{color:'#fbbf24'}}>LESSON: Isolate breaker before water hits {PANEL_FT}ft.</span></>}
                  {s.failMsg==='LIVING SPACE FLOODED'&&<><b style={{color:'#f87171'}}>FEMA P-312 §5.1:</b> Sump pump + battery backup + sealed sewer are required. Sewer backflow alone adds {(SEWER_RATE*SIM_TICKS).toFixed(1)}ft without a backwater valve. <span style={{color:'#fbbf24'}}>LESSON: Install backwater valve + throttle pump ≥ 60%.</span></>}
                </div>
              </div>
            )}
            <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:6}}>
              <button onClick={()=>dispatch({type:'RESET'})} style={{padding:'10px 32px',borderRadius:3,fontFamily:MONO,fontSize:12,fontWeight:700,letterSpacing:2,cursor:'pointer',border:`1px solid ${s.phase==='failed'?'#ef4444':'#22c55e'}`,background:'transparent',color:s.phase==='failed'?'#ef4444':'#22c55e'}}>↺ RETRY</button>
              <button onClick={()=>{dispatch({type:'FULL_RESET'});gd({type:'BACK_TO_MODULES'})}} style={{padding:'10px 22px',borderRadius:3,fontFamily:MONO,fontSize:11,cursor:'pointer',border:'1px solid #141e2a',background:'transparent',color:'#1e3050'}}>← MODULES</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
