/**
 * Module 5 — Geospatial Routing: Swiftwater Tactical Pathfinding Simulator
 * Aesthetic  : Tactical Command Center — #0a0a0a, cyan/amber/crimson, JetBrains Mono
 * Mechanics  : useReducer · vector field physics · sonar battery · route execution
 * References : NFPA 1670 Swiftwater Rescue, FEMA IS-1001, USACE Flood Ops Manual
 */
import { useReducer, useEffect, useRef, useMemo, useState } from 'react'
import { useGame } from '../../context/GameContext'

const MONO    = "'JetBrains Mono','Courier New',Courier,monospace"
const GS      = 15        // grid size 15×15
const CPXL    = 38        // cell pixel size (large map)
const CPXS    = 24        // cell pixel size (mini-map)

// Physics thresholds
const FORCE_THRESHOLD = 280   // V² × D_in above this = dangerous
const START  = { x:0, y:0 }
const EXIT   = { x:14, y:14 }

// ─── Deterministic level generation ──────────────────────────────────────────
function makeGrid() {
  const G = Array.from({ length:GS }, (_, y) =>
    Array.from({ length:GS }, (_, x) => ({
      x, y,
      depth_in:    3,
      velocity_fps:1.5,
      flowDx: 0.6, flowDy: 0.4,
      hazard:      null,
      isExplored:  false,
    }))
  )
  const S = (x, y, p) => { if (x>=0&&x<GS&&y>=0&&y<GS) Object.assign(G[y][x], p) }

  // ── Base residential: gentle SE drift ──
  for (let y=0;y<GS;y++) for (let x=0;x<GS;x++) {
    G[y][x].depth_in    = 2 + ((x*3+y*2)%4)           // 2-5 in
    G[y][x].velocity_fps= 1 + ((x+y*2)%5)*0.25         // 1-2.25 fps
    G[y][x].flowDx = 0.55; G[y][x].flowDy = 0.45
  }

  // ── MAIN STREET — row 7 — lethal E-flow ──
  for (let x=0;x<GS;x++) S(x,7,{ depth_in:12, velocity_fps:8, flowDx:1, flowDy:0 })
  // Strainers on Main Street (always visible — obvious danger)
  ;[[3,7],[8,7],[12,7]].forEach(([x,y])=>S(x,y,{hazard:'STRAINER',isExplored:true}))

  // ── SECONDARY CHANNEL — col 7 — dangerous S-flow ──
  for (let y=0;y<GS;y++) if(y!==7) S(7,y,{ depth_in:9, velocity_fps:6, flowDx:0, flowDy:1 })

  // ── ALLEY ROWS — slow E-flow, dense HIDDEN manholes ──
  const alleyManholes = {
    2:  [1,4,7,10,12],
    4:  [2,5,8,11,13],
    9:  [0,3,6,9,12,14],
    12: [1,4,7,10,13],
  }
  for (const [rowStr, mxArr] of Object.entries(alleyManholes)) {
    const row = +rowStr
    for (let x=0;x<GS;x++) S(x,row,{ depth_in:4, velocity_fps:1.5, flowDx:0.85, flowDy:0.15 })
    mxArr.forEach(x => S(x,row,{ hazard:'MANHOLE' }))   // NOT explored — hidden
  }

  // ── PARK — bottom-right quadrant — SE flow, STRAINER traps ──
  for (let y=9;y<GS;y++) for (let x=9;x<GS;x++) {
    if (y===9||y===12) continue   // already set as alleys
    S(x,y,{ depth_in:7, velocity_fps:5, flowDx:0.7, flowDy:0.7 })
  }
  // Park strainers (hidden — down-current from SE flow)
  S(12,11,{ hazard:'STRAINER' })
  S(13,13,{ hazard:'STRAINER' })

  // ── Scattered manholes in safe zones ──
  ;[[2,1],[6,1],[11,1],[13,1],
    [1,5],[9,5],[14,5],
    [2,8],[5,8],[10,8],
    [3,10],[7,10],[11,10],[1,13],[6,13]
  ].forEach(([x,y])=>S(x,y,{ hazard:'MANHOLE' }))

  // ── Start & Exit always explored ──
  S(0,0, { depth_in:1, velocity_fps:0.5, flowDx:0.2, flowDy:0.2, isExplored:true })
  S(14,14,{ depth_in:1, velocity_fps:0.5, flowDx:0.2, flowDy:0.2, isExplored:true })

  return G
}

// ─── Force formula ─────────────────────────────────────────────────────────────
const calcForce = c => c.velocity_fps ** 2 * c.depth_in

// ─── Reducer ──────────────────────────────────────────────────────────────────
const INIT = {
  grid:         makeGrid(),
  playerLoc:    START,
  plannedRoute: [],
  inventory:    { sonarBattery:100, anchors:2 },
  simState:     'PLANNING',   // PLANNING|EXECUTING|FAILED|VICTORY
  execStep:     0,
  anchorActive: false,
  failReason:   null,
  score:        null,
}

function reducer(s, a) {
  switch (a.type) {

    case 'ADD_WP': {
      if (s.simState !== 'PLANNING') return s
      const { x, y } = a
      if (x<0||x>=GS||y<0||y>=GS) return s
      const last = s.plannedRoute.length ? s.plannedRoute[s.plannedRoute.length-1] : s.playerLoc
      if (Math.abs(x-last.x)>1 || Math.abs(y-last.y)>1) return s  // non-adjacent
      if (x===last.x && y===last.y) return s                        // same cell
      // If clicking existing waypoint, truncate route there
      const idx = s.plannedRoute.findIndex(p=>p.x===x&&p.y===y)
      if (idx>=0) return { ...s, plannedRoute: s.plannedRoute.slice(0,idx) }
      return { ...s, plannedRoute: [...s.plannedRoute, {x,y}] }
    }

    case 'CLEAR_WP':
      return { ...s, plannedRoute:[], anchorActive:false }

    case 'SONAR': {
      if (s.inventory.sonarBattery < 20) return s
      const { x, y } = s.playerLoc
      const newGrid = s.grid.map(row => row.map(c =>
        Math.abs(c.x-x)<=1 && Math.abs(c.y-y)<=1 ? {...c, isExplored:true} : c
      ))
      return { ...s, grid:newGrid, inventory:{ ...s.inventory, sonarBattery:s.inventory.sonarBattery-20 } }
    }

    case 'ANCHOR': {
      if (s.inventory.anchors<=0||s.anchorActive) return s
      return { ...s, anchorActive:true, inventory:{ ...s.inventory, anchors:s.inventory.anchors-1 } }
    }

    case 'COMMIT': {
      if (s.plannedRoute.length===0||s.simState!=='PLANNING') return s
      return { ...s, simState:'EXECUTING', execStep:0 }
    }

    case 'STEP': {
      if (s.simState!=='EXECUTING') return s
      const { execStep, plannedRoute } = s
      if (execStep >= plannedRoute.length) {
        // Route finished without reaching exit
        return { ...s, simState:'PLANNING', playerLoc: plannedRoute[plannedRoute.length-1] || s.playerLoc, plannedRoute:[], execStep:0 }
      }
      const next = plannedRoute[execStep]
      const cell = s.grid[next.y][next.x]
      const force = calcForce(cell)

      // ── MANHOLE trap (unexplored) ──
      if (cell.hazard==='MANHOLE' && !cell.isExplored) {
        const newGrid = s.grid.map(r=>r.map(c=>c.x===next.x&&c.y===next.y?{...c,isExplored:true}:c))
        return { ...s, simState:'FAILED', playerLoc:next, failReason:'SUBTERRANEAN ENTRAPMENT — unseen manhole displaced by flood. Unit pulled under.', grid:newGrid }
      }

      // ── STRAINER trap ──
      if (cell.hazard==='STRAINER') {
        return { ...s, simState:'FAILED', playerLoc:next, failReason:'PINNED BY HYDRODYNAMIC PRESSURE — strainer trapped unit against fence. Escape impossible.' }
      }

      // ── Force threshold check ──
      if (force > FORCE_THRESHOLD) {
        if (s.anchorActive) {
          // Anchor saves — consumed
          return { ...s, playerLoc:next, execStep:execStep+1, anchorActive:false }
        }
        return { ...s, simState:'FAILED', playerLoc:next, failReason:`SWEPT AWAY — hydrodynamic force ${force.toFixed(0)} lbs exceeded safe limit (${FORCE_THRESHOLD} lbs). No anchor deployed.` }
      }

      // ── Victory ──
      if (next.x===EXIT.x && next.y===EXIT.y) {
        const score = Math.min(100, Math.max(30, Math.round(
          s.inventory.sonarBattery * 0.25 +
          s.inventory.anchors * 20 +
          Math.max(0, 55 - execStep * 0.4)
        )))
        return { ...s, simState:'VICTORY', playerLoc:next, score, plannedRoute:[] }
      }

      return { ...s, playerLoc:next, execStep:execStep+1 }
    }

    case 'RESET': return { ...INIT, grid:makeGrid() }
    default:      return s
  }
}

// ─── Vector Arrow ─────────────────────────────────────────────────────────────
function Arrow({ dx, dy, v, px }) {
  const len = Math.min(px*0.35, 3 + v * 1.6)
  const m = Math.sqrt(dx*dx+dy*dy)||1
  const nx=dx/m, ny=dy/m
  const cx=px/2, cy=px/2
  const ex=cx+nx*len, ey=cy+ny*len
  const sx=cx-nx*len*0.4, sy=cy-ny*len*0.4
  const ang=Math.atan2(ny,nx), ah=len*0.36
  const a1x=ex-ah*Math.cos(ang-0.5), a1y=ey-ah*Math.sin(ang-0.5)
  const a2x=ex-ah*Math.cos(ang+0.5), a2y=ey-ah*Math.sin(ang+0.5)
  const col = v>5?'#ef4444':v>3?'#f59e0b':v>1.8?'#fbbf24':'#22c55e'
  const op  = 0.35 + Math.min(0.55, v*0.07)
  return (
    <svg width={px} height={px} style={{position:'absolute',inset:0,pointerEvents:'none'}}>
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={col} strokeWidth={1.2} opacity={op}/>
      <polygon points={`${ex},${ey} ${a1x},${a1y} ${a2x},${a2y}`} fill={col} opacity={op}/>
    </svg>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Module5_TreacherousTrek() {
  const { dispatch: gd } = useGame()
  const [s, dispatch]   = useReducer(reducer, INIT)
  const [hover, setHover] = useState(null)
  const [sonarAnim, setSonarAnim] = useState(null)
  const execRef = useRef(null)

  // Execution loop
  useEffect(() => {
    if (s.simState !== 'EXECUTING') return
    execRef.current = setInterval(() => dispatch({ type:'STEP' }), 500)
    return () => clearInterval(execRef.current)
  }, [s.simState])

  // Clear sonar animation
  useEffect(() => {
    if (!sonarAnim) return
    const t = setTimeout(() => setSonarAnim(null), 900)
    return () => clearTimeout(t)
  }, [sonarAnim])

  // Record score
  useEffect(() => {
    if (s.simState !== 'VICTORY' && s.simState !== 'FAILED') return
    const score = s.simState==='VICTORY' ? (s.score??50) : 0
    gd({ type:'RECORD_SCORE', payload:{ key:'flood-5', result:{ score, passed:s.simState==='VICTORY' } } })
  }, [s.simState]) // eslint-disable-line

  // Computed route max force
  const maxForce = useMemo(() => {
    const pts = [s.playerLoc, ...s.plannedRoute]
    return pts.reduce((m,p) => {
      const c = s.grid[p.y]?.[p.x]; return c ? Math.max(m, calcForce(c)) : m
    }, 0)
  }, [s.playerLoc, s.plannedRoute, s.grid])

  const handleSonar = () => {
    dispatch({ type:'SONAR' })
    setSonarAnim({ x:s.playerLoc.x, y:s.playerLoc.y })
  }

  const isWP = (x,y) => s.plannedRoute.findIndex(p=>p.x===x&&p.y===y)

  const mapW = GS * CPXL
  const mapH = GS * CPXL

  // ── RESULT screens ──────────────────────────────────────────────────────────
  if (s.simState === 'VICTORY' || s.simState === 'FAILED') {
    const pass = s.simState === 'VICTORY'
    return (
      <div style={{position:'fixed',inset:0,background:'#080808',fontFamily:MONO,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <style>{`@keyframes swept{0%{transform:translate(0,0);opacity:1}100%{transform:translate(190px,20px);opacity:0}}@keyframes blink-r{0%,100%{opacity:1}50%{opacity:.2}}`}</style>
        <div style={{height:48,background:'#080808',borderBottom:'1px solid #111',display:'flex',alignItems:'center',padding:'0 16px',gap:16}}>
          <div style={{color:pass?'#22c55e':'#ef4444',fontSize:13,fontWeight:700,letterSpacing:2}}>
            {pass?'ROUTE COMPLETE — EXTRACTION SUCCESSFUL':`MISSION ABORT — ${s.failReason}`}
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:10}}>
            <button onClick={()=>dispatch({type:'RESET'})} style={{padding:'7px 20px',borderRadius:3,fontFamily:MONO,fontSize:12,fontWeight:700,letterSpacing:2,cursor:'pointer',border:'1px solid #ef4444',background:'rgba(239,68,68,0.07)',color:'#ef4444'}}>↺ RETRY</button>
            <button onClick={()=>gd({type:'BACK_TO_MODULES'})} style={{padding:'7px 16px',borderRadius:3,fontFamily:MONO,fontSize:11,cursor:'pointer',border:'1px solid #1e2d3a',background:'transparent',color:'#334155'}}>← MODULES</button>
          </div>
        </div>
        <div style={{flex:1,display:'flex',overflow:'hidden'}}>
          {/* Mini result map */}
          <div style={{flex:1,padding:16,display:'flex',alignItems:'flex-start',justifyContent:'center',overflowY:'auto'}}>
            <div style={{position:'relative',width:GS*CPXS,height:GS*CPXS,flexShrink:0}}>
              {s.grid.map(row=>row.map(c=>{
                const force=calcForce(c)
                const bg=c.depth_in>8?'#2a0a0a':c.depth_in>6?'#1a1208':c.isExplored?'#121a12':'#0a0a0a'
                return(
                  <div key={`${c.x}-${c.y}`} style={{position:'absolute',left:c.x*CPXS,top:c.y*CPXS,width:CPXS,height:CPXS,background:bg,border:'1px solid #111',overflow:'hidden'}}>
                    <Arrow dx={c.flowDx} dy={c.flowDy} v={c.velocity_fps} px={CPXS}/>
                    {c.isExplored&&c.hazard==='MANHOLE'&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9}}>⬛</div>}
                    {c.isExplored&&c.hazard==='STRAINER'&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9}}>🕸</div>}
                    {c.x===EXIT.x&&c.y===EXIT.y&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10}}>🏁</div>}
                  </div>
                )
              }))}
              {/* Final player position */}
              <div style={{
                position:'absolute',
                left:s.playerLoc.x*CPXS,top:s.playerLoc.y*CPXS,
                width:CPXS,height:CPXS,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:12,zIndex:10,
                animation:s.failReason?.includes('SWEPT')?'swept 1.2s ease-in forwards':'none',
              }}>🧑</div>
            </div>
          </div>
          {/* Stats */}
          <div style={{width:340,background:'#080808',borderLeft:'1px solid #111',padding:'20px 18px',display:'flex',flexDirection:'column',gap:14}}>
            <div style={{fontSize:pass?44:44,textAlign:'center'}}>{pass?'🏁':'💀'}</div>
            {pass&&<div style={{color:'#00e5ff',fontFamily:MONO,fontSize:42,fontWeight:900,textAlign:'center'}}>{s.score}%</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                ['SONAR BATTERY',`${s.inventory.sonarBattery}%`,'#00e5ff'],
                ['ANCHORS LEFT', `${s.inventory.anchors}`,     '#fbbf24'],
                ['MAX FORCE',    `${maxForce.toFixed(0)} lbs`, maxForce>FORCE_THRESHOLD?'#ef4444':'#22c55e'],
                ['OUTCOME',      pass?'EXTRACTED':'FAILED',    pass?'#22c55e':'#ef4444'],
              ].map(([l,v,c])=>(
                <div key={l} style={{background:'#0d0d0d',border:'1px solid #141414',borderRadius:3,padding:'8px 10px'}}>
                  <div style={{color:'#1e3050',fontSize:8,letterSpacing:1}}>{l}</div>
                  <div style={{color:c,fontFamily:MONO,fontSize:14,fontWeight:700,marginTop:2}}>{v}</div>
                </div>
              ))}
            </div>
            {!pass&&(
              <div style={{background:'rgba(0,0,0,0.4)',border:'1px solid #1a2535',borderRadius:4,padding:'12px 14px'}}>
                <div style={{color:'#fbbf24',fontSize:9,letterSpacing:2,marginBottom:8}}>📋 NFPA 1670 REFERENCE</div>
                <div style={{color:'#647a8e',fontSize:10,lineHeight:1.8}}>
                  {s.failReason?.includes('SWEPT')&&<><b style={{color:'#f87171'}}>NFPA 1670:</b> "Swiftwater force = V²×D. Crossing channels exceeding this threshold without a belay line or anchor system results in loss of footing. Deploy a throw bag anchor before traversing high-velocity nodes."</>}
                  {s.failReason?.includes('STRAINER')&&<><b style={{color:'#f87171'}}>USACE:</b> "Strainers (chain-link fences, debris piles) trap victims against their face. Hydrodynamic pressure at 5 fps creates 60+ lbs of force per square foot — impossible to push against. Always survey down-current for strainers before entry."</>}
                  {s.failReason?.includes('MANHOLE')&&<><b style={{color:'#f87171'}}>FEMA IS-1001:</b> "Flooded urban environments hide open utility access points. Manhole covers displace at ≥2ft of water depth. Deploy sonar or probe equipment before foot entry in low-turbidity channels."</>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN SIMULATION ────────────────────────────────────────────────────────
  return (
    <div style={{position:'fixed',inset:0,background:'#070707',fontFamily:MONO,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <style>{`
        @keyframes sonar-ring{0%{width:4px;height:4px;opacity:.9;border-width:3px}100%{width:${CPXL*3.2}px;height:${CPXL*3.2}px;opacity:0;border-width:1px}}
        @keyframes blink-r{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes swept{0%{transform:translate(0,0);opacity:1}100%{transform:translate(180px,10px);opacity:0}}
        @keyframes pulse-wp{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        @keyframes exec-step{0%{background:rgba(0,229,255,0.2)}100%{background:transparent}}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{height:48,background:'#080808',borderBottom:'1px solid #111',display:'flex',alignItems:'center',padding:'0 14px',gap:14,flexShrink:0}}>
        <button onClick={()=>gd({type:'BACK_TO_MODULES'})} style={{background:'none',border:'none',color:'#1e3050',fontFamily:MONO,fontSize:11,cursor:'pointer'}}>← EXIT</button>
        <div style={{color:'#00e5ff',fontSize:12,fontWeight:700,letterSpacing:2}}>M5 · GEOSPATIAL ROUTING</div>
        <div style={{fontSize:9,color:'#1e3050',letterSpacing:1}}>SWIFTWATER RESCUE TACTICAL PATHFINDING</div>
        <div style={{marginLeft:'auto',display:'flex',gap:14,alignItems:'center'}}>
          <span style={{color:s.simState==='EXECUTING'?'#fbbf24':'#22c55e',fontFamily:MONO,fontSize:11,fontWeight:700,letterSpacing:2,
                        animation:s.simState==='EXECUTING'?'blink-r 1s ease-in-out infinite':'none'}}>
            {s.simState}
          </span>
          <span style={{color:'#334155',fontSize:10}}>
            PLAYER: <span style={{color:'#00e5ff',fontWeight:700}}>({s.playerLoc.x},{s.playerLoc.y})</span>
          </span>
          <span style={{color:'#334155',fontSize:10}}>
            WPS: <span style={{color:'#fbbf24',fontWeight:700}}>{s.plannedRoute.length}</span>
          </span>
          <span style={{color:'#334155',fontSize:10}}>
            MAX F: <span style={{color:maxForce>FORCE_THRESHOLD?'#ef4444':'#22c55e',fontWeight:700}}>{maxForce.toFixed(0)} lbs</span>
          </span>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>

        {/* ── GIS MAP ── */}
        <div style={{flex:1,overflowY:'auto',overflowX:'auto',padding:10,display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
          <div style={{position:'relative',width:mapW,height:mapH,flexShrink:0}}>

            {/* Cells */}
            {s.grid.map(row=>row.map(c=>{
              const force = calcForce(c)
              const wpIdx = isWP(c.x, c.y)
              const isPlayer = s.playerLoc.x===c.x && s.playerLoc.y===c.y
              const isStart  = c.x===START.x && c.y===START.y
              const isExit   = c.x===EXIT.x  && c.y===EXIT.y

              // Cell background: turbidity = depth-based muddy brown, darker = deeper
              const depthR = 12 + c.depth_in * 3
              const depthG = 8  + c.depth_in * 1.5
              const bg = c.isExplored
                ? `rgba(${depthR},${depthG},6,0.92)`
                : `rgba(8,6,4,0.97)`   // unexplored = opaque dark

              const borderCol = force>FORCE_THRESHOLD?'#ef444455':force>100?'#f59e0b33':'#0d1a0d'

              return (
                <div key={`${c.x}-${c.y}`}
                  onClick={()=>s.simState==='PLANNING'&&dispatch({type:'ADD_WP',x:c.x,y:c.y})}
                  onMouseEnter={()=>setHover(c)}
                  onMouseLeave={()=>setHover(null)}
                  style={{
                    position:'absolute', left:c.x*CPXL, top:c.y*CPXL,
                    width:CPXL, height:CPXL,
                    background:bg,
                    border:`1px solid ${borderCol}`,
                    cursor:s.simState==='PLANNING'?'crosshair':'default',
                    overflow:'visible',
                    zIndex:1,
                  }}>

                  {/* Vector arrow */}
                  <Arrow dx={c.flowDx} dy={c.flowDy} v={c.velocity_fps} px={CPXL}/>

                  {/* Hazard icons (explored only) */}
                  {c.isExplored && c.hazard==='MANHOLE' && (
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,zIndex:3}}>⬛</div>
                  )}
                  {c.isExplored && c.hazard==='STRAINER' && (
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,zIndex:3}}>🕸</div>
                  )}

                  {/* Depth/vel on extreme cells (explored) */}
                  {c.isExplored && force>FORCE_THRESHOLD && (
                    <div style={{position:'absolute',top:2,left:2,fontSize:6.5,color:'#ef4444',fontFamily:MONO,lineHeight:1.2,zIndex:4}}>
                      {c.depth_in}in<br/>{c.velocity_fps}fps
                    </div>
                  )}

                  {/* Start marker */}
                  {isStart && !isPlayer && (
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,zIndex:7}}>▶</div>
                  )}

                  {/* Exit marker */}
                  {isExit && (
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,zIndex:7}}>🏁</div>
                  )}

                  {/* Waypoint number */}
                  {wpIdx >= 0 && (
                    <div style={{
                      position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:8,
                    }}>
                      <div style={{
                        width:18,height:18,borderRadius:'50%',
                        background:'#fbbf24',border:'2px solid #fff',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:8,fontWeight:700,color:'#000',fontFamily:MONO,
                        animation:'pulse-wp 1.2s ease-in-out infinite',
                      }}>{wpIdx+1}</div>
                    </div>
                  )}

                  {/* Player */}
                  {isPlayer && (
                    <div style={{
                      position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:18,zIndex:10,
                    }}>🧑</div>
                  )}

                  {/* Execution flash */}
                  {s.simState==='EXECUTING' && isPlayer && (
                    <div style={{position:'absolute',inset:0,background:'rgba(0,229,255,0.2)',zIndex:9,animation:'exec-step 0.5s ease-out'}}/>
                  )}
                </div>
              )
            }))}

            {/* Route path lines */}
            <svg style={{position:'absolute',top:0,left:0,width:mapW,height:mapH,pointerEvents:'none',zIndex:6}}>
              {[s.playerLoc,...s.plannedRoute].map((p,i,arr)=>{
                if(i===arr.length-1)return null
                const n=arr[i+1]
                const x1=p.x*CPXL+CPXL/2, y1=p.y*CPXL+CPXL/2
                const x2=n.x*CPXL+CPXL/2, y2=n.y*CPXL+CPXL/2
                return(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fbbf24" strokeWidth={1.8} strokeDasharray="5,3" opacity={0.75}/>)
              })}
            </svg>

            {/* Sonar ring animation */}
            {sonarAnim && (
              <div style={{
                position:'absolute',
                left: sonarAnim.x*CPXL + CPXL/2,
                top:  sonarAnim.y*CPXL + CPXL/2,
                width:4, height:4,
                borderRadius:'50%',
                border:'3px solid #00e5ff',
                boxShadow:'0 0 8px #00e5ff',
                transform:'translate(-50%,-50%)',
                animation:'sonar-ring 0.85s ease-out forwards',
                zIndex:20, pointerEvents:'none',
              }}/>
            )}

            {/* Legend overlay */}
            <div style={{position:'absolute',top:6,right:6,background:'rgba(8,8,8,0.92)',border:'1px solid #1a2535',borderRadius:4,padding:'6px 8px',zIndex:25}}>
              {[['#ef4444','V>5 fps / D>8 in (LETHAL)'],['#f59e0b','V>3 fps (CAUTION)'],['#22c55e','Safe velocity']].map(([c,t])=>(
                <div key={t} style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}>
                  <div style={{width:10,height:2,background:c}}/>
                  <span style={{fontSize:7.5,color:'#334155',fontFamily:MONO}}>{t}</span>
                </div>
              ))}
              <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}><span style={{fontSize:9}}>⬛</span><span style={{fontSize:7.5,color:'#334155',fontFamily:MONO}}>MANHOLE (sonar req.)</span></div>
              <div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:9}}>🕸</span><span style={{fontSize:7.5,color:'#334155',fontFamily:MONO}}>STRAINER (lethal)</span></div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Route Analytics ── */}
        <div style={{width:268,background:'#080808',borderLeft:'1px solid #111',display:'flex',flexDirection:'column',overflow:'hidden'}}>

          {/* Hover telemetry */}
          <div style={{padding:'12px 14px',borderBottom:'1px solid #111',flexShrink:0}}>
            <div style={{fontSize:8,color:'#1a2d40',letterSpacing:3,marginBottom:8}}>HOVER NODE DATA</div>
            {hover ? (
              <>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:4}}>
                  <span style={{color:'#334155'}}>Coord</span>
                  <span style={{color:'#00e5ff',fontWeight:700}}>({hover.x}, {hover.y})</span>
                </div>
                {[
                  ['Depth',    `${hover.depth_in} in`,         '#3b82f6'],
                  ['Velocity', `${hover.velocity_fps.toFixed(2)} fps`, hover.velocity_fps>4?'#ef4444':hover.velocity_fps>2.5?'#f59e0b':'#22c55e'],
                  ['Force',    `${calcForce(hover).toFixed(0)} lbs`,   calcForce(hover)>FORCE_THRESHOLD?'#ef4444':'#22c55e'],
                  ['Flow Dir', `${hover.flowDx>=0?'+':''}${hover.flowDx.toFixed(1)}dx / ${hover.flowDy>=0?'+':''}${hover.flowDy.toFixed(1)}dy`, '#60a5fa'],
                  ['Status',   hover.isExplored?(hover.hazard||'CLEAR'):'UNEXPLORED', hover.isExplored?hover.hazard?'#ef4444':'#22c55e':'#fbbf24'],
                ].map(([l,v,c])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                    <span style={{color:'#2a4055'}}>{l}</span>
                    <span style={{color:c,fontWeight:700,fontFamily:MONO}}>{v}</span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{color:'#1e3050',fontSize:10}}>Hover a cell to inspect</div>
            )}
          </div>

          {/* Route analytics */}
          <div style={{padding:'12px 14px',borderBottom:'1px solid #111',flexShrink:0}}>
            <div style={{fontSize:8,color:'#1a2d40',letterSpacing:3,marginBottom:8}}>ROUTE ANALYTICS</div>
            {[
              ['Waypoints',  `${s.plannedRoute.length}`,       '#fbbf24'],
              ['Max Force',  `${maxForce.toFixed(0)} lbs`,     maxForce>FORCE_THRESHOLD?'#ef4444':'#22c55e'],
              ['Route Safe', maxForce>FORCE_THRESHOLD?'NO — ANCHOR REQ':'YES', maxForce>FORCE_THRESHOLD?'#ef4444':'#22c55e'],
            ].map(([l,v,c])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:5}}>
                <span style={{color:'#2a4055'}}>{l}</span>
                <span style={{color:c,fontWeight:700,fontFamily:MONO}}>{v}</span>
              </div>
            ))}
          </div>

          {/* Inventory */}
          <div style={{padding:'12px 14px',borderBottom:'1px solid #111',flexShrink:0}}>
            <div style={{fontSize:8,color:'#1a2d40',letterSpacing:3,marginBottom:10}}>INVENTORY</div>

            {/* Sonar battery */}
            <div style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#2a4055',marginBottom:4}}>
                <span>📡 SONAR BATTERY</span>
                <span style={{color:s.inventory.sonarBattery>40?'#00e5ff':'#ef4444',fontWeight:700}}>{s.inventory.sonarBattery}%</span>
              </div>
              <div style={{height:5,background:'#0a0a0a',border:'1px solid #141e2a',borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:2,transition:'width 0.3s',
                  width:`${s.inventory.sonarBattery}%`,
                  background:s.inventory.sonarBattery>40?'#00e5ff':s.inventory.sonarBattery>20?'#f59e0b':'#ef4444'}}/>
              </div>
              <div style={{fontSize:9,color:'#1e3050',marginTop:3}}>Reveals 3×3 area · 20% per ping</div>
            </div>

            {/* Anchors */}
            <div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#2a4055',marginBottom:4}}>
                <span>⚓ ANCHORS</span>
                <span style={{color:'#fbbf24',fontWeight:700}}>{s.inventory.anchors} remaining</span>
              </div>
              <div style={{display:'flex',gap:6}}>
                {[0,1].map(i=>(
                  <div key={i} style={{
                    width:28,height:22,borderRadius:3,
                    background:i<s.inventory.anchors?'rgba(251,191,36,0.15)':'rgba(0,0,0,0.3)',
                    border:`1px solid ${i<s.inventory.anchors?'#fbbf24':'#141414'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:12,
                  }}>
                    {i<s.inventory.anchors?'⚓':'—'}
                  </div>
                ))}
              </div>
              {s.anchorActive&&(
                <div style={{marginTop:5,fontSize:9,color:'#22c55e',fontWeight:700,animation:'blink-r 0.8s ease-in-out infinite'}}>
                  ● ANCHOR DEPLOYED — traverses 1 high-force node
                </div>
              )}
              <div style={{fontSize:9,color:'#1e3050',marginTop:3}}>Enables 1 high-force traversal</div>
            </div>
          </div>

          {/* Mission brief */}
          <div style={{padding:'10px 14px',flex:1,overflowY:'auto'}}>
            <div style={{fontSize:8,color:'#1a2d40',letterSpacing:3,marginBottom:8}}>MISSION BRIEF</div>
            {[
              {c:'#ef4444',t:'MAIN STREET (row 7)',d:'V=8fps, D=12in, Force=768lbs. Requires anchor or route around.'},
              {c:'#f59e0b',t:'SECONDARY CHANNEL (col 7)',d:'V=6fps, D=9in, Force=324lbs. Requires anchor.'},
              {c:'#fbbf24',t:'ALLEY ROWS (2,4,9,12)',d:'V=1.5fps, D=4in, safe — but dense hidden manholes. Use sonar.'},
              {c:'#a78bfa',t:'PARK (bottom-right)',d:'V=5fps, D=7in, Force=175lbs. Strainer traps at (12,11) and (13,13).'},
              {c:'#22c55e',t:'SAFE ZONES',d:'General residential. Low force. Some scattered manholes.'},
            ].map(({c,t,d})=>(
              <div key={t} style={{marginBottom:10}}>
                <div style={{color:c,fontSize:9,fontWeight:700}}>{t}</div>
                <div style={{color:'#2a4055',fontSize:9,lineHeight:1.5,marginTop:2}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ACTION DECK ── */}
      <div style={{background:'#080808',borderTop:'2px solid #1a2535',padding:'10px 14px',flexShrink:0}}>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>

          <DeckBtn icon="📡" label="SONAR PING" sub="-20% BATTERY · 3×3 REVEAL"
            color="#00e5ff"
            disabled={s.inventory.sonarBattery<20||s.simState==='EXECUTING'}
            onClick={handleSonar}/>

          <DeckBtn icon="⚓" label="DEPLOY ANCHOR" sub="-1 ANCHOR · HIGH-FORCE BYPASS"
            color="#fbbf24"
            active={s.anchorActive}
            disabled={s.inventory.anchors<=0||s.anchorActive||s.simState==='EXECUTING'}
            onClick={()=>dispatch({type:'ANCHOR'})}/>

          <div style={{width:1,height:34,background:'#141414'}}/>

          <DeckBtn icon="▶" label="COMMIT ROUTE" sub={`${s.plannedRoute.length} WAYPOINTS`}
            color="#22c55e"
            disabled={s.plannedRoute.length===0||s.simState==='EXECUTING'}
            urgent
            onClick={()=>dispatch({type:'COMMIT'})}/>

          <DeckBtn icon="✕" label="CLEAR WPS" sub="RESET PATH"
            color="#ef4444"
            disabled={s.plannedRoute.length===0||s.simState==='EXECUTING'}
            onClick={()=>dispatch({type:'CLEAR_WP'})}/>

          <div style={{marginLeft:'auto',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
            <div style={{fontSize:9,color:'#1e3050'}}>
              FORCE THRESHOLD: <span style={{color:'#fbbf24'}}>{FORCE_THRESHOLD} lbs</span> · Formula: <span style={{color:'#334155'}}>V² × D</span>
            </div>
            <div style={{fontSize:9,color:'#1e3050'}}>
              START: (0,0) → EXIT: (14,14) · Click adjacent cells to plot route
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeckBtn({ icon, label, sub, color, onClick, disabled, active, urgent }) {
  const MONO = "'JetBrains Mono','Courier New',Courier,monospace"
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding:'8px 14px', borderRadius:4, fontFamily:MONO, fontSize:11, fontWeight:700,
        letterSpacing:1, cursor:disabled?'not-allowed':'pointer',
        display:'flex', flexDirection:'column', alignItems:'flex-start', gap:2,
        border:`${urgent?2:1}px solid ${active?'#fff':color}${disabled?'33':'66'}`,
        background: active ? `${color}25` : disabled ? 'rgba(0,0,0,0.3)' : `${color}0d`,
        color: disabled ? '#2a4055' : active ? '#fff' : color,
        opacity: disabled ? 0.4 : 1, transition:'all 0.15s',
        boxShadow: urgent && !disabled ? `0 0 14px ${color}33` : 'none',
      }}>
      <span style={{display:'flex',alignItems:'center',gap:6}}><span>{icon}</span><span>{label}</span></span>
      {sub&&<span style={{fontSize:8,color:disabled?'#1e3050':active?'#ccc':'#334155',fontWeight:400,letterSpacing:0}}>{sub}</span>}
    </button>
  )
}
