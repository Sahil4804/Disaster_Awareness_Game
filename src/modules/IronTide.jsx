import { useReducer, useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from '../context/GameContext'

/* ──────────────────────────────────────────────
   CONSTANTS
   ────────────────────────────────────────────── */
const TOTAL_TIME = 360 // 6 minutes
const SEARCH_DURATION = 3000 // ms per hotspot search
const DEGRADE_INTERVAL = 1000 // ms tick for patient degradation

const COLORS = {
  bg: '#0a0a12',
  red: '#dc2626',
  green: '#22c55e',
  amber: '#f59e0b',
  blue: '#3b82f6',
  darkGrey: '#1a1a2e',
  panel: '#111122',
  text: '#e2e8f0',
  muted: '#64748b',
  black: '#000000',
}

/* ──────────────────────────────────────────────
   CASUALTY DATA
   ────────────────────────────────────────────── */
const CASUALTIES = [
  {
    id: 'CAS-1',
    name: 'Drowning Victim',
    location: 'Near Overturned Vehicle',
    hotspotIdx: 2,
    correctTag: 'RED',
    breathingResult: 'Agonal respirations — NOT effective breathing. Very faint, irregular chest rise.',
    pulseResult: 'Weak carotid pulse detected. Rate ~40 BPM.',
    woundsResult: 'No visible external trauma. Skin pale, lips cyanotic.',
    correctTreatment: ['Rescue Breathing Mask', 'Recovery Position'],
    treatmentZone: 'chest',
    degradeRate: 1.5,
    degradeMax: 60,
    startVitals: { hr: 40, rr: 6, spo2: 82, skin: 'Pale / Cyanotic', status: 'CRITICAL' },
    educational: 'Drowning victims with agonal respirations need immediate airway management. Rescue breathing is the priority — without oxygenation, cardiac arrest follows within minutes. The recovery position helps drain water from the airway.',
  },
  {
    id: 'CAS-2',
    name: 'Crush Injury',
    location: 'Under Collapsed Building',
    hotspotIdx: 1,
    correctTag: 'RED',
    breathingResult: 'Normal rate, 22/min.',
    pulseResult: 'Strong radial pulse, 110 BPM — tachycardic.',
    woundsResult: 'Right leg pinned under concrete. Visible bone fragment. Arterial bleeding from thigh.',
    correctTreatment: ['Tourniquet', 'Pressure Bandage'],
    treatmentZone: 'rightLeg',
    degradeRate: 1.2,
    degradeMax: 90,
    startVitals: { hr: 110, rr: 22, spo2: 95, skin: 'Flushed / Diaphoretic', status: 'CRITICAL' },
    educational: 'Crush injuries with arterial bleeding require immediate hemorrhage control. The tourniquet must be applied PROXIMAL to the wound BEFORE any fluid resuscitation. Giving IV fluids before stopping the bleed increases blood pressure and worsens hemorrhage — "you can\'t fill a bathtub with the drain open."',
  },
  {
    id: 'CAS-3',
    name: 'Walking Wounded',
    location: 'Near Intact Building',
    hotspotIdx: 4,
    correctTag: 'GREEN',
    breathingResult: 'Normal, 18/min.',
    pulseResult: 'Strong, 88 BPM.',
    woundsResult: 'Laceration on left forearm, moderate bleeding. Patient ambulatory, oriented.',
    correctTreatment: ['Gauze Pads'],
    treatmentZone: 'leftArm',
    degradeRate: 0,
    degradeMax: 999,
    startVitals: { hr: 88, rr: 18, spo2: 98, skin: 'Normal', status: 'STABLE' },
    educational: 'GREEN-tagged patients can walk and have minor injuries. While they need treatment, they should be triaged LAST. Spending excessive time on GREEN patients while RED patients deteriorate is a common and deadly mistake in mass casualty incidents.',
  },
  {
    id: 'CAS-4',
    name: 'Hypothermic Child',
    location: 'Submerged Playground',
    hotspotIdx: 6,
    correctTag: 'RED',
    breathingResult: 'Shallow, 8/min.',
    pulseResult: 'Weak, thready, 50 BPM.',
    woundsResult: 'No external trauma. Core temp critically low. Violent shivering. Wet clothing.',
    correctTreatment: ['Remove Wet Clothes', 'Mylar Blanket'],
    treatmentZone: 'torso',
    degradeRate: 1.0,
    degradeMax: 75,
    startVitals: { hr: 50, rr: 8, spo2: 88, skin: 'Pale / Cold', status: 'CRITICAL' },
    educational: 'Hypothermia in children is life-threatening. Wet clothing accelerates heat loss through evaporation. The first step is ALWAYS removing wet clothes before applying insulation. "You\'re not dead until you\'re warm and dead" — hypothermic patients can sometimes be resuscitated even after prolonged arrest.',
  },
  {
    id: 'CAS-5',
    name: 'Massive Trauma',
    location: 'Floating Debris',
    hotspotIdx: 3,
    correctTag: 'BLACK',
    breathingResult: 'No chest rise. No breath sounds.',
    pulseResult: 'No carotid pulse detected.',
    woundsResult: 'Massive cranial injury. Brain matter visible. Fixed dilated pupils.',
    correctTreatment: [],
    treatmentZone: null,
    degradeRate: 0,
    degradeMax: 999,
    startVitals: { hr: 0, rr: 0, spo2: 0, skin: 'Grey / Mottled', status: 'DECEASED' },
    educational: 'BLACK-tagged patients have injuries incompatible with life. In a mass casualty incident, spending resources on expectant patients directly reduces survival chances for salvageable patients. This is the hardest but most important triage decision — accepting that you cannot save everyone.',
  },
]

const HOTSPOTS = [
  { id: 0, x: 95, y: 210, label: 'Flooded Street', hasCasualty: false },
  { id: 1, x: 185, y: 100, label: 'Collapsed Building', hasCasualty: true },
  { id: 2, x: 390, y: 250, label: 'Overturned Vehicle', hasCasualty: true },
  { id: 3, x: 500, y: 370, label: 'Floating Debris', hasCasualty: true },
  { id: 4, x: 130, y: 380, label: 'Intact Building', hasCasualty: true },
  { id: 5, x: 310, y: 130, label: 'Under Bridge', hasCasualty: false },
  { id: 6, x: 470, y: 100, label: 'Submerged Playground', hasCasualty: true },
]

const INITIAL_SUPPLIES = {
  'Rescue Breathing Mask': 1,
  'Tourniquet': 2,
  'Pressure Bandage': 3,
  'Gauze Pads': 4,
  'Mylar Blanket': 1,
  'IV Fluid Bag': 1,
}

const TRIAGE_TAGS = ['RED', 'YELLOW', 'GREEN', 'BLACK']

/* ──────────────────────────────────────────────
   GAME STATE REDUCER
   ────────────────────────────────────────────── */
const initialGameState = {
  phase: 'start', // start | explore | triage | report
  timer: TOTAL_TIME,
  searchingHotspot: null,
  searchProgress: 0,
  searchedHotspots: [],
  foundCasualties: [],
  currentCasualty: null,
  // per-casualty state: { [casId]: { tag, treatments: [], checks: [], degradeTime, vitals, dead } }
  casualtyState: {},
  supplies: { ...INITIAL_SUPPLIES },
  selectedItem: null,
  errorMsg: null,
  errorTimer: null,
  shakeScreen: false,
  typewriterDone: false,
  triageStarted: false,
}

function gameStateReducer(state, action) {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...initialGameState,
        phase: 'explore',
        timer: TOTAL_TIME,
        casualtyState: CASUALTIES.reduce((acc, c) => {
          acc[c.id] = {
            tag: null,
            treatments: [],
            checks: [],
            degradeTime: 0,
            vitals: { ...c.startVitals },
            dead: c.id === 'CAS-5',
            treated: false,
          }
          return acc
        }, {}),
      }

    case 'TICK':
      if (state.phase !== 'explore' && state.phase !== 'triage') return state
      const newTimer = Math.max(0, state.timer - 1)
      if (newTimer <= 0) return { ...state, timer: 0, phase: 'report' }
      return { ...state, timer: newTimer }

    case 'BEGIN_SEARCH':
      return { ...state, searchingHotspot: action.payload, searchProgress: 0 }

    case 'SEARCH_PROGRESS':
      return { ...state, searchProgress: Math.min(100, state.searchProgress + action.payload) }

    case 'FINISH_SEARCH': {
      const hsId = action.payload
      const hs = HOTSPOTS[hsId]
      const newSearched = [...state.searchedHotspots, hsId]
      const casualty = CASUALTIES.find(c => c.hotspotIdx === hsId)
      const newFound = casualty ? [...state.foundCasualties, casualty.id] : state.foundCasualties
      return {
        ...state,
        searchingHotspot: null,
        searchProgress: 0,
        searchedHotspots: newSearched,
        foundCasualties: newFound,
      }
    }

    case 'CANCEL_SEARCH':
      return { ...state, searchingHotspot: null, searchProgress: 0 }

    case 'BEGIN_TRIAGE':
      return { ...state, phase: 'triage', triageStarted: true }

    case 'SELECT_CASUALTY':
      return { ...state, currentCasualty: action.payload, selectedItem: null, errorMsg: null }

    case 'BACK_TO_LIST':
      return { ...state, currentCasualty: null, selectedItem: null, errorMsg: null }

    case 'CHECK_VITALS': {
      const { casId, checkType } = action.payload
      const cs = state.casualtyState[casId]
      if (cs.checks.includes(checkType)) return state
      return {
        ...state,
        casualtyState: {
          ...state.casualtyState,
          [casId]: { ...cs, checks: [...cs.checks, checkType] },
        },
      }
    }

    case 'SET_TAG': {
      const { casId, tag } = action.payload
      const cs = state.casualtyState[casId]
      return {
        ...state,
        casualtyState: {
          ...state.casualtyState,
          [casId]: { ...cs, tag },
        },
      }
    }

    case 'SELECT_ITEM':
      return { ...state, selectedItem: action.payload }

    case 'DESELECT_ITEM':
      return { ...state, selectedItem: null }

    case 'APPLY_TREATMENT': {
      const { casId, item } = action.payload
      const cs = state.casualtyState[casId]
      const cas = CASUALTIES.find(c => c.id === casId)

      // Check for BLACK patient waste
      if (cas.correctTag === 'BLACK') {
        return {
          ...state,
          selectedItem: null,
          errorMsg: `RESOURCE MISALLOCATION: This patient has injuries incompatible with life. Every bandage used here is one that CAS-1 or CAS-2 won't have.`,
          shakeScreen: true,
          supplies: { ...state.supplies, [item]: state.supplies[item] - 1 },
          casualtyState: {
            ...state.casualtyState,
            [casId]: { ...cs, treatments: [...cs.treatments, item] },
          },
        }
      }

      // Check for IV before Tourniquet on CAS-2
      if (casId === 'CAS-2' && item === 'IV Fluid Bag' && !cs.treatments.includes('Tourniquet')) {
        return {
          ...state,
          selectedItem: null,
          errorMsg: 'Error: Fluid resuscitation without hemorrhage control increases bleeding. STOP THE BLEED FIRST.',
          shakeScreen: true,
        }
      }

      // Check if treatment is valid for this patient
      const validItems = [...cas.correctTreatment]
      if (casId === 'CAS-2') validItems.push('IV Fluid Bag')
      const isRecovery = item === 'Recovery Position'

      if (!validItems.includes(item) && !isRecovery) {
        const feedbackMap = {
          'Rescue Breathing Mask': `This patient does not need rescue breathing. ${cas.id === 'CAS-3' ? 'They are breathing normally at 18/min.' : 'Assess breathing status first.'}`,
          'Tourniquet': `No arterial hemorrhage present on this patient. Tourniquets are for life-threatening limb bleeding only.`,
          'Pressure Bandage': casId === 'CAS-4' ? 'No external wounds detected. This patient needs warming, not wound care.' : 'This is not the right treatment for this patient\'s condition.',
          'Gauze Pads': casId === 'CAS-1' ? 'No external bleeding. This patient needs airway management.' : 'Gauze is not the priority treatment here.',
          'Mylar Blanket': casId !== 'CAS-4' ? 'This patient is not hypothermic. Save thermal blankets for those who need them.' : '',
          'IV Fluid Bag': 'IV fluids are not indicated for this patient at this time.',
        }
        return {
          ...state,
          selectedItem: null,
          errorMsg: feedbackMap[item] || 'Wrong treatment for this patient.',
          shakeScreen: true,
        }
      }

      // Successful treatment
      const newSupplies = { ...state.supplies }
      if (item !== 'Recovery Position' && item !== 'Remove Wet Clothes') {
        newSupplies[item] = newSupplies[item] - 1
      }

      const newTreatments = [...cs.treatments, item]
      const allTreated = cas.correctTreatment.every(t => newTreatments.includes(t))

      // Improve vitals on correct treatment
      const newVitals = { ...cs.vitals }
      if (casId === 'CAS-1') {
        if (item === 'Rescue Breathing Mask') { newVitals.rr = 14; newVitals.spo2 = Math.min(95, newVitals.spo2 + 10) }
        if (item === 'Recovery Position') { newVitals.spo2 = 96; newVitals.status = 'STABLE'; newVitals.skin = 'Improving' }
      }
      if (casId === 'CAS-2') {
        if (item === 'Tourniquet') { newVitals.hr = 100; newVitals.status = 'GUARDED' }
        if (item === 'Pressure Bandage') { newVitals.hr = 95; newVitals.status = 'STABLE'; newVitals.skin = 'Improving' }
      }
      if (casId === 'CAS-3') {
        if (item === 'Gauze Pads') { newVitals.status = 'STABLE'; newVitals.skin = 'Normal' }
      }
      if (casId === 'CAS-4') {
        if (item === 'Remove Wet Clothes') { newVitals.rr = 10; newVitals.skin = 'Less Cold' }
        if (item === 'Mylar Blanket') { newVitals.hr = 60; newVitals.rr = 14; newVitals.spo2 = 94; newVitals.status = 'STABLE'; newVitals.skin = 'Warming' }
      }

      return {
        ...state,
        selectedItem: null,
        errorMsg: null,
        supplies: newSupplies,
        casualtyState: {
          ...state.casualtyState,
          [casId]: { ...cs, treatments: newTreatments, vitals: newVitals, treated: allTreated },
        },
      }
    }

    case 'DEGRADE_CASUALTY': {
      const { casId } = action.payload
      const cs = state.casualtyState[casId]
      const cas = CASUALTIES.find(c => c.id === casId)
      if (cs.dead || cs.treated || cas.degradeRate === 0) return state

      const newDegradeTime = cs.degradeTime + 1
      const newVitals = { ...cs.vitals }
      let dead = false

      if (casId === 'CAS-1') {
        newVitals.spo2 = Math.max(0, cs.vitals.spo2 - 0.4)
        newVitals.hr = Math.max(0, cs.vitals.hr - 0.15)
        newVitals.skin = newVitals.spo2 < 70 ? 'Deeply Cyanotic' : newVitals.spo2 < 80 ? 'Cyanotic' : 'Pale / Cyanotic'
        if (newDegradeTime >= cas.degradeMax) { dead = true; newVitals.hr = 0; newVitals.rr = 0; newVitals.spo2 = 0; newVitals.status = 'DECEASED'; newVitals.skin = 'Grey' }
        else if (newVitals.spo2 < 70) newVitals.status = 'CRITICAL'
      }
      if (casId === 'CAS-2') {
        newVitals.hr = Math.min(160, cs.vitals.hr + 0.3)
        newVitals.spo2 = Math.max(0, cs.vitals.spo2 - 0.15)
        if (newDegradeTime > 60) { newVitals.hr = Math.max(0, cs.vitals.hr - 0.5) }
        if (newDegradeTime >= cas.degradeMax) { dead = true; newVitals.hr = 0; newVitals.rr = 0; newVitals.spo2 = 0; newVitals.status = 'DECEASED'; newVitals.skin = 'Grey / Mottled' }
        else newVitals.status = newVitals.hr > 130 ? 'CRITICAL' : 'GUARDED'
      }
      if (casId === 'CAS-4') {
        newVitals.hr = Math.max(0, cs.vitals.hr - 0.2)
        newVitals.rr = Math.max(0, cs.vitals.rr - 0.05)
        newVitals.spo2 = Math.max(0, cs.vitals.spo2 - 0.2)
        if (newDegradeTime >= cas.degradeMax) { dead = true; newVitals.hr = 0; newVitals.rr = 0; newVitals.spo2 = 0; newVitals.status = 'DECEASED'; newVitals.skin = 'Grey / Cold' }
        else newVitals.status = newVitals.hr < 35 ? 'CRITICAL' : 'GUARDED'
      }

      return {
        ...state,
        casualtyState: {
          ...state.casualtyState,
          [casId]: { ...cs, degradeTime: newDegradeTime, vitals: newVitals, dead },
        },
      }
    }

    case 'CLEAR_ERROR':
      return { ...state, errorMsg: null, shakeScreen: false }

    case 'FINISH_GAME':
      return { ...state, phase: 'report' }

    case 'SET_TYPEWRITER_DONE':
      return { ...state, typewriterDone: true }

    default:
      return state
  }
}

/* ──────────────────────────────────────────────
   WEB AUDIO HELPERS
   ────────────────────────────────────────────── */
function getAudioCtx() {
  if (!getAudioCtx._ctx) {
    try { getAudioCtx._ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
  }
  return getAudioCtx._ctx
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  const ctx = getAudioCtx()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.value = volume
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.stop(ctx.currentTime + duration)
  } catch {}
}

function playHeartbeat() { playTone(440, 0.1, 'sine', 0.12) }
function playFlatline() { playTone(440, 2.0, 'sine', 0.1) }
function playSuccess() {
  playTone(523, 0.12, 'sine', 0.1)
  setTimeout(() => playTone(659, 0.12, 'sine', 0.1), 130)
  setTimeout(() => playTone(784, 0.18, 'sine', 0.1), 260)
}
function playError() { playTone(150, 0.25, 'square', 0.1) }

/* ──────────────────────────────────────────────
   CSS KEYFRAMES (injected once)
   ────────────────────────────────────────────── */
const STYLE_ID = 'iron-tide-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes it-rain {
      0% { transform: translateY(-100vh); opacity: 0.7; }
      100% { transform: translateY(100vh); opacity: 0; }
    }
    @keyframes it-pulse-red {
      0%, 100% { box-shadow: inset 0 0 80px rgba(220,38,38,0.15); }
      50% { box-shadow: inset 0 0 120px rgba(220,38,38,0.4); }
    }
    @keyframes it-pulse-red-fast {
      0%, 100% { box-shadow: inset 0 0 100px rgba(220,38,38,0.25); }
      50% { box-shadow: inset 0 0 160px rgba(220,38,38,0.6); }
    }
    @keyframes it-pulse-glow {
      0%, 100% { box-shadow: 0 0 8px rgba(220,38,38,0.4), 0 0 16px rgba(220,38,38,0.2); transform: scale(1); }
      50% { box-shadow: 0 0 16px rgba(220,38,38,0.7), 0 0 32px rgba(220,38,38,0.4); transform: scale(1.15); }
    }
    @keyframes it-pulse-glow-green {
      0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.4); }
      50% { box-shadow: 0 0 20px rgba(34,197,94,0.8); }
    }
    @keyframes it-heartbeat {
      0%, 100% { transform: scale(1); }
      15% { transform: scale(1.2); }
      30% { transform: scale(1); }
      45% { transform: scale(1.15); }
      60% { transform: scale(1); }
    }
    @keyframes it-shake {
      0%, 100% { transform: translate(0, 0); }
      10% { transform: translate(-4px, 2px); }
      20% { transform: translate(4px, -2px); }
      30% { transform: translate(-3px, -1px); }
      40% { transform: translate(3px, 1px); }
      50% { transform: translate(-2px, 2px); }
      60% { transform: translate(2px, -1px); }
      70% { transform: translate(-1px, 1px); }
      80% { transform: translate(1px, -1px); }
      90% { transform: translate(-1px, 0); }
    }
    @keyframes it-blood-pool {
      0% { width: 10px; height: 6px; opacity: 0.6; }
      100% { width: 60px; height: 30px; opacity: 0.9; }
    }
    @keyframes it-shiver {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px) translateY(1px); }
      50% { transform: translateX(2px) translateY(-1px); }
      75% { transform: translateX(-1px) translateY(1px); }
    }
    @keyframes it-deploy-pulse {
      0%, 100% { box-shadow: 0 0 10px rgba(220,38,38,0.3), 0 0 20px rgba(220,38,38,0.1); }
      50% { box-shadow: 0 0 20px rgba(220,38,38,0.6), 0 0 40px rgba(220,38,38,0.3), 0 0 60px rgba(220,38,38,0.1); }
    }
    @keyframes it-searchbar {
      0% { width: 0%; }
      100% { width: 100%; }
    }
    @keyframes it-typewriter-cursor {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes it-vignette-breathe {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 0.9; }
    }
    @keyframes it-scan-line {
      0% { top: -2px; }
      100% { top: 100%; }
    }
    @keyframes it-fade-in {
      0% { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes it-green-flash {
      0% { background: rgba(34,197,94,0.4); }
      100% { background: rgba(34,197,94,0); }
    }
  `
  document.head.appendChild(style)
}

/* ──────────────────────────────────────────────
   HELPER COMPONENTS
   ────────────────────────────────────────────── */

function RainEffect() {
  const drops = Array.from({ length: 60 }, (_, i) => ({
    left: `${(i / 60) * 100 + Math.random() * 2}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${0.6 + Math.random() * 0.6}s`,
    opacity: 0.15 + Math.random() * 0.25,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {drops.map((d, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: d.left,
          top: 0,
          width: '1px',
          height: '18px',
          background: `rgba(150,180,220,${d.opacity})`,
          animation: `it-rain ${d.duration} ${d.delay} linear infinite`,
        }} />
      ))}
    </div>
  )
}

function Vignette({ intensity = 'normal' }) {
  const anim = intensity === 'fast' ? 'it-pulse-red-fast 1s ease-in-out infinite'
    : intensity === 'normal' ? 'it-pulse-red 2.5s ease-in-out infinite'
    : 'none'
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
      background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)',
      animation: anim,
    }} />
  )
}

function ScanLine() {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2, opacity: 0.03,
    }}>
      <div style={{
        position: 'absolute', left: 0, width: '100%', height: '2px',
        background: 'rgba(255,255,255,0.5)',
        animation: 'it-scan-line 4s linear infinite',
      }} />
    </div>
  )
}

function Typewriter({ text, speed = 35, onDone }) {
  const [displayed, setDisplayed] = useState('')
  const idx = useRef(0)
  const doneRef = useRef(false)

  useEffect(() => {
    idx.current = 0
    doneRef.current = false
    setDisplayed('')
    const iv = setInterval(() => {
      idx.current++
      if (idx.current >= text.length) {
        setDisplayed(text)
        clearInterval(iv)
        if (!doneRef.current) { doneRef.current = true; onDone && onDone() }
        return
      }
      setDisplayed(text.slice(0, idx.current))
    }, speed)
    return () => clearInterval(iv)
  }, [text, speed])

  return (
    <span>
      {displayed}
      <span style={{ animation: 'it-typewriter-cursor 0.7s step-end infinite', fontWeight: 'bold' }}>|</span>
    </span>
  )
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function tagColor(tag) {
  if (tag === 'RED') return COLORS.red
  if (tag === 'YELLOW') return COLORS.amber
  if (tag === 'GREEN') return COLORS.green
  if (tag === 'BLACK') return '#333'
  return COLORS.muted
}

/* ──────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────── */
export default function IronTide() {
  const { dispatch: ctxDispatch } = useGame()
  const [gs, dispatch] = useReducer(gameStateReducer, initialGameState)
  const timerRef = useRef(null)
  const degradeRef = useRef(null)
  const searchRef = useRef(null)
  const heartbeatRef = useRef(null)

  // Inject CSS once
  useEffect(() => { injectStyles() }, [])

  // Global timer
  useEffect(() => {
    if (gs.phase === 'explore' || gs.phase === 'triage') {
      timerRef.current = setInterval(() => dispatch({ type: 'TICK' }), 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [gs.phase])

  // Patient degradation
  useEffect(() => {
    if (gs.phase === 'explore' || gs.phase === 'triage') {
      degradeRef.current = setInterval(() => {
        gs.foundCasualties.forEach(casId => {
          dispatch({ type: 'DEGRADE_CASUALTY', payload: { casId } })
        })
      }, DEGRADE_INTERVAL)
      return () => clearInterval(degradeRef.current)
    }
  }, [gs.phase, gs.foundCasualties])

  // Heartbeat sound for critical patients being viewed
  useEffect(() => {
    if (gs.phase === 'triage' && gs.currentCasualty) {
      const cs = gs.casualtyState[gs.currentCasualty]
      const cas = CASUALTIES.find(c => c.id === gs.currentCasualty)
      if (cs && !cs.dead && (cas.correctTag === 'RED' || cs.vitals.status === 'CRITICAL')) {
        heartbeatRef.current = setInterval(() => playHeartbeat(), 1200)
        return () => clearInterval(heartbeatRef.current)
      }
    }
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
  }, [gs.phase, gs.currentCasualty, gs.casualtyState])

  // Clear error after 4 seconds
  useEffect(() => {
    if (gs.errorMsg) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 4000)
      return () => clearTimeout(t)
    }
  }, [gs.errorMsg])

  // Shake screen clear
  useEffect(() => {
    if (gs.shakeScreen) {
      playError()
      const t = setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 600)
      return () => clearTimeout(t)
    }
  }, [gs.shakeScreen])

  // Auto-finish if timer hits 0
  useEffect(() => {
    if (gs.timer <= 0 && gs.phase !== 'report' && gs.phase !== 'start') {
      dispatch({ type: 'FINISH_GAME' })
    }
  }, [gs.timer, gs.phase])

  // Search hotspot mechanic
  const startSearch = useCallback((hsId) => {
    if (gs.searchingHotspot !== null) return
    if (gs.searchedHotspots.includes(hsId)) return
    dispatch({ type: 'BEGIN_SEARCH', payload: hsId })
    const step = 50
    const increment = (100 / (SEARCH_DURATION / step))
    let progress = 0
    searchRef.current = setInterval(() => {
      progress += increment
      dispatch({ type: 'SEARCH_PROGRESS', payload: increment })
      if (progress >= 100) {
        clearInterval(searchRef.current)
        dispatch({ type: 'FINISH_SEARCH', payload: hsId })
        const hs = HOTSPOTS[hsId]
        if (hs.hasCasualty) playSuccess()
        else playError()
      }
    }, step)
  }, [gs.searchingHotspot, gs.searchedHotspots])

  const handleApplyItem = useCallback((casId, zone) => {
    if (!gs.selectedItem) return
    const item = gs.selectedItem
    const cas = CASUALTIES.find(c => c.id === casId)

    // Recovery position is a button, not zone-based
    if (item === 'Recovery Position' || item === 'Remove Wet Clothes') {
      dispatch({ type: 'APPLY_TREATMENT', payload: { casId, item } })
      playSuccess()
      return
    }

    // Check zone correctness
    if (cas.treatmentZone && zone !== cas.treatmentZone) {
      dispatch({ type: 'CLEAR_ERROR' })
      dispatch({
        type: 'APPLY_TREATMENT',
        payload: { casId, item: '__wrong_zone__' },
      })
      // Actually just show error, don't consume
      playError()
      return
    }

    dispatch({ type: 'APPLY_TREATMENT', payload: { casId, item } })
    playSuccess()
  }, [gs.selectedItem])

  // Score calculation
  const computeScore = useCallback(() => {
    let triageCorrect = 0
    let treatmentCorrect = 0
    let survived = 0
    let wastedOnBlack = false

    const details = CASUALTIES.map(cas => {
      const cs = gs.casualtyState[cas.id]
      const tagCorrect = cs?.tag === cas.correctTag
      if (tagCorrect) triageCorrect++

      const treatCorrect = cas.correctTreatment.length === 0
        ? cs?.treatments.length === 0
        : cas.correctTreatment.every(t => cs?.treatments.includes(t))
      if (treatCorrect) treatmentCorrect++

      const alive = !cs?.dead
      if (alive && cas.correctTag !== 'BLACK') survived++
      if (cas.correctTag === 'BLACK' && alive) survived++ // BLACK is always "survived" in sense they were already dead

      if (cas.id === 'CAS-5' && cs?.treatments.length > 0) wastedOnBlack = true

      return {
        cas,
        tag: cs?.tag || 'NONE',
        tagCorrect,
        treatments: cs?.treatments || [],
        treatCorrect,
        alive,
      }
    })

    // Score: triage 30%, treatment 40%, survival 20%, time/resource 10%
    const triageScore = (triageCorrect / 5) * 30
    const treatmentScore = (treatmentCorrect / 5) * 40
    const survivalScore = (survived / 5) * 20
    const bonusScore = (wastedOnBlack ? 0 : 5) + (gs.timer > 0 ? 5 : 0)
    const total = Math.round(triageScore + treatmentScore + survivalScore + bonusScore)

    return {
      triageCorrect,
      treatmentCorrect,
      survived,
      wastedOnBlack,
      timeRemaining: gs.timer,
      total,
      passed: total >= 60,
      details,
    }
  }, [gs.casualtyState, gs.timer])

  // Record score on report phase
  const scoreRecorded = useRef(false)
  useEffect(() => {
    if (gs.phase === 'report' && !scoreRecorded.current) {
      scoreRecorded.current = true
      const result = computeScore()
      ctxDispatch({
        type: 'RECORD_SCORE',
        payload: { key: 'iron-tide', result: { score: result.total, passed: result.passed } },
      })
    }
  }, [gs.phase])

  /* ──────────────────────────────────────────
     RENDER: START SCREEN
     ────────────────────────────────────────── */
  if (gs.phase === 'start') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: COLORS.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Courier New", Courier, monospace', color: COLORS.text, overflow: 'hidden',
      }}>
        <RainEffect />
        <Vignette intensity="normal" />
        <ScanLine />

        <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', maxWidth: 700, padding: '0 24px' }}>
          {/* Title */}
          <h1 style={{
            fontSize: '3rem', fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase',
            color: COLORS.red, textShadow: `0 0 30px rgba(220,38,38,0.5), 0 0 60px rgba(220,38,38,0.2)`,
            margin: '0 0 12px 0', lineHeight: 1.1,
            fontFamily: '"Courier New", Courier, monospace',
          }}>
            OPERATION:<br />IRON TIDE
          </h1>

          <div style={{
            width: 120, height: 2, background: `linear-gradient(90deg, transparent, ${COLORS.red}, transparent)`,
            margin: '0 auto 24px',
          }} />

          {/* Dispatch text */}
          <div style={{
            background: 'rgba(0,0,0,0.6)', border: `1px solid ${COLORS.red}33`,
            padding: '20px 24px', borderRadius: 4, marginBottom: 28,
            fontSize: '0.95rem', lineHeight: 1.7, textAlign: 'left', color: COLORS.amber,
            minHeight: 90,
          }}>
            <span style={{ color: COLORS.red, fontWeight: 'bold' }}>FLASH // PRIORITY // </span>
            <Typewriter
              text='FLASH FLOOD — SECTOR 7. MULTIPLE CASUALTIES REPORTED. YOU ARE THE ONLY FIRST RESPONDER. BEGIN TRIAGE IMMEDIATELY.'
              speed={30}
              onDone={() => dispatch({ type: 'SET_TYPEWRITER_DONE' })}
            />
          </div>

          {/* Status readouts */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 36,
            fontSize: '0.8rem', color: COLORS.muted, letterSpacing: '0.1em',
          }}>
            <span>CASUALTIES: <span style={{ color: COLORS.red }}>UNKNOWN</span></span>
            <span>TIME: <span style={{ color: COLORS.amber }}>06:00</span></span>
            <span>SUPPLIES: <span style={{ color: COLORS.amber }}>LIMITED</span></span>
          </div>

          {/* Deploy button */}
          <button
            onClick={() => dispatch({ type: 'START_GAME' })}
            style={{
              background: 'transparent', border: `2px solid ${COLORS.red}`,
              color: COLORS.red, fontSize: '1.3rem', fontWeight: 900,
              letterSpacing: '0.3em', padding: '14px 56px',
              cursor: 'pointer', fontFamily: '"Courier New", Courier, monospace',
              textTransform: 'uppercase',
              animation: 'it-deploy-pulse 2s ease-in-out infinite',
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onMouseEnter={e => { e.target.style.background = COLORS.red; e.target.style.color = '#fff' }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = COLORS.red }}
          >
            DEPLOY
          </button>
        </div>
      </div>
    )
  }

  /* ──────────────────────────────────────────
     RENDER: EXPLORATION PHASE
     ────────────────────────────────────────── */
  if (gs.phase === 'explore') {
    const vignetteIntensity = gs.timer < 60 ? 'fast' : gs.timer < 120 ? 'normal' : 'none'
    const urgencyFilter = gs.timer < 60 ? 'contrast(1.2) brightness(0.95)' : 'none'

    return (
      <div style={{
        position: 'fixed', inset: 0, background: COLORS.bg,
        fontFamily: '"Courier New", Courier, monospace', color: COLORS.text,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        filter: urgencyFilter,
        animation: gs.shakeScreen ? 'it-shake 0.4s ease-in-out' : 'none',
      }}>
        <Vignette intensity={vignetteIntensity} />

        {/* HUD */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px', background: 'rgba(0,0,0,0.8)',
          borderBottom: `1px solid ${COLORS.red}33`, zIndex: 10,
        }}>
          <div style={{ display: 'flex', gap: 28, fontSize: '0.8rem', letterSpacing: '0.08em' }}>
            <span>CASUALTIES FOUND: <span style={{ color: COLORS.green }}>{gs.foundCasualties.length}/5</span></span>
            <span>SEARCHED: <span style={{ color: COLORS.blue }}>{gs.searchedHotspots.length}/7</span></span>
          </div>
          <div style={{
            fontSize: '1.5rem', fontWeight: 'bold',
            color: gs.timer < 60 ? COLORS.red : gs.timer < 120 ? COLORS.amber : COLORS.green,
            animation: gs.timer < 60 ? 'it-heartbeat 1s ease-in-out infinite' : 'none',
          }}>
            {formatTime(gs.timer)}
          </div>
        </div>

        {/* Main content area */}
        <div style={{
          flex: 1, display: 'flex', padding: 16, gap: 16, position: 'relative', zIndex: 5,
        }}>
          {/* Map */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 600, height: 500, position: 'relative',
              background: '#0d0d1a', border: `1px solid ${COLORS.muted}33`,
              borderRadius: 4, overflow: 'hidden',
            }}>
              {/* Grid lines */}
              {Array.from({ length: 12 }, (_, i) => (
                <div key={`gx${i}`} style={{
                  position: 'absolute', left: `${(i + 1) * (100 / 12)}%`, top: 0,
                  width: 1, height: '100%', background: 'rgba(100,116,139,0.08)',
                }} />
              ))}
              {Array.from({ length: 10 }, (_, i) => (
                <div key={`gy${i}`} style={{
                  position: 'absolute', top: `${(i + 1) * (100 / 10)}%`, left: 0,
                  height: 1, width: '100%', background: 'rgba(100,116,139,0.08)',
                }} />
              ))}

              {/* Flooded street */}
              <div style={{
                position: 'absolute', left: 30, top: 180, width: 200, height: 80,
                background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 2,
              }}>
                <div style={{ position: 'absolute', bottom: 2, left: 4, fontSize: '0.55rem', color: COLORS.blue, opacity: 0.6 }}>
                  FLOODED STREET
                </div>
              </div>

              {/* Collapsed building */}
              <div style={{
                position: 'absolute', left: 140, top: 60, width: 100, height: 80,
                background: 'rgba(120,90,60,0.25)', border: '1px solid rgba(120,90,60,0.4)',
                borderRadius: 2,
              }}>
                {/* Rubble blocks */}
                <div style={{ position: 'absolute', left: 10, top: 15, width: 25, height: 18, background: 'rgba(100,80,60,0.5)', transform: 'rotate(12deg)' }} />
                <div style={{ position: 'absolute', left: 45, top: 25, width: 30, height: 15, background: 'rgba(90,70,50,0.5)', transform: 'rotate(-8deg)' }} />
                <div style={{ position: 'absolute', left: 20, top: 45, width: 20, height: 20, background: 'rgba(80,65,45,0.5)', transform: 'rotate(5deg)' }} />
                <div style={{ position: 'absolute', bottom: 2, left: 4, fontSize: '0.55rem', color: '#a08060', opacity: 0.6 }}>
                  COLLAPSED BLDG
                </div>
              </div>

              {/* Overturned vehicle */}
              <div style={{
                position: 'absolute', left: 350, top: 220, width: 90, height: 50,
                background: 'rgba(100,100,120,0.3)', border: '1px solid rgba(100,100,120,0.5)',
                borderRadius: 3, transform: 'rotate(25deg)',
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-25deg)',
                  fontSize: '0.5rem', color: COLORS.muted, opacity: 0.6, whiteSpace: 'nowrap',
                }}>
                  VEHICLE
                </div>
              </div>

              {/* Floating debris */}
              <div style={{
                position: 'absolute', left: 460, top: 340, width: 80, height: 60,
                background: 'rgba(59,130,246,0.1)', border: '1px dashed rgba(100,80,60,0.4)',
                borderRadius: 8,
              }}>
                {[12, 35, 55].map((l, i) => (
                  <div key={i} style={{
                    position: 'absolute', left: l, top: 10 + i * 12, width: 12 + i * 4, height: 6,
                    background: 'rgba(100,80,50,0.4)', borderRadius: 2, transform: `rotate(${i * 15 - 10}deg)`,
                  }} />
                ))}
                <div style={{ position: 'absolute', bottom: 2, left: 4, fontSize: '0.5rem', color: COLORS.muted, opacity: 0.5 }}>
                  DEBRIS
                </div>
              </div>

              {/* Intact building */}
              <div style={{
                position: 'absolute', left: 80, top: 340, width: 110, height: 90,
                background: 'rgba(60,60,80,0.3)', border: '1px solid rgba(60,60,80,0.5)',
                borderRadius: 2,
              }}>
                {/* Door */}
                <div style={{
                  position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 18, height: 28, background: 'rgba(40,40,55,0.7)', border: '1px solid rgba(100,100,130,0.3)',
                }} />
                <div style={{ position: 'absolute', top: 4, left: 6, fontSize: '0.5rem', color: COLORS.muted, opacity: 0.5 }}>
                  INTACT BLDG
                </div>
              </div>

              {/* Bridge */}
              <div style={{
                position: 'absolute', left: 270, top: 100, width: 100, height: 60,
                background: 'rgba(80,80,90,0.25)', border: '1px solid rgba(80,80,90,0.4)',
                borderRadius: '4px 4px 0 0',
              }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 8,
                  background: 'rgba(80,80,90,0.5)',
                }} />
                <div style={{ position: 'absolute', bottom: 12, left: 8, fontSize: '0.5rem', color: COLORS.muted, opacity: 0.5 }}>
                  UNDER BRIDGE
                </div>
              </div>

              {/* Playground */}
              <div style={{
                position: 'absolute', left: 420, top: 60, width: 110, height: 80,
                background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: 2,
              }}>
                {/* Swing frame */}
                <div style={{ position: 'absolute', left: 20, top: 15, width: 2, height: 30, background: 'rgba(150,150,170,0.3)' }} />
                <div style={{ position: 'absolute', left: 50, top: 15, width: 2, height: 30, background: 'rgba(150,150,170,0.3)' }} />
                <div style={{ position: 'absolute', left: 18, top: 15, width: 36, height: 2, background: 'rgba(150,150,170,0.3)' }} />
                <div style={{ position: 'absolute', bottom: 2, left: 4, fontSize: '0.5rem', color: COLORS.blue, opacity: 0.5 }}>
                  PLAYGROUND
                </div>
              </div>

              {/* Hotspots */}
              {HOTSPOTS.map(hs => {
                const searched = gs.searchedHotspots.includes(hs.id)
                const isSearching = gs.searchingHotspot === hs.id
                const found = searched && hs.hasCasualty
                const empty = searched && !hs.hasCasualty

                return (
                  <div key={hs.id} style={{ position: 'absolute', left: hs.x - 16, top: hs.y - 16 }}>
                    <button
                      onClick={() => !searched && !isSearching && startSearch(hs.id)}
                      disabled={searched || (gs.searchingHotspot !== null && !isSearching)}
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: found ? `2px solid ${COLORS.green}` : empty ? `2px solid ${COLORS.muted}` : `2px solid ${COLORS.red}`,
                        background: found ? 'rgba(34,197,94,0.15)' : empty ? 'rgba(100,116,139,0.1)' : 'rgba(220,38,38,0.1)',
                        cursor: searched ? 'default' : 'pointer',
                        animation: searched ? 'none' : 'it-pulse-glow 2s ease-in-out infinite',
                        position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', color: found ? COLORS.green : empty ? COLORS.muted : COLORS.red,
                        fontFamily: '"Courier New", Courier, monospace',
                        fontWeight: 'bold',
                        transition: 'all 0.3s',
                      }}
                    >
                      {found ? '!' : empty ? 'x' : '?'}
                    </button>
                    {/* Search progress bar */}
                    {isSearching && (
                      <div style={{
                        position: 'absolute', top: 36, left: -10, width: 52, height: 4,
                        background: 'rgba(0,0,0,0.6)', borderRadius: 2, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', background: COLORS.amber,
                          width: `${gs.searchProgress}%`,
                          transition: 'width 0.05s linear',
                          borderRadius: 2,
                        }} />
                      </div>
                    )}
                    {/* Label */}
                    {isSearching && (
                      <div style={{
                        position: 'absolute', top: 44, left: -30, width: 92,
                        fontSize: '0.55rem', color: COLORS.amber, textAlign: 'center',
                        letterSpacing: '0.05em',
                      }}>
                        SEARCHING...
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Map title */}
              <div style={{
                position: 'absolute', top: 6, left: 8,
                fontSize: '0.65rem', color: COLORS.muted, letterSpacing: '0.1em', opacity: 0.5,
              }}>
                SECTOR 7 — DISASTER ZONE
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{
            width: 240, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {/* Found casualties list */}
            <div style={{
              background: COLORS.panel, border: `1px solid ${COLORS.muted}22`,
              borderRadius: 4, padding: 12, flex: 1,
            }}>
              <div style={{
                fontSize: '0.7rem', color: COLORS.amber, letterSpacing: '0.1em',
                marginBottom: 10, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 6,
              }}>
                FOUND CASUALTIES
              </div>
              {gs.foundCasualties.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontStyle: 'italic' }}>
                  Search hotspots to find casualties...
                </div>
              )}
              {gs.foundCasualties.map(casId => {
                const cas = CASUALTIES.find(c => c.id === casId)
                const cs = gs.casualtyState[casId]
                return (
                  <div key={casId} style={{
                    padding: '6px 8px', margin: '4px 0', borderRadius: 3,
                    background: cs?.dead ? 'rgba(100,100,100,0.15)' : 'rgba(220,38,38,0.08)',
                    border: `1px solid ${cs?.dead ? COLORS.muted + '33' : COLORS.red + '33'}`,
                    fontSize: '0.72rem',
                  }}>
                    <div style={{ color: cs?.dead ? COLORS.muted : COLORS.text, fontWeight: 'bold' }}>
                      {cas.id}: {cas.name}
                    </div>
                    <div style={{ color: COLORS.muted, fontSize: '0.6rem', marginTop: 2 }}>
                      {cas.location} {cs?.dead && ' — DECEASED'}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Supplies overview */}
            <div style={{
              background: COLORS.panel, border: `1px solid ${COLORS.muted}22`,
              borderRadius: 4, padding: 12,
            }}>
              <div style={{
                fontSize: '0.7rem', color: COLORS.amber, letterSpacing: '0.1em',
                marginBottom: 8, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 6,
              }}>
                SUPPLIES
              </div>
              {Object.entries(gs.supplies).map(([name, qty]) => (
                <div key={name} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '0.65rem', color: qty > 0 ? COLORS.text : COLORS.muted,
                  padding: '2px 0', textDecoration: qty <= 0 ? 'line-through' : 'none',
                }}>
                  <span>{name}</span>
                  <span style={{ color: qty > 0 ? COLORS.green : COLORS.red }}>{qty}</span>
                </div>
              ))}
            </div>

            {/* Begin Triage button */}
            {gs.foundCasualties.length > 0 && (
              <button
                onClick={() => dispatch({ type: 'BEGIN_TRIAGE' })}
                style={{
                  background: COLORS.red, color: '#fff', border: 'none',
                  padding: '12px 0', borderRadius: 4, fontSize: '0.85rem',
                  fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.15em',
                  fontFamily: '"Courier New", Courier, monospace',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.target.style.background = '#ef4444'}
                onMouseLeave={e => e.target.style.background = COLORS.red}
              >
                BEGIN TRIAGE ({gs.foundCasualties.length} found)
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ──────────────────────────────────────────
     RENDER: TRIAGE PHASE
     ────────────────────────────────────────── */
  if (gs.phase === 'triage') {
    const vignetteIntensity = gs.timer < 60 ? 'fast' : gs.timer < 120 ? 'normal' : 'none'
    const urgencyFilter = gs.timer < 60 ? 'contrast(1.2) brightness(0.95)' : 'none'

    // Casualty list view
    if (!gs.currentCasualty) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: COLORS.bg,
          fontFamily: '"Courier New", Courier, monospace', color: COLORS.text,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          filter: urgencyFilter,
        }}>
          <Vignette intensity={vignetteIntensity} />

          {/* HUD */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 20px', background: 'rgba(0,0,0,0.8)',
            borderBottom: `1px solid ${COLORS.red}33`, zIndex: 10,
          }}>
            <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em' }}>
              TRIAGE MODE — <span style={{ color: COLORS.amber }}>SELECT CASUALTY</span>
            </div>
            <div style={{
              fontSize: '1.5rem', fontWeight: 'bold',
              color: gs.timer < 60 ? COLORS.red : gs.timer < 120 ? COLORS.amber : COLORS.green,
              animation: gs.timer < 60 ? 'it-heartbeat 1s ease-in-out infinite' : 'none',
            }}>
              {formatTime(gs.timer)}
            </div>
          </div>

          <div style={{
            flex: 1, display: 'flex', padding: 20, gap: 16, position: 'relative', zIndex: 5,
          }}>
            {/* Casualty cards */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
              {gs.foundCasualties.map(casId => {
                const cas = CASUALTIES.find(c => c.id === casId)
                const cs = gs.casualtyState[casId]
                return (
                  <button
                    key={casId}
                    onClick={() => dispatch({ type: 'SELECT_CASUALTY', payload: casId })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      background: cs.dead ? 'rgba(50,50,50,0.3)' : COLORS.panel,
                      border: `1px solid ${cs.dead ? COLORS.muted + '33' : cs.tag ? tagColor(cs.tag) + '66' : COLORS.red + '33'}`,
                      borderRadius: 4, padding: '14px 18px',
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: '"Courier New", Courier, monospace',
                      color: COLORS.text, transition: 'all 0.2s',
                      animation: !cs.dead && !cs.treated && cas.degradeRate > 0 ? 'it-pulse-glow 3s ease-in-out infinite' : 'none',
                      opacity: cs.dead ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (!cs.dead) e.currentTarget.style.borderColor = COLORS.amber }}
                    onMouseLeave={e => e.currentTarget.style.borderColor = cs.dead ? COLORS.muted + '33' : cs.tag ? tagColor(cs.tag) + '66' : COLORS.red + '33'}
                  >
                    {/* Tag indicator */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 4, flexShrink: 0,
                      background: cs.tag ? tagColor(cs.tag) : 'rgba(100,116,139,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 'bold', color: '#fff',
                    }}>
                      {cs.tag || '???'}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {cas.id}: {cas.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.muted, marginTop: 2 }}>
                        {cas.location}
                      </div>
                    </div>

                    {/* Quick vitals */}
                    <div style={{ textAlign: 'right', fontSize: '0.7rem' }}>
                      <div style={{ color: cs.dead ? COLORS.muted : cs.vitals.hr < 50 ? COLORS.red : COLORS.green }}>
                        HR: {cs.dead ? '---' : Math.round(cs.vitals.hr)}
                      </div>
                      <div style={{
                        color: cs.dead ? COLORS.muted : cs.vitals.status === 'CRITICAL' ? COLORS.red : cs.vitals.status === 'STABLE' ? COLORS.green : COLORS.amber,
                        fontWeight: 'bold', marginTop: 2,
                      }}>
                        {cs.vitals.status}
                      </div>
                    </div>

                    {/* Treatment status */}
                    <div style={{
                      fontSize: '0.6rem', color: cs.treated ? COLORS.green : COLORS.amber,
                      width: 60, textAlign: 'center',
                    }}>
                      {cs.treated ? 'TREATED' : cs.treatments.length > 0 ? 'PARTIAL' : 'UNTREATED'}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Right panel: supplies + finish */}
            <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: COLORS.panel, border: `1px solid ${COLORS.muted}22`,
                borderRadius: 4, padding: 12,
              }}>
                <div style={{
                  fontSize: '0.7rem', color: COLORS.amber, letterSpacing: '0.1em',
                  marginBottom: 8, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 6,
                }}>
                  MED KIT
                </div>
                {Object.entries(gs.supplies).map(([name, qty]) => (
                  <div key={name} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.65rem', color: qty > 0 ? COLORS.text : COLORS.muted,
                    padding: '2px 0', textDecoration: qty <= 0 ? 'line-through' : 'none',
                  }}>
                    <span>{name}</span>
                    <span style={{ color: qty > 0 ? COLORS.green : COLORS.red }}>{qty}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => dispatch({ type: 'FINISH_GAME' })}
                style={{
                  background: COLORS.amber, color: '#000', border: 'none',
                  padding: '12px 0', borderRadius: 4, fontSize: '0.8rem',
                  fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.12em',
                  fontFamily: '"Courier New", Courier, monospace',
                }}
              >
                FINISH TRIAGE
              </button>

              {/* Instructions */}
              <div style={{
                background: 'rgba(0,0,0,0.4)', borderRadius: 4, padding: 10,
                fontSize: '0.6rem', color: COLORS.muted, lineHeight: 1.6,
              }}>
                <div style={{ color: COLORS.amber, marginBottom: 4 }}>PROCEDURE:</div>
                1. Select a casualty<br />
                2. Check vitals (breathing, pulse, wounds)<br />
                3. Assign triage tag<br />
                4. Apply correct treatments<br />
                5. Move to next patient
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Individual casualty examination view
    const cas = CASUALTIES.find(c => c.id === gs.currentCasualty)
    const cs = gs.casualtyState[gs.currentCasualty]

    // Body zone click handler
    const handleZoneClick = (zone) => {
      if (gs.selectedItem) {
        handleApplyItem(gs.currentCasualty, zone)
      }
    }

    // Determine body outline highlight colors per casualty
    const bodyHighlights = {
      'CAS-1': { chest: 'rgba(59,130,246,0.4)' },
      'CAS-2': { rightLeg: 'rgba(220,38,38,0.4)' },
      'CAS-3': { leftArm: 'rgba(245,158,11,0.4)' },
      'CAS-4': { torso: 'rgba(59,130,246,0.3)', head: 'rgba(59,130,246,0.2)', leftArm: 'rgba(59,130,246,0.2)', rightArm: 'rgba(59,130,246,0.2)', leftLeg: 'rgba(59,130,246,0.2)', rightLeg: 'rgba(59,130,246,0.2)' },
      'CAS-5': { head: 'rgba(80,80,80,0.6)' },
    }
    const highlights = bodyHighlights[cas.id] || {}

    // Skin color for body based on vitals
    const skinBg = cs.dead ? '#333'
      : cas.id === 'CAS-1' ? `rgba(59,130,246,${0.05 + (100 - cs.vitals.spo2) * 0.004})`
      : cas.id === 'CAS-4' ? 'rgba(59,130,246,0.08)'
      : 'rgba(200,180,160,0.08)'

    return (
      <div style={{
        position: 'fixed', inset: 0, background: COLORS.bg,
        fontFamily: '"Courier New", Courier, monospace', color: COLORS.text,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: gs.shakeScreen ? 'it-shake 0.4s ease-in-out' : 'none',
      }}>
        <Vignette intensity={gs.timer < 60 ? 'fast' : gs.timer < 120 ? 'normal' : 'none'} />

        {/* HUD */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 20px', background: 'rgba(0,0,0,0.8)',
          borderBottom: `1px solid ${COLORS.red}33`, zIndex: 10,
        }}>
          <button
            onClick={() => dispatch({ type: 'BACK_TO_LIST' })}
            style={{
              background: 'transparent', border: `1px solid ${COLORS.muted}44`,
              color: COLORS.text, padding: '4px 14px', borderRadius: 3,
              cursor: 'pointer', fontSize: '0.75rem',
              fontFamily: '"Courier New", Courier, monospace',
            }}
          >
            &lt; BACK TO LIST
          </button>
          <div style={{ fontSize: '0.85rem', color: COLORS.amber }}>
            {cas.id}: {cas.name} — <span style={{ color: COLORS.muted }}>{cas.location}</span>
          </div>
          <div style={{
            fontSize: '1.3rem', fontWeight: 'bold',
            color: gs.timer < 60 ? COLORS.red : gs.timer < 120 ? COLORS.amber : COLORS.green,
            animation: gs.timer < 60 ? 'it-heartbeat 1s ease-in-out infinite' : 'none',
          }}>
            {formatTime(gs.timer)}
          </div>
        </div>

        {/* Error banner */}
        {gs.errorMsg && (
          <div style={{
            background: 'rgba(220,38,38,0.15)', border: `1px solid ${COLORS.red}`,
            padding: '10px 20px', fontSize: '0.8rem', color: COLORS.red,
            textAlign: 'center', zIndex: 10, animation: 'it-fade-in 0.3s ease',
          }}>
            {gs.errorMsg}
          </div>
        )}

        <div style={{
          flex: 1, display: 'flex', padding: 16, gap: 16, position: 'relative', zIndex: 5,
          overflow: 'hidden',
        }}>
          {/* Left: Body diagram + vitals */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Vitals panel */}
            <div style={{
              display: 'flex', gap: 16, background: COLORS.panel,
              border: `1px solid ${COLORS.muted}22`, borderRadius: 4, padding: '10px 16px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: COLORS.muted, letterSpacing: '0.1em' }}>HEART RATE</div>
                <div style={{
                  fontSize: '1.6rem', fontWeight: 'bold',
                  color: cs.dead ? COLORS.muted : cs.vitals.hr < 50 ? COLORS.red : cs.vitals.hr > 120 ? COLORS.amber : COLORS.green,
                  animation: cs.dead ? 'none' : 'it-heartbeat 1.2s ease-in-out infinite',
                }}>
                  {cs.dead ? '---' : Math.round(cs.vitals.hr)}
                </div>
                <div style={{ fontSize: '0.55rem', color: COLORS.muted }}>BPM</div>
              </div>
              <div style={{ width: 1, background: COLORS.muted + '22' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: COLORS.muted, letterSpacing: '0.1em' }}>RESP RATE</div>
                <div style={{
                  fontSize: '1.6rem', fontWeight: 'bold',
                  color: cs.dead ? COLORS.muted : cs.vitals.rr < 10 ? COLORS.red : COLORS.green,
                }}>
                  {cs.dead ? '---' : Math.round(cs.vitals.rr)}
                </div>
                <div style={{ fontSize: '0.55rem', color: COLORS.muted }}>/min</div>
              </div>
              <div style={{ width: 1, background: COLORS.muted + '22' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: COLORS.muted, letterSpacing: '0.1em' }}>SpO2</div>
                <div style={{
                  fontSize: '1.6rem', fontWeight: 'bold',
                  color: cs.dead ? COLORS.muted : cs.vitals.spo2 < 85 ? COLORS.red : cs.vitals.spo2 < 92 ? COLORS.amber : COLORS.green,
                }}>
                  {cs.dead ? '---' : Math.round(cs.vitals.spo2)}
                </div>
                <div style={{ fontSize: '0.55rem', color: COLORS.muted }}>%</div>
              </div>
              <div style={{ width: 1, background: COLORS.muted + '22' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: COLORS.muted, letterSpacing: '0.1em' }}>SKIN</div>
                <div style={{ fontSize: '0.85rem', color: cs.dead ? COLORS.muted : COLORS.text, marginTop: 4 }}>
                  {cs.vitals.skin}
                </div>
              </div>
              <div style={{ width: 1, background: COLORS.muted + '22' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: COLORS.muted, letterSpacing: '0.1em' }}>STATUS</div>
                <div style={{
                  fontSize: '0.95rem', fontWeight: 'bold', marginTop: 4,
                  color: cs.vitals.status === 'DECEASED' ? COLORS.muted
                    : cs.vitals.status === 'CRITICAL' ? COLORS.red
                    : cs.vitals.status === 'STABLE' ? COLORS.green
                    : COLORS.amber,
                }}>
                  {cs.vitals.status}
                </div>
              </div>
            </div>

            {/* Body diagram */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: COLORS.panel, border: `1px solid ${COLORS.muted}22`, borderRadius: 4,
              position: 'relative', overflow: 'hidden',
              opacity: cs.dead ? 0.4 : 1, transition: 'opacity 1s',
            }}>
              {cs.dead && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 20, fontSize: '2rem', fontWeight: 'bold', color: COLORS.muted, letterSpacing: '0.2em',
                }}>
                  DECEASED
                </div>
              )}

              {/* Shivering effect for CAS-4 */}
              <div style={{
                animation: cas.id === 'CAS-4' && !cs.dead && !cs.treated
                  ? `it-shiver ${0.15 + cs.degradeTime * 0.003}s ease-in-out infinite`
                  : 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                {/* Body outline - simplified human figure using divs */}
                <div style={{ position: 'relative', width: 160, height: 340 }}>
                  {/* Head */}
                  <div
                    onClick={() => handleZoneClick('head')}
                    style={{
                      position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                      width: 44, height: 48, borderRadius: '50%',
                      border: `2px solid ${COLORS.muted}66`,
                      background: highlights.head || skinBg,
                      cursor: gs.selectedItem ? 'crosshair' : 'pointer',
                      transition: 'background 2s',
                    }}
                    title="Head"
                  />

                  {/* Neck */}
                  <div style={{
                    position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)',
                    width: 16, height: 14, background: skinBg, border: `1px solid ${COLORS.muted}44`,
                  }} />

                  {/* Torso / Chest */}
                  <div
                    onClick={() => handleZoneClick('chest')}
                    style={{
                      position: 'absolute', top: 62, left: '50%', transform: 'translateX(-50%)',
                      width: 72, height: 55, borderRadius: '4px 4px 0 0',
                      border: `2px solid ${COLORS.muted}66`,
                      background: highlights.chest || skinBg,
                      cursor: gs.selectedItem ? 'crosshair' : 'pointer',
                      transition: 'background 2s',
                    }}
                    title="Chest"
                  />

                  {/* Torso lower */}
                  <div
                    onClick={() => handleZoneClick('torso')}
                    style={{
                      position: 'absolute', top: 117, left: '50%', transform: 'translateX(-50%)',
                      width: 68, height: 50, borderRadius: '0 0 4px 4px',
                      border: `2px solid ${COLORS.muted}66`, borderTop: 'none',
                      background: highlights.torso || skinBg,
                      cursor: gs.selectedItem ? 'crosshair' : 'pointer',
                      transition: 'background 2s',
                    }}
                    title="Torso"
                  />

                  {/* Left arm */}
                  <div
                    onClick={() => handleZoneClick('leftArm')}
                    style={{
                      position: 'absolute', top: 68, left: 8, width: 26, height: 90,
                      borderRadius: 8,
                      border: `2px solid ${COLORS.muted}66`,
                      background: highlights.leftArm || skinBg,
                      cursor: gs.selectedItem ? 'crosshair' : 'pointer',
                      transform: 'rotate(8deg)',
                      transition: 'background 2s',
                    }}
                    title="Left Arm"
                  />

                  {/* Right arm */}
                  <div
                    onClick={() => handleZoneClick('rightArm')}
                    style={{
                      position: 'absolute', top: 68, right: 8, width: 26, height: 90,
                      borderRadius: 8,
                      border: `2px solid ${COLORS.muted}66`,
                      background: highlights.rightArm || skinBg,
                      cursor: gs.selectedItem ? 'crosshair' : 'pointer',
                      transform: 'rotate(-8deg)',
                      transition: 'background 2s',
                    }}
                    title="Right Arm"
                  />

                  {/* Left leg */}
                  <div
                    onClick={() => handleZoneClick('leftLeg')}
                    style={{
                      position: 'absolute', top: 170, left: 32, width: 30, height: 110,
                      borderRadius: 6,
                      border: `2px solid ${COLORS.muted}66`,
                      background: highlights.leftLeg || skinBg,
                      cursor: gs.selectedItem ? 'crosshair' : 'pointer',
                      transition: 'background 2s',
                    }}
                    title="Left Leg"
                  />

                  {/* Right leg */}
                  <div
                    onClick={() => handleZoneClick('rightLeg')}
                    style={{
                      position: 'absolute', top: 170, right: 32, width: 30, height: 110,
                      borderRadius: 6,
                      border: `2px solid ${COLORS.muted}66`,
                      background: highlights.rightLeg || skinBg,
                      cursor: gs.selectedItem ? 'crosshair' : 'pointer',
                      transition: 'background 2s',
                    }}
                    title="Right Leg"
                  />

                  {/* Left foot */}
                  <div style={{
                    position: 'absolute', top: 280, left: 28, width: 38, height: 16,
                    borderRadius: '4px 4px 8px 8px',
                    background: skinBg, border: `1px solid ${COLORS.muted}44`,
                  }} />

                  {/* Right foot */}
                  <div style={{
                    position: 'absolute', top: 280, right: 28, width: 38, height: 16,
                    borderRadius: '4px 4px 8px 8px',
                    background: skinBg, border: `1px solid ${COLORS.muted}44`,
                  }} />

                  {/* Blood pool for CAS-2 */}
                  {cas.id === 'CAS-2' && !cs.treated && !cs.dead && (
                    <div style={{
                      position: 'absolute', top: 255, right: 20,
                      width: 10 + cs.degradeTime * 0.6, height: 6 + cs.degradeTime * 0.3,
                      maxWidth: 70, maxHeight: 35,
                      background: 'radial-gradient(ellipse, rgba(220,38,38,0.7), rgba(220,38,38,0.2))',
                      borderRadius: '50%', transition: 'all 0.5s',
                    }} />
                  )}

                  {/* Treatment applied indicators */}
                  {cs.treatments.includes('Rescue Breathing Mask') && (
                    <div style={{
                      position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                      width: 36, height: 18, border: `2px solid ${COLORS.green}`,
                      borderRadius: '0 0 12px 12px', background: 'rgba(34,197,94,0.15)',
                      animation: 'it-pulse-glow-green 2s ease-in-out infinite',
                    }} />
                  )}
                  {cs.treatments.includes('Tourniquet') && cas.id === 'CAS-2' && (
                    <div style={{
                      position: 'absolute', top: 175, right: 30, width: 34, height: 8,
                      background: COLORS.red, borderRadius: 4, opacity: 0.7,
                    }} />
                  )}
                  {cs.treatments.includes('Pressure Bandage') && cas.id === 'CAS-2' && (
                    <div style={{
                      position: 'absolute', top: 210, right: 28, width: 36, height: 24,
                      background: 'rgba(255,255,255,0.2)', border: `1px solid ${COLORS.green}`,
                      borderRadius: 4,
                    }} />
                  )}
                  {cs.treatments.includes('Gauze Pads') && cas.id === 'CAS-3' && (
                    <div style={{
                      position: 'absolute', top: 100, left: 6, width: 30, height: 20,
                      background: 'rgba(255,255,255,0.2)', border: `1px solid ${COLORS.green}`,
                      borderRadius: 3,
                    }} />
                  )}
                  {cs.treatments.includes('Mylar Blanket') && cas.id === 'CAS-4' && (
                    <div style={{
                      position: 'absolute', top: 55, left: '50%', transform: 'translateX(-50%)',
                      width: 80, height: 120, background: 'rgba(245,158,11,0.15)',
                      border: `1px solid ${COLORS.amber}44`, borderRadius: 4,
                    }} />
                  )}
                </div>

                {/* Patient label */}
                <div style={{
                  marginTop: 8, fontSize: '0.65rem', color: COLORS.muted, letterSpacing: '0.08em',
                  textAlign: 'center',
                }}>
                  {cas.id === 'CAS-4' ? 'CHILD' : 'ADULT'} — CLICK BODY ZONES TO EXAMINE / APPLY TREATMENT
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: checks, tag, med kit */}
          <div style={{
            width: 300, display: 'flex', flexDirection: 'column', gap: 10,
            overflowY: 'auto',
          }}>
            {/* Examination buttons */}
            <div style={{
              background: COLORS.panel, border: `1px solid ${COLORS.muted}22`,
              borderRadius: 4, padding: 12,
            }}>
              <div style={{
                fontSize: '0.7rem', color: COLORS.amber, letterSpacing: '0.1em',
                marginBottom: 8, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 6,
              }}>
                EXAMINATION
              </div>

              {/* Check Breathing */}
              <button
                onClick={() => {
                  dispatch({ type: 'CHECK_VITALS', payload: { casId: cas.id, checkType: 'breathing' } })
                }}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 6,
                  background: cs.checks.includes('breathing') ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${cs.checks.includes('breathing') ? COLORS.green + '44' : COLORS.muted + '22'}`,
                  borderRadius: 3, cursor: 'pointer', color: COLORS.text,
                  fontFamily: '"Courier New", Courier, monospace', fontSize: '0.75rem',
                }}
              >
                <span style={{ color: COLORS.blue }}>CHECK BREATHING</span>
                {cs.checks.includes('breathing') && (
                  <div style={{ fontSize: '0.68rem', color: COLORS.muted, marginTop: 4, lineHeight: 1.4 }}>
                    {cas.breathingResult}
                  </div>
                )}
              </button>

              {/* Check Pulse */}
              <button
                onClick={() => {
                  dispatch({ type: 'CHECK_VITALS', payload: { casId: cas.id, checkType: 'pulse' } })
                }}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 6,
                  background: cs.checks.includes('pulse') ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${cs.checks.includes('pulse') ? COLORS.green + '44' : COLORS.muted + '22'}`,
                  borderRadius: 3, cursor: 'pointer', color: COLORS.text,
                  fontFamily: '"Courier New", Courier, monospace', fontSize: '0.75rem',
                }}
              >
                <span style={{ color: COLORS.blue }}>CHECK PULSE</span>
                {cs.checks.includes('pulse') && (
                  <div style={{ fontSize: '0.68rem', color: COLORS.muted, marginTop: 4, lineHeight: 1.4 }}>
                    {cas.pulseResult}
                  </div>
                )}
              </button>

              {/* Examine Wounds */}
              <button
                onClick={() => {
                  dispatch({ type: 'CHECK_VITALS', payload: { casId: cas.id, checkType: 'wounds' } })
                }}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px',
                  background: cs.checks.includes('wounds') ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${cs.checks.includes('wounds') ? COLORS.green + '44' : COLORS.muted + '22'}`,
                  borderRadius: 3, cursor: 'pointer', color: COLORS.text,
                  fontFamily: '"Courier New", Courier, monospace', fontSize: '0.75rem',
                }}
              >
                <span style={{ color: COLORS.blue }}>EXAMINE WOUNDS</span>
                {cs.checks.includes('wounds') && (
                  <div style={{ fontSize: '0.68rem', color: COLORS.muted, marginTop: 4, lineHeight: 1.4 }}>
                    {cas.woundsResult}
                  </div>
                )}
              </button>
            </div>

            {/* Triage tag assignment */}
            <div style={{
              background: COLORS.panel, border: `1px solid ${COLORS.muted}22`,
              borderRadius: 4, padding: 12,
            }}>
              <div style={{
                fontSize: '0.7rem', color: COLORS.amber, letterSpacing: '0.1em',
                marginBottom: 8, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 6,
              }}>
                TRIAGE TAG
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {TRIAGE_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => dispatch({ type: 'SET_TAG', payload: { casId: cas.id, tag } })}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 3,
                      border: cs.tag === tag ? `2px solid #fff` : `1px solid ${tagColor(tag)}66`,
                      background: cs.tag === tag ? tagColor(tag) : 'transparent',
                      color: cs.tag === tag ? '#fff' : tagColor(tag),
                      fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
                      fontFamily: '"Courier New", Courier, monospace',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {cs.tag && (
                <div style={{
                  marginTop: 6, fontSize: '0.6rem', color: COLORS.muted, textAlign: 'center',
                }}>
                  Tagged as: <span style={{ color: tagColor(cs.tag), fontWeight: 'bold' }}>{cs.tag}</span>
                </div>
              )}
            </div>

            {/* Med Kit */}
            <div style={{
              background: COLORS.panel, border: `1px solid ${COLORS.muted}22`,
              borderRadius: 4, padding: 12,
            }}>
              <div style={{
                fontSize: '0.7rem', color: COLORS.amber, letterSpacing: '0.1em',
                marginBottom: 8, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 6,
              }}>
                MED KIT {gs.selectedItem && <span style={{ color: COLORS.green }}>— HOLDING: {gs.selectedItem}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(gs.supplies).map(([name, qty]) => (
                  <button
                    key={name}
                    onClick={() => {
                      if (qty > 0 && !cs.dead) {
                        dispatch({ type: 'SELECT_ITEM', payload: name })
                      }
                    }}
                    disabled={qty <= 0 || cs.dead}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 8px', borderRadius: 3,
                      background: gs.selectedItem === name ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.02)',
                      border: gs.selectedItem === name ? `1px solid ${COLORS.green}` : `1px solid ${COLORS.muted}22`,
                      color: qty > 0 ? COLORS.text : COLORS.muted,
                      cursor: qty > 0 && !cs.dead ? 'pointer' : 'not-allowed',
                      fontFamily: '"Courier New", Courier, monospace', fontSize: '0.7rem',
                      textDecoration: qty <= 0 ? 'line-through' : 'none',
                      opacity: qty <= 0 ? 0.4 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{name}</span>
                    <span style={{
                      color: qty > 0 ? COLORS.green : COLORS.red,
                      fontWeight: 'bold', minWidth: 16, textAlign: 'right',
                    }}>{qty}</span>
                  </button>
                ))}
              </div>

              {gs.selectedItem && (
                <button
                  onClick={() => dispatch({ type: 'DESELECT_ITEM' })}
                  style={{
                    marginTop: 8, width: '100%', padding: '6px 0',
                    background: 'rgba(220,38,38,0.1)', border: `1px solid ${COLORS.red}44`,
                    borderRadius: 3, color: COLORS.red, fontSize: '0.65rem',
                    cursor: 'pointer', fontFamily: '"Courier New", Courier, monospace',
                  }}
                >
                  DROP ITEM
                </button>
              )}
            </div>

            {/* Special action buttons (Recovery Position, Remove Wet Clothes) */}
            {cas.id === 'CAS-1' && cs.treatments.includes('Rescue Breathing Mask') && !cs.treatments.includes('Recovery Position') && !cs.dead && (
              <button
                onClick={() => {
                  dispatch({ type: 'APPLY_TREATMENT', payload: { casId: cas.id, item: 'Recovery Position' } })
                  playSuccess()
                }}
                style={{
                  background: COLORS.blue, color: '#fff', border: 'none',
                  padding: '10px 0', borderRadius: 4, fontSize: '0.8rem',
                  fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.1em',
                  fontFamily: '"Courier New", Courier, monospace',
                  animation: 'it-pulse-glow-green 2s ease-in-out infinite',
                }}
              >
                PLACE IN RECOVERY POSITION
              </button>
            )}

            {cas.id === 'CAS-4' && !cs.treatments.includes('Remove Wet Clothes') && !cs.dead && (
              <button
                onClick={() => {
                  dispatch({ type: 'APPLY_TREATMENT', payload: { casId: cas.id, item: 'Remove Wet Clothes' } })
                  playSuccess()
                }}
                style={{
                  background: COLORS.blue, color: '#fff', border: 'none',
                  padding: '10px 0', borderRadius: 4, fontSize: '0.8rem',
                  fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.1em',
                  fontFamily: '"Courier New", Courier, monospace',
                }}
              >
                REMOVE WET CLOTHING
              </button>
            )}

            {/* Applied treatments list */}
            {cs.treatments.length > 0 && (
              <div style={{
                background: 'rgba(34,197,94,0.05)', border: `1px solid ${COLORS.green}22`,
                borderRadius: 4, padding: 10,
              }}>
                <div style={{ fontSize: '0.65rem', color: COLORS.green, letterSpacing: '0.08em', marginBottom: 4 }}>
                  APPLIED TREATMENTS
                </div>
                {cs.treatments.map((t, i) => (
                  <div key={i} style={{ fontSize: '0.65rem', color: COLORS.text, padding: '1px 0' }}>
                    + {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ──────────────────────────────────────────
     RENDER: AFTER-ACTION REPORT
     ────────────────────────────────────────── */
  if (gs.phase === 'report') {
    const result = computeScore()

    return (
      <div style={{
        position: 'fixed', inset: 0, background: COLORS.bg,
        fontFamily: '"Courier New", Courier, monospace', color: COLORS.text,
        overflow: 'auto',
      }}>
        <Vignette intensity="none" />

        <div style={{
          maxWidth: 800, margin: '0 auto', padding: '30px 24px',
          position: 'relative', zIndex: 5,
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{
              fontSize: '0.7rem', color: COLORS.red, letterSpacing: '0.2em', marginBottom: 8,
            }}>
              CLASSIFIED // AFTER-ACTION REPORT
            </div>
            <h1 style={{
              fontSize: '2rem', fontWeight: 900, letterSpacing: '0.15em',
              color: COLORS.text, margin: 0,
            }}>
              OPERATION: IRON TIDE
            </h1>
            <div style={{
              width: 100, height: 2, background: `linear-gradient(90deg, transparent, ${COLORS.red}, transparent)`,
              margin: '12px auto',
            }} />
            <div style={{ fontSize: '0.75rem', color: COLORS.muted }}>
              DEBRIEF — SECTOR 7 FLASH FLOOD RESPONSE
            </div>
          </div>

          {/* Score overview */}
          <div style={{
            display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap',
          }}>
            {[
              { label: 'TRIAGE ACCURACY', value: `${result.triageCorrect}/5`, color: result.triageCorrect >= 4 ? COLORS.green : result.triageCorrect >= 2 ? COLORS.amber : COLORS.red },
              { label: 'TREATMENT ACCURACY', value: `${result.treatmentCorrect}/5`, color: result.treatmentCorrect >= 4 ? COLORS.green : result.treatmentCorrect >= 2 ? COLORS.amber : COLORS.red },
              { label: 'PATIENTS SURVIVED', value: `${result.survived}/5`, color: result.survived >= 4 ? COLORS.green : result.survived >= 2 ? COLORS.amber : COLORS.red },
              { label: 'TIME REMAINING', value: formatTime(result.timeRemaining), color: result.timeRemaining > 120 ? COLORS.green : result.timeRemaining > 0 ? COLORS.amber : COLORS.red },
              { label: 'WASTED ON EXPECTANT', value: result.wastedOnBlack ? 'YES' : 'NO', color: result.wastedOnBlack ? COLORS.red : COLORS.green },
            ].map((stat, i) => (
              <div key={i} style={{
                background: COLORS.panel, border: `1px solid ${COLORS.muted}22`,
                borderRadius: 4, padding: '12px 18px', textAlign: 'center', minWidth: 130,
              }}>
                <div style={{ fontSize: '0.6rem', color: COLORS.muted, letterSpacing: '0.1em', marginBottom: 6 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Overall score */}
          <div style={{
            textAlign: 'center', marginBottom: 30, padding: '20px 0',
            background: COLORS.panel, borderRadius: 6,
            border: `1px solid ${result.passed ? COLORS.green : COLORS.red}44`,
          }}>
            <div style={{ fontSize: '0.7rem', color: COLORS.muted, letterSpacing: '0.15em', marginBottom: 8 }}>
              OVERALL SCORE
            </div>
            <div style={{
              fontSize: '3.5rem', fontWeight: 900,
              color: result.total >= 80 ? COLORS.green : result.total >= 60 ? COLORS.amber : COLORS.red,
            }}>
              {result.total}
            </div>
            <div style={{
              fontSize: '1rem', fontWeight: 'bold', letterSpacing: '0.2em',
              color: result.passed ? COLORS.green : COLORS.red,
              marginTop: 4,
            }}>
              {result.total >= 90 ? 'EXEMPLARY PERFORMANCE' : result.total >= 80 ? 'MISSION SUCCESS' : result.total >= 60 ? 'PASSED — NEEDS IMPROVEMENT' : 'MISSION FAILURE'}
            </div>
          </div>

          {/* Per-casualty breakdown */}
          <div style={{ marginBottom: 30 }}>
            <div style={{
              fontSize: '0.8rem', color: COLORS.amber, letterSpacing: '0.15em',
              marginBottom: 16, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 8,
            }}>
              CASUALTY-BY-CASUALTY DEBRIEF
            </div>

            {result.details.map((d, i) => (
              <div key={i} style={{
                background: COLORS.panel, border: `1px solid ${COLORS.muted}22`,
                borderRadius: 4, padding: 16, marginBottom: 12,
                animation: 'it-fade-in 0.5s ease forwards',
                animationDelay: `${i * 0.15}s`,
                opacity: 0,
                borderLeft: `3px solid ${tagColor(d.cas.correctTag)}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                      {d.cas.id}: {d.cas.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: COLORS.muted, marginTop: 2 }}>
                      {d.cas.location}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.7rem', fontWeight: 'bold',
                    color: d.alive || d.cas.correctTag === 'BLACK' ? COLORS.green : COLORS.red,
                  }}>
                    {d.cas.correctTag === 'BLACK' ? 'EXPECTANT' : d.alive ? 'SURVIVED' : 'DIED'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, marginBottom: 10, fontSize: '0.72rem' }}>
                  <div>
                    <span style={{ color: COLORS.muted }}>Your Tag: </span>
                    <span style={{
                      color: d.tagCorrect ? COLORS.green : COLORS.red,
                      fontWeight: 'bold',
                    }}>
                      {d.tag} {d.tagCorrect ? '[CORRECT]' : `[WRONG — should be ${d.cas.correctTag}]`}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', marginBottom: 10 }}>
                  <span style={{ color: COLORS.muted }}>Your Treatment: </span>
                  <span style={{ color: d.treatCorrect ? COLORS.green : COLORS.amber }}>
                    {d.treatments.length === 0 ? 'None' : d.treatments.join(', ')}
                    {d.treatCorrect ? ' [CORRECT]' : ` [NEEDED: ${d.cas.correctTreatment.length === 0 ? 'None' : d.cas.correctTreatment.join(', ')}]`}
                  </span>
                </div>

                <div style={{
                  background: 'rgba(59,130,246,0.05)', border: `1px solid ${COLORS.blue}22`,
                  borderRadius: 3, padding: '8px 10px', fontSize: '0.68rem',
                  color: COLORS.blue, lineHeight: 1.5,
                }}>
                  <span style={{ fontWeight: 'bold' }}>MEDICAL NOTES: </span>
                  {d.cas.educational}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', paddingBottom: 40 }}>
            <button
              onClick={() => {
                scoreRecorded.current = false
                dispatch({ type: 'START_GAME' })
              }}
              style={{
                background: COLORS.red, color: '#fff', border: 'none',
                padding: '14px 40px', borderRadius: 4, fontSize: '1rem',
                fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.15em',
                fontFamily: '"Courier New", Courier, monospace',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.target.style.background = '#ef4444'}
              onMouseLeave={e => e.target.style.background = COLORS.red}
            >
              REDEPLOY
            </button>
            <button
              onClick={() => ctxDispatch({ type: 'BACK_TO_MENU' })}
              style={{
                background: 'transparent', color: COLORS.muted,
                border: `1px solid ${COLORS.muted}44`,
                padding: '14px 40px', borderRadius: 4, fontSize: '1rem',
                fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.15em',
                fontFamily: '"Courier New", Courier, monospace',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.target.style.borderColor = COLORS.text; e.target.style.color = COLORS.text }}
              onMouseLeave={e => { e.target.style.borderColor = COLORS.muted + '44'; e.target.style.color = COLORS.muted }}
            >
              RETURN TO BASE
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
