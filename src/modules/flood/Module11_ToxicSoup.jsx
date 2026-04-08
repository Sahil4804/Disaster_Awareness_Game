import { useState, useEffect, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

// ── Constants ──────────────────────────────────────────────────────────
const INITIAL_STATE = {
  hydrocarbons: 100,
  cleanWater: 40,
  sediment: 80,
  bacteriaCount: 95,
  chemicalToxicity: 70,
}

const CORRECT_ORDER = ['settle', 'skim', 'filter', 'boil', 'drink']

const ACTION_INFO = {
  settle: {
    label: 'Wait / Let Settle',
    icon: '\u23F3',
    desc: 'Allow gravity to pull heavy sediment to the bottom.',
  },
  skim: {
    label: 'Skim Surface',
    icon: '\uD83E\uDEA3',
    desc: 'Remove the floating hydrocarbon layer from the top.',
  },
  filter: {
    label: 'Filter (Activated Carbon)',
    icon: '\uD83E\uDDEA',
    desc: 'Pass water through activated carbon to adsorb chemicals.',
  },
  boil: {
    label: 'Boil',
    icon: '\uD83D\uDD25',
    desc: 'Heat water to 100C to kill biological pathogens.',
  },
  drink: {
    label: 'Drink',
    icon: '\uD83E\uDD43',
    desc: 'Attempt to drink the treated water.',
  },
}

// ── Keyframe style injection (once) ────────────────────────────────────
const STYLE_ID = 'module11-keyframes'
function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes m11bubble {
      0% { transform: translateY(0) scale(1); opacity: 0.7; }
      50% { opacity: 1; }
      100% { transform: translateY(-120px) scale(0.3); opacity: 0; }
    }
    @keyframes m11shimmer {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes m11settle {
      0% { opacity: 0.5; transform: translateY(-4px); }
      100% { opacity: 0.3; transform: translateY(4px); }
    }
    @keyframes m11pulse {
      0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.3); }
      50% { box-shadow: 0 0 20px rgba(59,130,246,0.7); }
    }
    @keyframes m11fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `
  document.head.appendChild(style)
}

// ── Helper: gauge color ────────────────────────────────────────────────
function gaugeColor(value, invert) {
  // invert=true means high=bad (red), low=good (green)
  const pct = invert ? value : 100 - value
  if (pct < 30) return '#4ade80'
  if (pct < 60) return '#fbbf24'
  return '#f87171'
}

// ════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════
export default function Module11_WaterPurification() {
  const { dispatch } = useGame()

  const [phase, setPhase] = useState('intro') // intro | simulation | result
  const [vars, setVars] = useState({ ...INITIAL_STATE })
  const [actions, setActions] = useState([]) // ordered list of actions taken
  const [message, setMessage] = useState(null) // { text, type: 'info'|'warn'|'error'|'success' }
  const [isBoiling, setIsBoiling] = useState(false)
  const [settleTimer, setSettleTimer] = useState(0) // ticks of settling
  const [resultData, setResultData] = useState(null)

  useEffect(() => { injectKeyframes() }, [])

  // ── Settling effect (runs while settling is active) ──────────────────
  useEffect(() => {
    if (settleTimer <= 0) return
    const id = setInterval(() => {
      setSettleTimer(prev => {
        if (prev <= 1) {
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
      setVars(prev => ({
        ...prev,
        sediment: Math.min(100, prev.sediment + 3),
        cleanWater: Math.min(60, prev.cleanWater + 2),
      }))
    }, 400)
    return () => clearInterval(id)
  }, [settleTimer > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Boiling animation timer ──────────────────────────────────────────
  useEffect(() => {
    if (!isBoiling) return
    const id = setTimeout(() => setIsBoiling(false), 2500)
    return () => clearTimeout(id)
  }, [isBoiling])

  // ── Action handlers ──────────────────────────────────────────────────
  const showMsg = useCallback((text, type = 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4500)
  }, [])

  const doSettle = useCallback(() => {
    if (vars.sediment >= 98) {
      showMsg('Sediment has already fully settled. The bottom layer is packed tight.', 'info')
      return
    }
    setActions(prev => [...prev, 'settle'])
    setSettleTimer(8)
    showMsg('Waiting... gravity pulls heavier particles down. Specific gravity > 1 means they sink below the water line.', 'info')
  }, [vars.sediment, showMsg])

  const doSkim = useCallback(() => {
    if (vars.sediment < 90) {
      // Stirring up if sediment not settled
      setVars(prev => ({
        ...prev,
        sediment: Math.max(30, prev.sediment - 25),
        cleanWater: Math.max(20, prev.cleanWater - 10),
      }))
      setActions(prev => [...prev, 'skim-fail'])
      showMsg('MISTAKE: Sediment has not settled! Skimming disturbs the water and stirs particles back into suspension. Let it settle first.', 'error')
      return
    }
    if (vars.hydrocarbons < 10) {
      showMsg('The surface is already clear -- no hydrocarbon sheen remains.', 'info')
      return
    }
    setVars(prev => ({
      ...prev,
      hydrocarbons: Math.max(0, prev.hydrocarbons - 85),
      cleanWater: Math.min(70, prev.cleanWater + 8),
    }))
    setActions(prev => [...prev, 'skim'])
    showMsg('Hydrocarbons (specific gravity ~0.8) float on top. You skim the rainbow sheen off. Gravity separation works because oil is lighter than water.', 'success')
  }, [vars.sediment, vars.hydrocarbons, showMsg])

  const doFilter = useCallback(() => {
    if (vars.hydrocarbons > 20) {
      showMsg('WARNING: Activated carbon clogs immediately! The hydrocarbon layer must be removed first. Skim before filtering.', 'error')
      setActions(prev => [...prev, 'filter-fail'])
      return
    }
    if (vars.chemicalToxicity < 10) {
      showMsg('Chemical toxicity is already at safe levels.', 'info')
      return
    }
    setVars(prev => ({
      ...prev,
      chemicalToxicity: Math.max(5, prev.chemicalToxicity - 60),
      cleanWater: Math.min(85, prev.cleanWater + 12),
      hydrocarbons: Math.max(0, prev.hydrocarbons - 10),
    }))
    setActions(prev => [...prev, 'filter'])
    showMsg('Activated carbon adsorbs dissolved chemicals through molecular bonding. Pesticides, heavy metals, and organic pollutants are trapped in the carbon pores.', 'success')
  }, [vars.hydrocarbons, vars.chemicalToxicity, showMsg])

  const doBoil = useCallback(() => {
    setIsBoiling(true)
    const hasChemicals = vars.chemicalToxicity > 20 || vars.hydrocarbons > 20
    if (hasChemicals) {
      // THE TRAP: boiling concentrates chemicals
      setVars(prev => ({
        ...prev,
        bacteriaCount: 0,
        chemicalToxicity: Math.min(100, prev.chemicalToxicity + 25),
        cleanWater: Math.max(20, prev.cleanWater - 15),
        hydrocarbons: Math.min(100, prev.hydrocarbons + 5),
      }))
      setActions(prev => [...prev, 'boil-trap'])
      showMsg('DANGER: Bacteria killed, but boiling evaporated clean water while chemical contaminants REMAIN and CONCENTRATE. Industrial runoff, heavy metals, and petroleum byproducts are now MORE toxic per volume. This water will cause chemical poisoning!', 'error')
    } else {
      setVars(prev => ({
        ...prev,
        bacteriaCount: 0,
        cleanWater: Math.min(95, prev.cleanWater + 5),
      }))
      setActions(prev => [...prev, 'boil'])
      showMsg('Water boiled successfully! At 100C, bacteria, viruses, and protozoa are destroyed. Since chemicals were already removed, the water is now safe.', 'success')
    }
  }, [vars.chemicalToxicity, vars.hydrocarbons, showMsg])

  const doDrink = useCallback(() => {
    const safe = vars.bacteriaCount < 10 && vars.chemicalToxicity < 15 && vars.hydrocarbons < 10
    const score = safe ? 100 : Math.max(0, Math.round(
      (100 - vars.bacteriaCount) * 0.3 +
      (100 - vars.chemicalToxicity) * 0.4 +
      (100 - vars.hydrocarbons) * 0.3
    ))
    const passed = safe

    let explanation = ''
    if (safe) {
      explanation = 'The water is safe to drink. You followed the correct order of operations:\n\n1. SETTLE -- Let gravity separate heavy sediment (SG > 1) to the bottom.\n2. SKIM -- Remove floating hydrocarbons (SG ~0.8) from the surface.\n3. FILTER -- Activated carbon adsorbs dissolved chemicals.\n4. BOIL -- Kill biological pathogens (bacteria, viruses, protozoa).\n\nThis is the science of specific gravity separation combined with chemical adsorption and thermal sterilization.'
    } else if (vars.chemicalToxicity >= 50) {
      explanation = 'CHEMICAL POISONING! The water looks clear and bacteria-free, but it is loaded with concentrated industrial chemicals. Boiling without first removing chemicals caused evaporation of clean water, leaving behind a toxic concentrate of heavy metals, petroleum byproducts, and pesticides.\n\nThis is the most common mistake: assuming "boiled = safe." Boiling only addresses BIOLOGICAL contamination. Chemical contamination requires physical separation (skimming) and adsorption (activated carbon filtering) BEFORE boiling.'
    } else if (vars.bacteriaCount >= 30) {
      explanation = 'BIOLOGICAL CONTAMINATION! You skipped boiling. The water still contains dangerous bacteria including E. coli, Cryptosporidium, and other flood-borne pathogens. Always boil as the FINAL step.'
    } else {
      explanation = 'The water is partially treated but not fully safe. Some contaminants remain. The correct purification order matters: Settle -> Skim -> Filter -> Boil.'
    }

    setResultData({ score, passed, explanation })
    setPhase('result')
    dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-11', result: { score, passed } } })
  }, [vars, dispatch])

  const resetGame = useCallback(() => {
    setVars({ ...INITIAL_STATE })
    setActions([])
    setMessage(null)
    setIsBoiling(false)
    setSettleTimer(0)
    setResultData(null)
    setPhase('intro')
  }, [])

  // ── Derived visual values ────────────────────────────────────────────
  const oilHeight = Math.max(0, (vars.hydrocarbons / 100) * 14)        // % of beaker
  const sedimentHeight = Math.max(0, (vars.sediment / 100) * 22)       // % of beaker
  const waterClarity = vars.cleanWater / 100                            // 0..1
  const waterMurkR = Math.round(90 + (1 - waterClarity) * 60)
  const waterMurkG = Math.round(70 + waterClarity * 100)
  const waterMurkB = Math.round(50 + waterClarity * 120)
  const waterColor = `rgba(${waterMurkR}, ${waterMurkG}, ${waterMurkB}, 0.85)`

  // ════════════════════════════════════════════════════════════════════
  // INTRO PHASE
  // ════════════════════════════════════════════════════════════════════
  if (phase === 'intro') {
    return (
      <div style={S.container}>
        <div style={S.introBox}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{'\u2697\uFE0F\uD83C\uDF0A'}</div>
          <h1 style={S.title}>Module 11: Toxic Soup</h1>
          <h2 style={{ color: '#94a3b8', fontSize: 16, fontWeight: 400, margin: '4px 0 16px' }}>
            Specific Gravity and Water Purification
          </h2>
          <p style={S.text}>
            After a flood, harvested water is a deadly cocktail: petroleum floats on top
            (specific gravity ~0.8), sediment sinks to the bottom (SG &gt; 2), and dissolved
            chemicals and bacteria hide in between.
          </p>
          <p style={{ ...S.text, color: '#f87171', fontWeight: 'bold' }}>
            YOUR TASK: Make this floodwater drinkable. But beware -- if you just click
            "Boil," the bacteria die, but the chemicals CONCENTRATE as clean water
            evaporates. You must follow the correct order of operations.
          </p>
          <p style={{ ...S.text, color: '#fbbf24', fontSize: 13 }}>
            Hint: Think about specific gravity. What floats? What sinks? What dissolves?
            Each requires a different removal technique.
          </p>
          <button style={S.startBtn} onClick={() => setPhase('simulation')}>
            {'\uD83D\uDD2C'} Begin Purification
          </button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════
  // RESULT PHASE
  // ════════════════════════════════════════════════════════════════════
  if (phase === 'result' && resultData) {
    return (
      <div style={S.container}>
        <div style={{ ...S.introBox, maxWidth: 660, animation: 'm11fadeIn 0.5s ease-out' }}>
          <div style={{ fontSize: 56 }}>{resultData.passed ? '\u2705' : '\u2620\uFE0F'}</div>
          <h1 style={{ ...S.title, color: resultData.passed ? '#4ade80' : '#f87171' }}>
            {resultData.passed ? 'WATER IS SAFE' : 'CONTAMINATION DETECTED'}
          </h1>
          <div style={{
            fontSize: 48, fontWeight: 'bold', margin: '12px 0',
            color: resultData.passed ? '#4ade80' : '#f87171',
          }}>
            {resultData.score}%
          </div>

          {/* Science explanation */}
          <div style={{
            background: '#0f172a', borderRadius: 10, padding: 20, margin: '16px 0',
            textAlign: 'left', lineHeight: 1.7,
          }}>
            <h3 style={{ color: '#38bdf8', margin: '0 0 8px', fontSize: 15 }}>
              {'\uD83D\uDD2C'} Scientific Analysis
            </h3>
            {resultData.explanation.split('\n').map((line, i) => (
              <p key={i} style={{ color: '#cbd5e1', fontSize: 13, margin: '4px 0' }}>
                {line}
              </p>
            ))}
          </div>

          {/* Steps taken */}
          <div style={{
            background: '#0f172a', borderRadius: 10, padding: 16, margin: '8px 0',
            textAlign: 'left',
          }}>
            <h4 style={{ color: '#94a3b8', margin: '0 0 8px', fontSize: 13 }}>Your actions:</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {actions.map((a, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: a.includes('fail') || a.includes('trap') ? '#7f1d1d' : '#1e3a5f',
                  color: a.includes('fail') || a.includes('trap') ? '#fca5a5' : '#93c5fd',
                }}>
                  {i + 1}. {a}
                </span>
              ))}
            </div>
          </div>

          <div style={{
            background: '#1a1a2e', border: '1px solid #334155', borderRadius: 10,
            padding: 16, margin: '12px 0', textAlign: 'left',
          }}>
            <h4 style={{ color: '#fbbf24', margin: '0 0 6px', fontSize: 14 }}>
              {'\uD83C\uDF93'} Correct Order of Operations:
            </h4>
            <ol style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
              <li><strong>Settle</strong> -- Gravity pulls sediment (SG &gt; 2) to the bottom</li>
              <li><strong>Skim</strong> -- Hydrocarbons (SG ~0.8) float; remove the surface sheen</li>
              <li><strong>Filter</strong> -- Activated carbon adsorbs dissolved chemicals</li>
              <li><strong>Boil</strong> -- Thermal kill of biological pathogens (bacteria, viruses)</li>
              <li><strong>Drink</strong> -- Only after ALL contaminants are addressed</li>
            </ol>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
            <button style={S.startBtn} onClick={resetGame}>
              {'\uD83D\uDD04'} Try Again
            </button>
            <button
              style={{ ...S.startBtn, background: '#6366f1' }}
              onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
            >
              {'\uD83D\uDCCB'} Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════
  // SIMULATION PHASE
  // ════════════════════════════════════════════════════════════════════
  return (
    <div style={S.container}>
      {/* Header */}
      <div style={S.header}>
        <h2 style={{ color: '#f1f5f9', margin: 0, fontSize: 18 }}>
          {'\u2697\uFE0F'} Water Purification Lab
        </h2>
        <button
          style={S.backBtn}
          onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
        >
          {'\u2190'} Back
        </button>
      </div>

      {/* Main layout: beaker + gauges */}
      <div style={S.simLayout}>
        {/* ── LEFT: Beaker visualization ────────────────────────── */}
        <div style={S.beakerContainer}>
          <div style={S.beakerLabel}>Floodwater Sample -- Cross Section</div>

          {/* Beaker outer */}
          <div style={S.beakerOuter}>
            {/* Beaker glass */}
            <div style={S.beakerGlass}>
              {/* Oil / hydrocarbon layer (TOP) */}
              {vars.hydrocarbons > 2 && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: `${oilHeight}%`,
                  background: 'linear-gradient(135deg, #ff000040, #ff880060, #ffff0050, #00ff0040, #0088ff50, #8800ff40)',
                  backgroundSize: '200% 200%',
                  animation: 'm11shimmer 3s ease-in-out infinite',
                  borderRadius: '8px 8px 0 0',
                  zIndex: 3,
                  transition: 'height 0.8s ease',
                }}>
                  {/* Oily sheen lines */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'repeating-linear-gradient(110deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 10px)',
                    borderRadius: '8px 8px 0 0',
                  }} />
                </div>
              )}

              {/* Middle water layer */}
              <div style={{
                position: 'absolute',
                top: `${oilHeight}%`,
                left: 0,
                right: 0,
                bottom: `${sedimentHeight}%`,
                background: waterColor,
                transition: 'all 0.8s ease',
                zIndex: 2,
              }}>
                {/* Suspended particles */}
                {vars.sediment < 90 && Array.from({ length: Math.round((100 - vars.sediment) / 8) }).map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: 3 + (i % 3),
                    height: 3 + (i % 3),
                    borderRadius: '50%',
                    background: 'rgba(120, 80, 40, 0.6)',
                    top: `${10 + (i * 17) % 80}%`,
                    left: `${5 + (i * 23) % 90}%`,
                    animation: 'm11settle 1.5s ease-in-out infinite alternate',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}

                {/* Bacteria dots (very small, numerous) */}
                {vars.bacteriaCount > 10 && Array.from({ length: Math.round(vars.bacteriaCount / 12) }).map((_, i) => (
                  <div key={`b${i}`} style={{
                    position: 'absolute',
                    width: 2,
                    height: 2,
                    borderRadius: '50%',
                    background: 'rgba(200, 255, 100, 0.5)',
                    top: `${5 + (i * 13 + 7) % 90}%`,
                    left: `${3 + (i * 19 + 11) % 94}%`,
                  }} />
                ))}
              </div>

              {/* Sediment layer (BOTTOM) */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${sedimentHeight}%`,
                background: 'linear-gradient(180deg, #5a3a1e, #3d2510, #2a1808)',
                borderRadius: '0 0 8px 8px',
                transition: 'height 0.8s ease',
                zIndex: 2,
              }}>
                {/* Sediment texture */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)',
                  borderRadius: '0 0 8px 8px',
                }} />
              </div>

              {/* Boiling bubbles */}
              {isBoiling && Array.from({ length: 12 }).map((_, i) => (
                <div key={`bub${i}`} style={{
                  position: 'absolute',
                  bottom: `${sedimentHeight + 5}%`,
                  left: `${8 + (i * 8) % 84}%`,
                  width: 6 + (i % 4) * 3,
                  height: 6 + (i % 4) * 3,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.1)',
                  animation: 'm11bubble 1.2s ease-out infinite',
                  animationDelay: `${i * 0.15}s`,
                  zIndex: 10,
                }} />
              ))}

              {/* Beaker graduation marks */}
              {[20, 40, 60, 80].map(pct => (
                <div key={pct} style={{
                  position: 'absolute',
                  top: `${100 - pct}%`,
                  left: 0,
                  width: 12,
                  height: 1,
                  background: 'rgba(255,255,255,0.25)',
                  zIndex: 15,
                }}>
                  <span style={{
                    position: 'absolute', left: 15, top: -6,
                    fontSize: 9, color: 'rgba(255,255,255,0.35)',
                  }}>{pct}%</span>
                </div>
              ))}
            </div>

            {/* Beaker base */}
            <div style={{
              width: '110%',
              height: 8,
              background: 'linear-gradient(180deg, #64748b, #475569)',
              borderRadius: '0 0 6px 6px',
              marginTop: -1,
              marginLeft: '-5%',
            }} />
          </div>

          {/* Layer legend */}
          <div style={S.legend}>
            <div style={S.legendItem}>
              <div style={{
                width: 14, height: 14, borderRadius: 3,
                background: 'linear-gradient(135deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff)',
              }} />
              <span style={{ color: '#cbd5e1', fontSize: 11 }}>Hydrocarbons (SG ~0.8)</span>
            </div>
            <div style={S.legendItem}>
              <div style={{
                width: 14, height: 14, borderRadius: 3,
                background: waterColor,
              }} />
              <span style={{ color: '#cbd5e1', fontSize: 11 }}>Water layer</span>
            </div>
            <div style={S.legendItem}>
              <div style={{
                width: 14, height: 14, borderRadius: 3,
                background: '#3d2510',
              }} />
              <span style={{ color: '#cbd5e1', fontSize: 11 }}>Sediment (SG &gt; 2.0)</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Gauges panel ───────────────────────────────── */}
        <div style={S.gaugesPanel}>
          <h3 style={{ color: '#f1f5f9', margin: '0 0 12px', fontSize: 15 }}>
            {'\uD83D\uDCCA'} Real-Time Analysis
          </h3>

          <GaugeBar label="Hydrocarbons" value={vars.hydrocarbons} color={gaugeColor(vars.hydrocarbons, true)} icon={'\uD83D\uDEE2\uFE0F'} />
          <GaugeBar label="Water Clarity" value={vars.cleanWater} color={gaugeColor(vars.cleanWater, false)} icon={'\uD83D\uDCA7'} />
          <GaugeBar label="Sediment Settled" value={vars.sediment} color="#a78bfa" icon={'\u26F0\uFE0F'} />
          <GaugeBar label="Bacteria Count" value={vars.bacteriaCount} color={gaugeColor(vars.bacteriaCount, true)} icon={'\uD83E\uDDA0'} />
          <GaugeBar label="Chemical Toxicity" value={vars.chemicalToxicity} color={gaugeColor(vars.chemicalToxicity, true)} icon={'\u2622\uFE0F'} />

          {/* Safety assessment */}
          <div style={{
            marginTop: 16, padding: 12, borderRadius: 8,
            background: vars.bacteriaCount < 10 && vars.chemicalToxicity < 15 && vars.hydrocarbons < 10
              ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
            border: `1px solid ${vars.bacteriaCount < 10 && vars.chemicalToxicity < 15 && vars.hydrocarbons < 10 ? '#4ade8040' : '#f8717140'}`,
          }}>
            <div style={{
              fontSize: 12, fontWeight: 'bold',
              color: vars.bacteriaCount < 10 && vars.chemicalToxicity < 15 && vars.hydrocarbons < 10 ? '#4ade80' : '#f87171',
            }}>
              {vars.bacteriaCount < 10 && vars.chemicalToxicity < 15 && vars.hydrocarbons < 10
                ? '\u2705 SAFE TO DRINK'
                : '\u26A0\uFE0F NOT SAFE -- DO NOT DRINK'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              {vars.bacteriaCount >= 10 && 'High bacteria. '}
              {vars.chemicalToxicity >= 15 && 'Chemical toxicity present. '}
              {vars.hydrocarbons >= 10 && 'Hydrocarbon contamination. '}
              {vars.bacteriaCount < 10 && vars.chemicalToxicity < 15 && vars.hydrocarbons < 10 && 'All contaminant levels within safe thresholds.'}
            </div>
          </div>

          {/* Settling indicator */}
          {settleTimer > 0 && (
            <div style={{
              marginTop: 10, padding: 8, borderRadius: 6,
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid #38bdf840',
              animation: 'm11pulse 1.5s infinite',
            }}>
              <div style={{ fontSize: 12, color: '#38bdf8' }}>
                {'\u23F3'} Settling in progress... ({settleTimer} ticks remaining)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Message display ─────────────────────────────────────── */}
      {message && (
        <div style={{
          ...S.messageBar,
          background: message.type === 'error' ? '#7f1d1d'
            : message.type === 'success' ? '#14532d'
            : message.type === 'warn' ? '#78350f'
            : '#1e3a5f',
          borderColor: message.type === 'error' ? '#f87171'
            : message.type === 'success' ? '#4ade80'
            : message.type === 'warn' ? '#fbbf24'
            : '#38bdf8',
          animation: 'm11fadeIn 0.3s ease-out',
        }}>
          <div style={{
            fontSize: 13, lineHeight: 1.5,
            color: message.type === 'error' ? '#fca5a5'
              : message.type === 'success' ? '#bbf7d0'
              : message.type === 'warn' ? '#fde68a'
              : '#bfdbfe',
          }}>
            {message.type === 'error' && '\u274C '}
            {message.type === 'success' && '\u2705 '}
            {message.type === 'warn' && '\u26A0\uFE0F '}
            {message.type === 'info' && '\uD83D\uDD2C '}
            {message.text}
          </div>
        </div>
      )}

      {/* ── Action buttons ──────────────────────────────────────── */}
      <div style={S.actionBar}>
        {Object.entries(ACTION_INFO).map(([key, info]) => {
          const disabled = settleTimer > 0 && key !== 'settle'
          return (
            <button
              key={key}
              disabled={disabled}
              style={{
                ...S.actionBtn,
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: key === 'drink' ? '#7c3aed'
                  : key === 'boil' ? '#dc2626'
                  : key === 'settle' ? '#0369a1'
                  : key === 'skim' ? '#0d9488'
                  : '#2563eb',
              }}
              onClick={() => {
                if (disabled) return
                if (key === 'settle') doSettle()
                else if (key === 'skim') doSkim()
                else if (key === 'filter') doFilter()
                else if (key === 'boil') doBoil()
                else if (key === 'drink') doDrink()
              }}
            >
              <span style={{ fontSize: 22 }}>{info.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 'bold' }}>{info.label}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>
                {info.desc}
              </span>
            </button>
          )
        })}
      </div>

      {/* Action history strip */}
      {actions.length > 0 && (
        <div style={S.historyStrip}>
          <span style={{ fontSize: 11, color: '#64748b', marginRight: 8 }}>Steps:</span>
          {actions.map((a, i) => (
            <span key={i} style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: a.includes('fail') || a.includes('trap') ? '#7f1d1d' : '#1e293b',
              color: a.includes('fail') || a.includes('trap') ? '#fca5a5' : '#94a3b8',
              border: '1px solid #334155',
            }}>
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// Gauge Bar sub-component
// ════════════════════════════════════════════════════════════════════════
function GaugeBar({ label, value, color, icon }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{icon} {label}</span>
        <span style={{ fontSize: 12, fontWeight: 'bold', color }}>{Math.round(value)}</span>
      </div>
      <div style={{
        width: '100%', height: 10, borderRadius: 5,
        background: '#0f172a', overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: '100%',
          borderRadius: 5,
          background: color,
          transition: 'width 0.6s ease, background 0.4s ease',
        }} />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════════════════
const S = {
  container: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative',
    color: '#f1f5f9',
  },
  introBox: {
    maxWidth: 580,
    background: '#1e293b',
    borderRadius: 16,
    padding: 32,
    textAlign: 'center',
    marginTop: 40,
    border: '1px solid #334155',
  },
  title: {
    color: '#f1f5f9',
    fontSize: 26,
    margin: '12px 0 4px',
    fontWeight: 700,
  },
  text: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 1.7,
    margin: '10px 0',
  },
  startBtn: {
    padding: '13px 32px',
    fontSize: 16,
    fontWeight: 'bold',
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    marginTop: 14,
    transition: 'transform 0.15s',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 900,
    marginBottom: 10,
    padding: '10px 16px',
    background: '#1e293b',
    borderRadius: 10,
    border: '1px solid #334155',
  },
  backBtn: {
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 'bold',
    background: '#334155',
    color: '#f1f5f9',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  simLayout: {
    display: 'flex',
    gap: 20,
    width: '100%',
    maxWidth: 900,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  beakerContainer: {
    flex: '1 1 380px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  beakerLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  beakerOuter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 12px 0',
    background: 'linear-gradient(180deg, rgba(148,163,184,0.08), rgba(148,163,184,0.03))',
    borderRadius: 14,
    border: '1px solid #334155',
  },
  beakerGlass: {
    position: 'relative',
    width: 220,
    height: 360,
    background: 'linear-gradient(180deg, rgba(56,189,248,0.05), rgba(30,41,59,0.3))',
    border: '2px solid rgba(148,163,184,0.3)',
    borderRadius: '10px 10px 8px 8px',
    overflow: 'hidden',
    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.4)',
  },
  legend: {
    display: 'flex',
    gap: 16,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  gaugesPanel: {
    flex: '1 1 280px',
    maxWidth: 320,
    background: '#1e293b',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #334155',
    alignSelf: 'flex-start',
  },
  messageBar: {
    width: '100%',
    maxWidth: 900,
    marginTop: 12,
    padding: '12px 18px',
    borderRadius: 10,
    border: '1px solid',
  },
  actionBar: {
    display: 'flex',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 900,
  },
  actionBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px 16px',
    minWidth: 130,
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    transition: 'transform 0.15s, opacity 0.2s',
    flex: '1 1 130px',
    maxWidth: 170,
  },
  historyStrip: {
    display: 'flex',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
    width: '100%',
    maxWidth: 900,
    padding: '8px 12px',
    background: '#0f172a',
    borderRadius: 8,
    border: '1px solid #1e293b',
  },
}
