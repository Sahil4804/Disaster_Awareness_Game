import { useState, useEffect, useCallback } from 'react'
import { useGame } from '../context/GameContext'

// ── Shared style helpers ──────────────────────────────────────────────────────

const G = {   // gradient text
  background: 'linear-gradient(90deg,#60a5fa,#38bdf8,#22d3ee)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
}
const GO = {  // orange gradient text
  background: 'linear-gradient(90deg,#f97316,#fbbf24)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
}
const muted = '#94a3b8'

function Card({ children, accent, style = {} }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', border: `1px solid ${accent || 'rgba(255,255,255,0.1)'}`,
      borderRadius: 14, padding: '20px 24px', ...style,
    }}>
      {children}
    </div>
  )
}

function SrcRow({ icon, org, orgColor, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 11 }}>
      <span style={{ fontSize: '1.2rem', width: 28, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: '.82rem', color: orgColor || '#e2e8f0' }}>{org}</div>
        <div style={{ fontSize: '.76rem', color: muted, marginTop: 2, lineHeight: 1.55 }}>{text}</div>
      </div>
    </div>
  )
}

function Badge({ children, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 14px', borderRadius: 20,
      fontSize: '.78rem', fontWeight: 700,
      background: `${color}22`, color, border: `1px solid ${color}55`,
    }}>
      {children}
    </span>
  )
}

function ModItem({ icon, num, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 9, marginBottom: 6,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      fontSize: '.8rem', color: '#e2e8f0',
    }}>
      <span>{icon}</span>
      <span style={{ fontSize: '.68rem', color: '#475569', fontWeight: 800 }}>{num}</span>
      {label}
    </div>
  )
}

function LBorder({ color = '#3b82f6', title, titleColor, children }) {
  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 14, marginBottom: 18 }}>
      <h3 style={{ color: titleColor || color, fontSize: '.93rem', marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: '.82rem', color: muted, lineHeight: 1.65 }}>{children}</p>
    </div>
  )
}

function KPI({ num, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.7rem', fontWeight: 900, color, lineHeight: 1 }}>{num}</div>
      <div style={{ fontSize: '.72rem', color: muted, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ── Slide definitions ─────────────────────────────────────────────────────────

function Slide1() {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <div style={{ fontSize: '3.2rem', letterSpacing: 14, marginBottom: 24 }}>🌊 🔥 🌀 🏚️</div>
      <h1 style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)', fontWeight: 900, lineHeight: 1.1, margin: 0 }}>
        <span style={G}>Disaster Survival</span><br />Simulator
      </h1>
      <p style={{ fontSize: '1.15rem', color: muted, marginTop: 12 }}>An Interactive Web-Based Educational Game Platform</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40, margin: '30px 0' }}>
        <KPI num="14" label="Modules" color="#3b82f6" />
        <KPI num="4" label="Phases" color="#22c55e" />
        <KPI num="9+" label="Official Sources" color="#f97316" />
        <KPI num="3D" label="Experience" color="#a855f7" />
      </div>
      <div style={{ display: 'flex', gap: 24, color: '#334155', fontSize: '.85rem' }}>
        <span>📅 2024–25</span>
        <span>⚛️ React 19 + Three.js</span>
        <span>🎓 Disaster Preparedness Education</span>
      </div>
    </div>
  )
}

function Slide2() {
  const boxes = [
    { n: '39%', c: '#ef4444', tc: '#fca5a5', bc: 'rgba(239,68,68,.05)', text: 'of Americans have a household emergency plan — FEMA Ready.gov' },
    { n: '~50%', c: '#f59e0b', tc: '#fde68a', bc: 'rgba(245,158,11,.05)', text: 'of US flood fatalities occur inside vehicles — NOAA "Turn Around, Don\'t Drown"' },
    { n: '70%', c: '#a855f7', tc: '#d8b4fe', bc: 'rgba(168,85,247,.05)', text: 'retention improvement with simulation-based learning vs passive reading' },
    { n: '$1→$6', c: '#22c55e', tc: '#86efac', bc: 'rgba(34,197,94,.05)', text: 'return on investment — $1 on preparedness saves $6 in disaster response costs' },
  ]
  return (
    <div style={{ width: '100%', maxWidth: 860 }}>
      <p style={{ color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '.78rem', marginBottom: 10 }}>The Problem</p>
      <h2 style={{ color: '#f8fafc', fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: 24 }}>
        Most people are <span style={GO}>dangerously unprepared</span> for natural disasters
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {boxes.map((b, i) => (
          <Card key={i} accent={`${b.c}55`} style={{ background: b.bc }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: b.c }}>{b.n}</div>
            <p style={{ color: b.tc, fontSize: '.87rem', marginTop: 6, lineHeight: 1.6 }}>{b.text}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Slide3() {
  const feats = [
    { icon: '🎮', title: 'Scenario-Based Learning', body: 'Players make real decisions under pressure — wrong choices have immediate, educational consequences with feedback explaining the correct action.' },
    { icon: '📋', title: 'Official Source Citations', body: 'Every scoring rule is backed by FEMA, Red Cross, CDC, WHO, NOAA, OSHA, or EPA. A "Sources" panel is visible during and after every module.' },
    { icon: '📊', title: 'Readiness Dashboard', body: 'Tracks scores, pass rates, and knowledge gaps per phase. Gives a readiness grade (A+ Expert → F Critical) with personalised recommendations.' },
    { icon: '🎥', title: '3-D Immersive Experience', body: 'Module 7 uses React Three Fiber + Three.js to render a real-time 3-D campsite with animated tent assembly and a campfire.' },
  ]
  return (
    <div style={{ width: '100%', maxWidth: 820 }}>
      <p style={{ color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '.78rem', marginBottom: 10 }}>Our Solution</p>
      <h2 style={{ color: '#f8fafc', fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: 8 }}>
        Learn by <span style={G}>doing</span>, not reading
      </h2>
      <p style={{ color: muted, marginBottom: 22 }}>A browser-based disaster simulator where every decision has a real consequence, backed by official government guidance.</p>
      {feats.map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 0', borderBottom: i < feats.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
          <span style={{ fontSize: '1.35rem', width: 32, flexShrink: 0 }}>{f.icon}</span>
          <div>
            <strong style={{ color: '#f8fafc', fontSize: '.93rem' }}>{f.title}</strong>
            <p style={{ color: muted, fontSize: '.82rem', lineHeight: 1.65, margin: '3px 0 0' }}>{f.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Slide4() {
  return (
    <div style={{ width: '100%', maxWidth: 860 }}>
      <p style={{ color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '.78rem', marginBottom: 10 }}>Technical Architecture</p>
      <h2 style={{ color: '#f8fafc', fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: 22 }}>Built entirely on <span style={G}>modern React</span></h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ color: '#60a5fa', marginBottom: 12, fontSize: '1rem' }}>⚛️ Frontend</h3>
            <SrcRow icon="⚡" org="React 19 + Vite 4" orgColor="#f8fafc" text="Functional components, hooks, fast HMR dev server" />
            <SrcRow icon="🌐" org="React Three Fiber + Three.js" orgColor="#f8fafc" text="3-D WebGL rendering; r3f v9 bindings over Three.js r183" />
            <SrcRow icon="🎨" org="Inline CSS / CSS Modules" orgColor="#f8fafc" text="No Tailwind dependency; portable, zero-config styling" />
          </Card>
          <Card>
            <h3 style={{ color: '#22c55e', marginBottom: 12, fontSize: '1rem' }}>🗃️ State & Persistence</h3>
            <SrcRow icon="🔁" org="useReducer + Context API" orgColor="#f8fafc" text="Global game state: screen routing, scores, completed modules" />
            <SrcRow icon="💾" org="localStorage" orgColor="#f8fafc" text="Scores persist between sessions; reset from dashboard" />
          </Card>
        </div>
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ color: '#f97316', marginBottom: 12, fontSize: '1rem' }}>🗂️ Module Architecture</h3>
            <p style={{ fontSize: '.82rem', color: muted, lineHeight: 1.7 }}>Each module is a <strong style={{ color: '#f8fafc' }}>self-contained React component</strong>. The app-level router resolves disaster + module number → component, then injects the Sources Panel globally via a React Fragment.</p>
          </Card>
          <Card>
            <h3 style={{ color: '#a855f7', marginBottom: 12, fontSize: '1rem' }}>📦 Dependency Footprint</h3>
            <div style={{ fontSize: '.8rem', color: muted }}>
              {[['react + react-dom', '^19'], ['three', '^0.183'], ['@react-three/fiber', '^9'], ['@react-three/drei', '^10']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <span>{k}</span><span style={{ color: '#60a5fa' }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Slide5() {
  return (
    <div style={{ width: '100%', maxWidth: 900 }}>
      <p style={{ color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '.78rem', marginBottom: 10 }}>Course Structure</p>
      <h2 style={{ color: '#f8fafc', fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: 22 }}>14 modules across <span style={GO}>4 phases</span> of flood survival</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { emoji: '🛡️', label: 'Preparedness', color: '#3b82f6', bg: 'rgba(59,130,246,.07)', items: [['🎒','M1','Go-Bag'],['🏠','M2','Home Defense'],['⛓️','M3','Yard Lockdown']] },
          { emoji: '🚨', label: 'Response', color: '#f59e0b', bg: 'rgba(245,158,11,.07)', items: [['🚗','M4','Sinking Car'],['🚶','M5','Treacherous Trek']] },
          { emoji: '⛺', label: 'Survival', color: '#22c55e', bg: 'rgba(34,197,94,.07)', items: [['🩹','M6','First Responder'],['⛺','M7','Camp Safe Haven 3D'],['🪞','M8','SOS Signaling']] },
          { emoji: '🔧', label: 'Recovery', color: '#a855f7', bg: 'rgba(168,85,247,.07)', items: [['☣️','M9','Toxic Cleanup'],['⚡','M10','Invisible Trap'],['🧪','M11','Toxic Soup'],['🌊','M12','Wall of Water'],['🧠','M13','Calm Mind'],['🦟','M14','The Swarm']] },
        ].map(p => (
          <Card key={p.label} accent={`${p.color}55`} style={{ background: p.bg }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{p.emoji}</div>
            <h3 style={{ color: p.color, fontSize: '.88rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>{p.label}</h3>
            {p.items.map(([icon, num, name]) => <ModItem key={num} icon={icon} num={num} label={name} />)}
          </Card>
        ))}
      </div>
    </div>
  )
}

function Slide6() {
  const mods = [
    { icon: '🎒', phase: 'M1 · PREPAREDNESS', phaseC: '#3b82f6', title: '60-Second Go-Bag', body: 'Click-to-pack puzzle with a live countdown timer. 22 items (essential and decoy) — player must fill a bag within weight limits. Wrong items fail the survival test.', mech: '⚙️ Timer + weight constraint + item triage', mechC: '#3b82f6', accent: 'rgba(59,130,246,.3)' },
    { icon: '🚗', phase: 'M4 · RESPONSE', phaseC: '#ef4444', title: 'The Sinking Car', body: '7-step escape sequence with a rising water animation. Wrong answers accelerate water rise. Teaches SWOC — Seatbelt, Window, Out, Current.', mech: '⚙️ QTE sequence + rising urgency meter', mechC: '#ef4444', accent: 'rgba(239,68,68,.3)' },
    { icon: '⛺', phase: 'M7 · SURVIVAL · 3D', phaseC: '#22c55e', title: 'Camp Safe Haven', body: 'Click items in correct build order. Each placed item animates into a live Three.js scene — tent poles, extruded-geometry rainfly, pegs, campfire, stars.', mech: '⚙️ Order puzzle + 3-D real-time assembly', mechC: '#22c55e', accent: 'rgba(34,197,94,.3)' },
    { icon: '🧠', phase: 'M13 · RECOVERY', phaseC: '#a855f7', title: 'Calm Mind', body: '8-round dialogue tree with a live Panic Meter. Aggressive or fear-amplifying responses push the meter to 100. Teaches WHO Psychological First Aid.', mech: '⚙️ Dialogue choice + dynamic risk meter', mechC: '#a855f7', accent: 'rgba(168,85,247,.3)' },
  ]
  return (
    <div style={{ width: '100%', maxWidth: 900 }}>
      <p style={{ color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '.78rem', marginBottom: 10 }}>Module Showcases</p>
      <h2 style={{ color: '#f8fafc', fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: 22 }}>4 distinct <span style={G}>game mechanics</span></h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {mods.map(m => (
          <Card key={m.title} accent={m.accent}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
              <div>
                <span style={{ fontSize: '.68rem', color: m.phaseC, fontWeight: 800 }}>{m.phase}</span>
                <h3 style={{ color: '#f8fafc', fontSize: '.93rem' }}>{m.title}</h3>
              </div>
            </div>
            <p style={{ fontSize: '.8rem', color: muted, lineHeight: 1.65, marginBottom: 10 }}>{m.body}</p>
            <div style={{ fontSize: '.73rem', color: m.mechC, fontWeight: 700 }}>{m.mech}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Slide7() {
  return (
    <div style={{ width: '100%', maxWidth: 860 }}>
      <p style={{ color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '.78rem', marginBottom: 10 }}>3-D Innovation</p>
      <h2 style={{ color: '#f8fafc', fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: 8 }}>Module 7 — <span style={G}>Real-Time 3-D</span> Tent Assembly</h2>
      <p style={{ color: muted, marginBottom: 22 }}>The first module elevated from 2-D puzzle to immersive 3-D using WebGL rendering inside React.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ color: '#22c55e', marginBottom: 12, fontSize: '.95rem' }}>🏗️ How the Tent is Built</h3>
            <SrcRow icon="🟦" org="Ground Tarp" orgColor="#f8fafc" text="PlaneGeometry(3.2, 2.6) — blue, flat on ground" />
            <SrcRow icon="🪵" org="A-Frame Poles" orgColor="#f8fafc" text="CylinderGeometry, angle = atan2(1.3, 1.95) = 33.7° — mathematically precise lean" />
            <SrcRow icon="🟠" org="Rainfly" orgColor="#f8fafc" text="ExtrudeGeometry on triangular Shape — proper triangular prism, semi-transparent (78%)" />
            <SrcRow icon="⛏️" org="Ground Pegs" orgColor="#f8fafc" text="CylinderGeometry stakes + guy-line cylinders at each corner" />
          </Card>
        </div>
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ color: '#60a5fa', marginBottom: 12, fontSize: '.95rem' }}>✨ FloatIn Animation</h3>
            <p style={{ fontSize: '.82rem', color: muted, lineHeight: 1.7 }}>Each piece drops from <code style={{ color: '#fbbf24' }}>y = 12–16</code> units above and lerps to <code style={{ color: '#fbbf24' }}>y = 0</code> using <code style={{ color: '#fbbf24' }}>MathUtils.lerp(pos, 0, 0.055)</code> inside <code style={{ color: '#fbbf24' }}>useFrame()</code> — smooth, physics-like descent on every placed step.</p>
          </Card>
          <Card>
            <h3 style={{ color: '#f97316', marginBottom: 10, fontSize: '.95rem' }}>🔥 Scene Atmosphere</h3>
            <p style={{ fontSize: '.82rem', color: muted, lineHeight: 1.7 }}>Starfield (2,400 stars), procedural pine forest, flickering campfire with animated point light, hemisphere lighting for night sky, orbit controls for 360° inspection.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Slide8() {
  const orgs = [
    { icon: '🏛️', org: 'FEMA — Ready.gov', c: '#3b82f6', text: 'Go-bag contents, flood preparedness, shelter, flash flood warnings' },
    { icon: '🔴', org: 'American Red Cross', c: '#ef4444', text: 'First aid triage, shelter construction, flood safety, PFA' },
    { icon: '🏥', org: 'CDC', c: '#22c55e', text: 'Post-flood cleanup, contamination, mosquito prevention, hypothermia' },
    { icon: '🌩️', org: 'NOAA / NWS', c: '#60a5fa', text: '"Turn Around Don\'t Drown", flash flood speeds, vehicle safety' },
    { icon: '🌍', org: 'WHO', c: '#3b82f6', text: 'Psychological First Aid field guide, flood health impacts, vector control' },
    { icon: '🦺', org: 'OSHA', c: '#f59e0b', text: 'Electrical safety near downed lines, flood worker PPE' },
    { icon: '🌿', org: 'US EPA', c: '#22c55e', text: 'Chemical contamination, mold cleanup, generator CO safety' },
    { icon: '⚙️', org: 'US Army Corps of Engineers', c: '#94a3b8', text: 'Sandbag staggering pattern and flood-barrier techniques' },
    { icon: '⚓', org: 'US Coast Guard', c: '#3b82f6', text: 'Visual distress signals — mirror, flare, smoke standards' },
    { icon: '🧠', org: 'SAMHSA', c: '#a855f7', text: 'Crisis counselling, de-escalation, disaster behavioural health' },
  ]
  return (
    <div style={{ width: '100%', maxWidth: 900 }}>
      <p style={{ color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '.78rem', marginBottom: 10 }}>Educational Validation</p>
      <h2 style={{ color: '#f8fafc', fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: 8 }}>Every score backed by <span style={GO}>official organisations</span></h2>
      <p style={{ color: muted, marginBottom: 20 }}>Scoring criteria are not invented — each rule cites a specific guideline from a government or humanitarian body.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
        {orgs.map(o => <SrcRow key={o.org} icon={o.icon} org={o.org} orgColor={o.c} text={o.text} />)}
      </div>
      <div style={{ marginTop: 14, padding: '10px 16px', background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 10, fontSize: '.78rem', color: '#60a5fa', textAlign: 'center' }}>
        📋 A floating "Official Sources" panel with direct links is available during and after every module
      </div>
    </div>
  )
}

function Slide9() {
  return (
    <div style={{ width: '100%', maxWidth: 880 }}>
      <p style={{ color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '.78rem', marginBottom: 10 }}>Performance Tracking</p>
      <h2 style={{ color: '#f8fafc', fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: 8 }}>📊 Readiness <span style={G}>Dashboard</span></h2>
      <p style={{ color: muted, marginBottom: 22 }}>A full analytics page tracking how well a player understands each phase of disaster response.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        <Card><h3 style={{ color: '#60a5fa', marginBottom: 10, fontSize: '.93rem' }}>🏆 Overall Readiness</h3><p style={{ fontSize: '.8rem', color: muted, lineHeight: 1.65 }}>Conic-gradient circular gauge showing averaged score across all attempted modules. Graded A+ (Expert) → F (Critical).</p></Card>
        <Card><h3 style={{ color: '#22c55e', marginBottom: 10, fontSize: '.93rem' }}>📡 Phase Breakdown</h3><p style={{ fontSize: '.8rem', color: muted, lineHeight: 1.65 }}>Separate score bar and grade for each of the 4 phases (Preparedness, Response, Survival, Recovery).</p></Card>
        <Card><h3 style={{ color: '#f97316', marginBottom: 10, fontSize: '.93rem' }}>📋 Module Breakdown</h3><p style={{ fontSize: '.8rem', color: muted, lineHeight: 1.65 }}>Collapsible table per phase showing score bar, pass/fail badge, attempt count, best score, and direct Start/Retry button.</p></Card>
        <Card><h3 style={{ color: '#a855f7', marginBottom: 10, fontSize: '.93rem' }}>🎯 Recommendations</h3><p style={{ fontSize: '.8rem', color: muted, lineHeight: 1.65 }}>Strengths (≥75%) and Focus Areas (&lt;65% or not tried) identified automatically. One-click to retry any gap module.</p></Card>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[['💾','#60a5fa','Persistent via localStorage'],['📈','#22c55e','Tracks attempts + best score'],['🗑️','#f97316','Reset progress anytime'],['🎓','#a855f7','Readiness grade A+→F']].map(([icon, c, t]) => (
          <div key={t} style={{ flex: 1, minWidth: 120, textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10 }}>
            <div style={{ fontSize: '1.4rem' }}>{icon}</div>
            <div style={{ fontSize: '.7rem', color: muted, marginTop: 4 }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Slide10() {
  return (
    <div style={{ width: '100%', maxWidth: 880 }}>
      <p style={{ color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '.78rem', marginBottom: 10 }}>Learning Outcomes</p>
      <h2 style={{ color: '#f8fafc', fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: 22 }}>What players know <span style={G}>after completing</span> all 14 modules</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
        <div>
          <LBorder color="#3b82f6" title="🛡️ Preparedness Phase">Pack a FEMA-compliant go-bag for 72 hours. Shut off home utilities in the correct sequence. Secure outdoor hazards that become flood projectiles.</LBorder>
          <LBorder color="#f59e0b" title="🚨 Response Phase" titleColor="#f59e0b">Execute the 7-step car escape protocol. Probe floodwater before stepping. Apply "Turn Around Don't Drown" principles.</LBorder>
        </div>
        <div>
          <LBorder color="#22c55e" title="⛺ Survival Phase" titleColor="#22c55e">Triage bleeding priority. Build a waterproof shelter in sequence. Choose the correct SOS tool by condition (day/night/fog).</LBorder>
          <LBorder color="#a855f7" title="🔧 Recovery Phase" titleColor="#a855f7">Avoid carbon monoxide, electrical step-potential, and toxic contamination. Apply WHO Psychological First Aid. Prevent dengue/malaria with vector control.</LBorder>
        </div>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '16px 0' }} />
      <p style={{ textAlign: 'center', fontSize: '.82rem', color: '#475569' }}>All outcomes traceable to specific FEMA, WHO, CDC, or Red Cross competency guidelines</p>
    </div>
  )
}

function Slide11() {
  const cards = [
    { icon: '🌋', title: 'More Disaster Types', c: '#ef4444', body: 'Earthquake, Wildfire, Hurricane, and Tornado course packs. The modular architecture already supports multiple disaster keys.' },
    { icon: '📱', title: 'Mobile Responsive', c: '#3b82f6', body: 'Touch-first drag interactions. PWA packaging so it installs as a native-feeling app on Android and iOS.' },
    { icon: '🎥', title: 'Full 3-D Expansion', c: '#a855f7', body: 'Convert all 14 modules to R3F scenes. Add first-person perspective, physics-based water simulation, and procedural environments.' },
    { icon: '🎓', title: 'Instructor Dashboard', c: '#22c55e', body: 'Class-level analytics, exportable CSV scores, per-student completion reports, and configurable time limits for assessment use.' },
  ]
  return (
    <div style={{ width: '100%', maxWidth: 860 }}>
      <p style={{ color: '#f97316', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '.78rem', marginBottom: 10 }}>Future Work</p>
      <h2 style={{ color: '#f8fafc', fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: 26 }}>Where this project <span style={GO}>goes next</span></h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {cards.map(c => (
          <Card key={c.title} accent={`${c.c}55`} style={{ background: `${c.c}0d` }}>
            <h3 style={{ color: c.c, marginBottom: 10, fontSize: '.95rem' }}>{c.icon} {c.title}</h3>
            <p style={{ fontSize: '.82rem', color: muted, lineHeight: 1.65 }}>{c.body}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Slide12() {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 20 }}>🌊 🔥 🌀 🏚️</div>
      <h1 style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 900, margin: 0 }}><span style={G}>Thank You</span></h1>
      <p style={{ fontSize: '1.15rem', color: muted, margin: '10px 0 36px' }}>Questions & Discussion</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 540, width: '100%', marginBottom: 28 }}>
        <Card style={{ textAlign: 'left' }}>
          <h3 style={{ color: '#60a5fa', fontSize: '.83rem', marginBottom: 8 }}>🛠️ Tech Stack</h3>
          <p style={{ fontSize: '.76rem', color: muted, lineHeight: 1.7 }}>React 19 · Vite · Three.js · React Three Fiber · @react-three/drei · localStorage</p>
        </Card>
        <Card style={{ textAlign: 'left' }}>
          <h3 style={{ color: '#22c55e', fontSize: '.83rem', marginBottom: 8 }}>📚 Source Orgs</h3>
          <p style={{ fontSize: '.76rem', color: muted, lineHeight: 1.7 }}>FEMA · Red Cross · CDC · WHO · NOAA · OSHA · EPA · USCG · SAMHSA · US Army Corps</p>
        </Card>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Badge color="#3b82f6">14 Modules</Badge>
        <Badge color="#22c55e">4 Phases</Badge>
        <Badge color="#f97316">42 Citations</Badge>
        <Badge color="#a855f7">3-D Rendering</Badge>
        <Badge color="#ef4444">Real-World Standards</Badge>
      </div>
    </div>
  )
}

// ── Slide registry ────────────────────────────────────────────────────────────

const SLIDES = [
  { title: 'Title',               accent: '#3b82f6', Component: Slide1 },
  { title: 'The Problem',         accent: '#ef4444', Component: Slide2 },
  { title: 'Our Solution',        accent: '#22c55e', Component: Slide3 },
  { title: 'Architecture',        accent: '#a855f7', Component: Slide4 },
  { title: 'Course Structure',    accent: '#f59e0b', Component: Slide5 },
  { title: 'Module Showcases',    accent: '#3b82f6', Component: Slide6 },
  { title: '3-D Innovation',      accent: '#22c55e', Component: Slide7 },
  { title: 'Edu. Validation',     accent: '#f59e0b', Component: Slide8 },
  { title: 'Dashboard',           accent: '#a855f7', Component: Slide9 },
  { title: 'Learning Outcomes',   accent: '#22c55e', Component: Slide10 },
  { title: 'Future Work',         accent: '#f97316', Component: Slide11 },
  { title: 'Thank You',           accent: '#3b82f6', Component: Slide12 },
]

const TOTAL = SLIDES.length

// ── Main Presentation Component ───────────────────────────────────────────────

export default function Presentation() {
  const { dispatch }   = useGame()
  const [cur, setCur]  = useState(0)
  const [prev, setPrev] = useState(-1)

  const navigate = useCallback((dir) => {
    const next = (cur + dir + TOTAL) % TOTAL
    setPrev(cur)
    setCur(next)
    setTimeout(() => setPrev(-1), 480)
  }, [cur])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') navigate(1)
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')                     navigate(-1)
      if (e.key === 'Escape') dispatch({ type: 'NAVIGATE', payload: 'mainMenu' })
      if (e.key === 'Home')   { setPrev(cur); setCur(0); setTimeout(() => setPrev(-1), 480) }
      if (e.key === 'End')    { setPrev(cur); setCur(TOTAL - 1); setTimeout(() => setPrev(-1), 480) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, dispatch, cur])

  const pct = ((cur + 1) / TOTAL) * 100
  const { Component, accent } = SLIDES[cur]

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 30%, rgba(37,99,235,.12) 0%, #0b1120 55%)',
      fontFamily: 'system-ui, sans-serif', position: 'relative',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 20,
        background: 'rgba(11,17,32,0.85)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,.06)',
      }}>
        <button
          onClick={() => dispatch({ type: 'NAVIGATE', payload: 'mainMenu' })}
          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          ← Back to App
        </button>
        <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>
          🌊 Disaster Survival Simulator — Project Overview
        </span>
        {/* Slide chips */}
        <div style={{ display: 'flex', gap: 5 }}>
          {SLIDES.map((s, i) => (
            <button
              key={i}
              onClick={() => { setPrev(cur); setCur(i); setTimeout(() => setPrev(-1), 480) }}
              title={s.title}
              style={{
                width: i === cur ? 22 : 8, height: 8, borderRadius: 4,
                background: i === cur ? s.accent : 'rgba(255,255,255,.12)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all .25s',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Slide viewport ── */}
      <div
        style={{ flex: 1, position: 'relative', marginTop: 48, marginBottom: 54 }}
        onClick={(e) => {
          if (e.target.closest('button') && !e.target.closest('#nav-area')) return
          navigate(e.clientX > window.innerWidth / 2 ? 1 : -1)
        }}
      >
        {/* Background grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(rgba(59,130,246,.04) 1px, transparent 1px), linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {SLIDES.map(({ Component: Comp }, i) => {
          const isActive  = i === cur
          const isExiting = i === prev
          return (
            <div
              key={i}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 'clamp(20px,4vh,56px) clamp(20px,6vw,80px)',
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
                transform: isActive ? 'translateX(0)' : isExiting ? 'translateX(-55px)' : 'translateX(55px)',
                transition: 'opacity .42s ease, transform .42s ease',
                overflowY: 'auto',
              }}
            >
              <Comp />
            </div>
          )
        })}
      </div>

      {/* ── Bottom bar ── */}
      <div id="nav-area" style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 54,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 20,
        background: 'rgba(11,17,32,0.9)', backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,.06)',
      }}>
        {/* Slide title */}
        <span style={{ color: '#334155', fontSize: 12, fontWeight: 600, minWidth: 140 }}>
          {SLIDES[cur].title}
        </span>

        {/* Nav buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', color: '#94a3b8', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >‹</button>
          <span style={{ color: '#475569', fontSize: '.8rem', fontWeight: 600, minWidth: 52, textAlign: 'center' }}>
            {cur + 1} / {TOTAL}
          </span>
          <button
            onClick={() => navigate(1)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', color: '#94a3b8', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >›</button>
        </div>

        {/* Keyboard hint */}
        <span style={{ color: '#1e293b', fontSize: 11, minWidth: 140, textAlign: 'right' }}>
          ← → to navigate · Esc to exit
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ position: 'absolute', bottom: 54, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,.05)', zIndex: 21 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, #3b82f6, ${accent})`, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}
