import { useReducer, useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from '../context/GameContext'
import HumanBody3D from './HumanBody3D'

/* ══════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════ */
const TOTAL_TIME = 420 // 7 minutes (more patients need more time)
const SEARCH_DURATION = 3000
const DEGRADE_INTERVAL = 1000

const COLORS = {
  bg: '#0a0a12', red: '#dc2626', green: '#22c55e', amber: '#f59e0b',
  blue: '#3b82f6', darkGrey: '#1a1a2e', panel: '#111827',
  text: '#e2e8f0', muted: '#64748b', black: '#000000',
}

/* ══════════════════════════════════════════════
   REAL IMAGES (Pexels — free, no attribution required)
   ══════════════════════════════════════════════ */
const IMG = (id, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=500&fit=crop`

const SCENE_IMAGES = {
  stormBg:          IMG(8956453, 1920),
  floodedStreet:    IMG(8568719),
  collapsedBldg:    IMG(15533288),
  vehicle:          IMG(8568719, 600),
  debris:           IMG(9809),
  intactBldg:       IMG(6471927),
  bridge:           IMG(2328714),
  playground:       IMG(14823609),
  powerLine:        IMG(16114057),
  evacuationPt:     IMG(15533273),
  floodedHome:      IMG(6471927, 600),
  gasStation:       IMG(16689670),
}

/* ══════════════════════════════════════════════
   OFFICIAL SOURCE CITATIONS
   ══════════════════════════════════════════════ */
const SOURCES = {
  triage: {
    org: 'NAEMT — PHTLS',
    title: 'Prehospital Trauma Life Support, 10th Ed.',
    excerpt: 'START triage: Can they walk → GREEN. Breathing? → Open airway. RR >30 or <10 → RED. No radial pulse or cap refill >2s → RED. Can\'t follow commands → RED. All others → YELLOW.',
    url: 'https://www.naemt.org/education/naemt-education-programs/phtls',
  },
  fema: {
    org: 'FEMA / NIMS',
    title: 'IS-100: Introduction to the Incident Command System',
    excerpt: 'Mass casualty incidents require systematic triage to allocate limited resources. "Do the most good for the most people."',
    url: 'https://training.fema.gov/is/courseoverview.aspx?code=IS-100.c',
  },
  redcross: {
    org: 'American Red Cross',
    title: 'First Aid / CPR / AED Participant Manual',
    excerpt: 'In mass casualty events, prioritize patients with life-threatening but survivable injuries. Uncontrolled bleeding, obstructed airway, and signs of shock take priority.',
    url: 'https://www.redcross.org/take-a-class/first-aid',
  },
  drowning: {
    org: 'American Heart Association',
    title: 'AHA Guidelines — Drowning Resuscitation',
    excerpt: 'The primary cause of arrest in drowning is hypoxia; therefore oxygenation and ventilation are the priority. Initiate rescue breathing as soon as possible. Recovery position maintains airway.',
    url: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines',
  },
  drowning2: {
    org: 'World Health Organization',
    title: 'Global Report on Drowning: Preventing a Leading Killer',
    excerpt: 'Immediate provision of rescue breathing at the scene of drowning significantly improves survival outcomes.',
    url: 'https://www.who.int/publications/i/item/global-report-on-drowning',
  },
  hemorrhage: {
    org: 'CoTCCC — Tactical Combat Casualty Care',
    title: 'TCCC Guidelines for Medical Personnel',
    excerpt: 'Massive hemorrhage is the #1 cause of preventable death. Apply tourniquet high and tight proximal to wound. Do NOT remove — only a surgeon removes tourniquets.',
    url: 'https://deployedmedicine.com/market/11/content/40',
  },
  stopbleed: {
    org: 'American College of Surgeons',
    title: 'Stop the Bleed® Campaign',
    excerpt: 'A person can bleed to death in as little as 5 minutes. Apply direct pressure. If bleeding does not stop, apply a tourniquet 2–3 inches above the wound.',
    url: 'https://www.stopthebleed.org/',
  },
  hypothermia: {
    org: 'Wilderness Medical Society',
    title: 'Clinical Practice Guidelines — Accidental Hypothermia',
    excerpt: 'Remove wet clothing immediately. Apply passive external rewarming. In severe hypothermia (<30°C), handle gently — rough handling can trigger ventricular fibrillation. "You\'re not dead until you\'re warm and dead."',
    url: 'https://wms.org/magazine/1264/Clinical-Practice-Guidelines-for-the-Out-of-Hospital-Evaluation-and-Treatment-of-Accidental-Hypothermia',
  },
  burns: {
    org: 'American Burn Association',
    title: 'Advanced Burn Life Support (ABLS)',
    excerpt: 'Electrical burns cause deep tissue injury disproportionate to surface appearance. Current follows the path of least resistance through nerves, blood vessels, and muscles. Cover with DRY sterile dressing. Do NOT apply water.',
    url: 'https://ameriburn.org/education/abls/',
  },
  elderly: {
    org: 'CDC — Emergency Preparedness',
    title: 'Older Adults and Disasters',
    excerpt: 'Older adults are more vulnerable due to physical limitations, chronic conditions, and medication dependencies. Dehydration occurs faster. Thin skin tears easily and wounds bleed persistently.',
    url: 'https://www.cdc.gov/aging/emergency-preparedness/index.html',
  },
  expectant: {
    org: 'NAEMT — PHTLS',
    title: 'Mass Casualty Triage — BLACK Tag (Expectant)',
    excerpt: 'Expectant patients have injuries incompatible with survival given available resources. Utilitarian triage — spending resources on salvageable patients — saves the most lives overall.',
    url: 'https://www.naemt.org/education/naemt-education-programs/phtls',
  },
}

// Which sources apply to each patient
const PATIENT_SOURCES = {
  'CAS-1': ['triage', 'drowning', 'drowning2', 'redcross'],
  'CAS-2': ['triage', 'hemorrhage', 'stopbleed', 'redcross'],
  'CAS-3': ['triage', 'redcross'],
  'CAS-4': ['triage', 'hypothermia', 'redcross'],
  'CAS-5': ['triage', 'expectant', 'fema'],
  'CAS-6': ['triage', 'burns', 'redcross'],
  'CAS-7': ['triage', 'elderly', 'hemorrhage', 'redcross'],
  'CAS-8': ['triage', 'redcross', 'fema'],
}

/* ══════════════════════════════════════════════
   CASUALTY DATA — 8 PATIENTS
   ══════════════════════════════════════════════ */
const CASUALTIES = [
  {
    id: 'CAS-1', name: 'Drowning Victim', location: 'Near Overturned Vehicle', hotspotIdx: 2,
    correctTag: 'RED',
    breathingResult: 'Agonal respirations — NOT effective breathing. Very faint, irregular chest rise.',
    pulseResult: 'Weak carotid pulse detected. Rate ~40 BPM.',
    woundsResult: 'No visible external trauma. Skin pale, lips cyanotic.',
    pupilResult: 'Sluggish bilateral response to light. Fixed gaze present.',
    temperatureResult: '35.2°C (95.4°F) — Mild hypothermia from water exposure.',
    bpResult: '78/52 mmHg — Hypotension. Consistent with near-drowning shock.',
    correctTreatment: ['Rescue Breathing Mask', 'Recovery Position'],
    treatmentZone: 'chest', degradeRate: 1.5, degradeMax: 60,
    startVitals: { hr: 40, rr: 6, spo2: 82, skin: 'Pale / Cyanotic', status: 'CRITICAL' },
    educational: 'Drowning victims with agonal respirations need immediate airway management. Rescue breathing is the priority — without oxygenation, cardiac arrest follows within minutes. The recovery position helps drain water from the airway.',
  },
  {
    id: 'CAS-2', name: 'Crush Injury', location: 'Under Collapsed Building', hotspotIdx: 1,
    correctTag: 'RED',
    breathingResult: 'Normal rate, 22/min.',
    pulseResult: 'Strong radial pulse, 110 BPM — tachycardic.',
    woundsResult: 'Right leg pinned under concrete. Visible bone fragment. Arterial bleeding from thigh.',
    pupilResult: 'Equal and reactive. Alert but confused, GCS 13.',
    temperatureResult: '37.1°C (98.8°F) — Normal core temperature.',
    bpResult: '92/58 mmHg — Hypotension. Class III hemorrhagic shock.',
    correctTreatment: ['Tourniquet', 'Pressure Bandage'],
    treatmentZone: 'rightLeg', degradeRate: 1.2, degradeMax: 90,
    startVitals: { hr: 110, rr: 22, spo2: 95, skin: 'Flushed / Diaphoretic', status: 'CRITICAL' },
    educational: 'Crush injuries with arterial bleeding require immediate hemorrhage control. Tourniquet PROXIMAL to wound BEFORE fluid resuscitation. "You can\'t fill a bathtub with the drain open."',
  },
  {
    id: 'CAS-3', name: 'Walking Wounded', location: 'Near Intact Building', hotspotIdx: 4,
    correctTag: 'GREEN',
    breathingResult: 'Normal, 18/min.',
    pulseResult: 'Strong, 88 BPM.',
    woundsResult: 'Laceration on left forearm, moderate bleeding. Patient ambulatory, oriented.',
    pupilResult: 'Equal and reactive. Alert and oriented x4. GCS 15.',
    temperatureResult: '36.8°C (98.2°F) — Normal.',
    bpResult: '128/82 mmHg — Normal. Slightly elevated from stress.',
    correctTreatment: ['Gauze Pads'],
    treatmentZone: 'leftArm', degradeRate: 0, degradeMax: 999,
    startVitals: { hr: 88, rr: 18, spo2: 98, skin: 'Normal', status: 'STABLE' },
    educational: 'GREEN patients can walk and have minor injuries. They should be triaged LAST. Spending time on GREEN while RED patients deteriorate is a common and deadly mass casualty mistake.',
  },
  {
    id: 'CAS-4', name: 'Hypothermic Child', location: 'Submerged Playground', hotspotIdx: 6,
    correctTag: 'RED',
    breathingResult: 'Shallow, 8/min.',
    pulseResult: 'Weak, thready, 50 BPM.',
    woundsResult: 'No external trauma. Core temp critically low. Violent shivering. Wet clothing.',
    pupilResult: 'Sluggish bilateral. Altered consciousness, GCS 10.',
    temperatureResult: '32.1°C (89.8°F) — SEVERE HYPOTHERMIA. Immediate passive rewarming needed.',
    bpResult: '74/48 mmHg — Significant hypotension from hypothermic vasoconstriction.',
    correctTreatment: ['Remove Wet Clothes', 'Mylar Blanket'],
    treatmentZone: 'torso', degradeRate: 1.0, degradeMax: 75,
    startVitals: { hr: 50, rr: 8, spo2: 88, skin: 'Pale / Cold', status: 'CRITICAL' },
    educational: 'Hypothermia in children is life-threatening. Wet clothing accelerates heat loss via evaporation. ALWAYS remove wet clothes first. "You\'re not dead until you\'re warm and dead."',
  },
  {
    id: 'CAS-5', name: 'Massive Trauma', location: 'Floating Debris', hotspotIdx: 3,
    correctTag: 'BLACK',
    breathingResult: 'No chest rise. No breath sounds.',
    pulseResult: 'No carotid pulse detected.',
    woundsResult: 'Massive cranial injury. Brain matter visible. Fixed dilated pupils.',
    pupilResult: 'Fixed and dilated bilaterally. No response to light. No corneal reflex.',
    temperatureResult: 'Ambient temperature. No body heat detected.',
    bpResult: 'Undetectable. No palpable pulse at any site.',
    correctTreatment: [],
    treatmentZone: null, degradeRate: 0, degradeMax: 999,
    startVitals: { hr: 0, rr: 0, spo2: 0, skin: 'Grey / Mottled', status: 'DECEASED' },
    educational: 'BLACK-tagged patients have injuries incompatible with life. Spending resources on expectant patients directly reduces survival for salvageable patients. This is the hardest but most critical triage decision.',
  },
  {
    id: 'CAS-6', name: 'Electrical Burn', location: 'Near Downed Power Line', hotspotIdx: 7,
    correctTag: 'YELLOW',
    breathingResult: 'Normal, 20/min. Occasional cough.',
    pulseResult: 'Regular, 105 BPM — mildly tachycardic. Irregular rhythm noted.',
    woundsResult: 'Entry wound right hand — charred, painless center. Exit wound left foot. Burns on right forearm.',
    pupilResult: 'Equal and reactive. Alert but anxious, GCS 15.',
    temperatureResult: '37.3°C (99.1°F) — Mildly elevated from tissue damage response.',
    bpResult: '138/88 mmHg — Mildly hypertensive from pain/stress response.',
    correctTreatment: ['Burn Dressing'],
    treatmentZone: 'rightArm', degradeRate: 0.3, degradeMax: 200,
    startVitals: { hr: 105, rr: 20, spo2: 96, skin: 'Reddened / Blistered', status: 'GUARDED' },
    educational: 'Electrical burns cause internal tissue damage far beyond visible surface injury. Current travels between entry/exit points, damaging muscles, nerves, and potentially causing cardiac arrhythmia. NEVER apply water to electrical burns — cover with DRY sterile dressing. Monitor cardiac rhythm.',
  },
  {
    id: 'CAS-7', name: 'Elderly Wound', location: 'Near Evacuation Point', hotspotIdx: 8,
    correctTag: 'YELLOW',
    breathingResult: 'Normal, 20/min. Slightly labored.',
    pulseResult: 'Weak but regular, 95 BPM.',
    woundsResult: 'Deep laceration on left leg from debris during evacuation. Steady venous bleeding. Signs of dehydration — dry mucous membranes, sunken eyes.',
    pupilResult: 'Equal and reactive. Alert but fatigued, GCS 14.',
    temperatureResult: '36.2°C (97.2°F) — Mildly hypothermic. Core temp dropping from exposure.',
    bpResult: '105/68 mmHg — Borderline hypotension. Consistent with dehydration + blood loss.',
    correctTreatment: ['Pressure Bandage', 'IV Fluid Bag'],
    treatmentZone: 'leftLeg', degradeRate: 0.5, degradeMax: 150,
    startVitals: { hr: 95, rr: 20, spo2: 95, skin: 'Pale / Dry', status: 'GUARDED' },
    educational: 'Elderly disaster victims are highly vulnerable to dehydration and hypothermia. Their thin skin tears easily. Hemorrhage control PLUS fluid replacement is essential. Monitor for rapid decompensation — elderly patients can crash suddenly.',
  },
  {
    id: 'CAS-8', name: 'Panicking Survivor', location: 'Flooded Residential Home', hotspotIdx: 9,
    correctTag: 'GREEN',
    breathingResult: 'Rapid, 28/min — hyperventilating. No signs of respiratory distress.',
    pulseResult: 'Strong, 112 BPM — sinus tachycardia from anxiety.',
    woundsResult: 'Minor scratches on both arms from broken glass. Fully ambulatory. Oriented but severely anxious.',
    pupilResult: 'Equal and reactive. Dilated from sympathetic response. GCS 15.',
    temperatureResult: '37.0°C (98.6°F) — Normal.',
    bpResult: '142/90 mmHg — Elevated from anxiety. No underlying hypertensive emergency.',
    correctTreatment: ['Gauze Pads'],
    treatmentZone: 'leftArm', degradeRate: 0, degradeMax: 999,
    startVitals: { hr: 112, rr: 28, spo2: 99, skin: 'Normal / Flushed', status: 'STABLE' },
    educational: 'Panicking survivors can appear critically ill (tachycardia, tachypnea) but are GREEN-tagged. Their distress is real but injuries are minor and they are ambulatory. Psychological first aid matters, but must NOT delay treatment of RED patients. Diverting resources to GREEN patients while RED patients die is the #1 triage error.',
  },
]

/* ══════════════════════════════════════════════
   HOTSPOTS — 11 locations (8 with casualties)
   ══════════════════════════════════════════════ */
// casualtyZone: { x%, y% } — where in each scene the survivor is hidden (for flashlight discovery)
const HOTSPOTS = [
  { id: 0, label: 'Flooded Street',        img: SCENE_IMAGES.floodedStreet,  hasCasualty: false, casualtyZone: null, desc: 'A main road submerged under 2 feet of murky floodwater. Vehicles partially submerged.' },
  { id: 1, label: 'Collapsed Building',     img: SCENE_IMAGES.collapsedBldg,  hasCasualty: true,  casualtyZone: { x: 35, y: 60 }, desc: 'A partially collapsed structure with rubble and concrete blocks. Rescue teams could be needed.' },
  { id: 2, label: 'Overturned Vehicle',     img: SCENE_IMAGES.vehicle,        hasCasualty: true,  casualtyZone: { x: 55, y: 45 }, desc: 'A car pushed sideways by floodwaters, partially submerged. Someone could be trapped inside.' },
  { id: 3, label: 'Floating Debris',        img: SCENE_IMAGES.debris,         hasCasualty: true,  casualtyZone: { x: 65, y: 55 }, desc: 'A field of broken wood, metal, and wreckage carried downstream by the flood current.' },
  { id: 4, label: 'Intact Building',        img: SCENE_IMAGES.intactBldg,     hasCasualty: true,  casualtyZone: { x: 40, y: 50 }, desc: 'A residential building still standing but surrounded by floodwater on all sides.' },
  { id: 5, label: 'Under Bridge',           img: SCENE_IMAGES.bridge,         hasCasualty: false, casualtyZone: null, desc: 'A bridge over a swollen river. Water level dangerously close to the deck. Strong current visible.' },
  { id: 6, label: 'Submerged Playground',   img: SCENE_IMAGES.playground,     hasCasualty: true,  casualtyZone: { x: 50, y: 40 }, desc: 'A children\'s playground completely flooded. Swings and slides barely visible above waterline.' },
  { id: 7, label: 'Downed Power Line',      img: SCENE_IMAGES.powerLine,      hasCasualty: true,  casualtyZone: { x: 30, y: 65 }, desc: 'Utility poles snapped by the storm. Live wires hanging near standing water. Extreme danger.' },
  { id: 8, label: 'Evacuation Point',       img: SCENE_IMAGES.evacuationPt,   hasCasualty: true,  casualtyZone: { x: 60, y: 50 }, desc: 'A designated rally point where displaced residents have gathered. Chaos and confusion visible.' },
  { id: 9, label: 'Flooded Home',           img: SCENE_IMAGES.floodedHome,    hasCasualty: true,  casualtyZone: { x: 45, y: 55 }, desc: 'A residential house with water up to the first floor windows. Cries for help reported.' },
  { id: 10, label: 'Submerged Gas Station', img: SCENE_IMAGES.gasStation,     hasCasualty: false, casualtyZone: null, desc: 'A gas station destroyed by the flood. Fuel contamination possible. Area evacuated.' },
]

const INITIAL_SUPPLIES = {
  'Rescue Breathing Mask': 1,
  'Tourniquet': 2,
  'Pressure Bandage': 4,
  'Gauze Pads': 6,
  'Mylar Blanket': 2,
  'IV Fluid Bag': 2,
  'Burn Dressing': 2,
}

const TRIAGE_TAGS = ['RED', 'YELLOW', 'GREEN', 'BLACK']
const NUM_PATIENTS = CASUALTIES.length

/* ══════════════════════════════════════════════
   GAME STATE REDUCER
   ══════════════════════════════════════════════ */
const initialGameState = {
  phase: 'start', timer: TOTAL_TIME,
  searchingHotspot: null, searchProgress: 0,
  searchedHotspots: [], foundCasualties: [],
  currentCasualty: null,
  casualtyState: {}, supplies: { ...INITIAL_SUPPLIES },
  selectedItem: null, errorMsg: null, shakeScreen: false, typewriterDone: false, triageStarted: false,
}

function gameStateReducer(state, action) {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...initialGameState, phase: 'explore', timer: TOTAL_TIME,
        casualtyState: CASUALTIES.reduce((acc, c) => {
          acc[c.id] = { tag: null, treatments: [], checks: [], degradeTime: 0, vitals: { ...c.startVitals }, dead: c.id === 'CAS-5', treated: false }
          return acc
        }, {}),
      }
    case 'TICK': {
      if (state.phase !== 'explore' && state.phase !== 'triage') return state
      const t = Math.max(0, state.timer - 1)
      if (t <= 0) return { ...state, timer: 0, phase: 'report' }
      return { ...state, timer: t }
    }
    case 'BEGIN_SEARCH':
      return { ...state, searchingHotspot: action.payload, searchProgress: 0 }
    case 'SEARCH_PROGRESS':
      return { ...state, searchProgress: Math.min(100, state.searchProgress + action.payload) }
    case 'FINISH_SEARCH': {
      const hsId = action.payload
      const newSearched = [...state.searchedHotspots, hsId]
      const cas = CASUALTIES.find(c => c.hotspotIdx === hsId)
      const newFound = cas ? [...state.foundCasualties, cas.id] : state.foundCasualties
      return { ...state, searchingHotspot: null, searchProgress: 0, searchedHotspots: newSearched, foundCasualties: newFound }
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
      return { ...state, casualtyState: { ...state.casualtyState, [casId]: { ...cs, checks: [...cs.checks, checkType] } } }
    }
    case 'SET_TAG': {
      const { casId, tag } = action.payload
      const cs = state.casualtyState[casId]
      return { ...state, casualtyState: { ...state.casualtyState, [casId]: { ...cs, tag } } }
    }
    case 'SELECT_ITEM':
      return { ...state, selectedItem: action.payload }
    case 'DESELECT_ITEM':
      return { ...state, selectedItem: null }
    case 'APPLY_TREATMENT': {
      const { casId, item } = action.payload
      const cs = state.casualtyState[casId]
      const cas = CASUALTIES.find(c => c.id === casId)
      if (cas.correctTag === 'BLACK') {
        return { ...state, selectedItem: null, errorMsg: 'RESOURCE MISALLOCATION: This patient has injuries incompatible with life.', shakeScreen: true,
          supplies: { ...state.supplies, [item]: state.supplies[item] - 1 },
          casualtyState: { ...state.casualtyState, [casId]: { ...cs, treatments: [...cs.treatments, item] } } }
      }
      if (casId === 'CAS-2' && item === 'IV Fluid Bag' && !cs.treatments.includes('Tourniquet')) {
        return { ...state, selectedItem: null, errorMsg: 'Fluid resuscitation without hemorrhage control increases bleeding. STOP THE BLEED FIRST.', shakeScreen: true }
      }
      const validItems = [...cas.correctTreatment]
      if (casId === 'CAS-2') validItems.push('IV Fluid Bag')
      const isSpecial = item === 'Recovery Position' || item === 'Remove Wet Clothes'
      if (!validItems.includes(item) && !isSpecial) {
        return { ...state, selectedItem: null, errorMsg: 'Wrong treatment for this patient. Assess their condition and choose appropriately.', shakeScreen: true }
      }
      const newSupplies = { ...state.supplies }
      if (!isSpecial) newSupplies[item] = newSupplies[item] - 1
      const newTreatments = [...cs.treatments, item]
      const allTreated = cas.correctTreatment.every(t => newTreatments.includes(t))
      const nv = { ...cs.vitals }
      if (casId === 'CAS-1') {
        if (item === 'Rescue Breathing Mask') { nv.rr = 14; nv.spo2 = Math.min(95, nv.spo2 + 10) }
        if (item === 'Recovery Position') { nv.spo2 = 96; nv.status = 'STABLE'; nv.skin = 'Improving' }
      }
      if (casId === 'CAS-2') {
        if (item === 'Tourniquet') { nv.hr = 100; nv.status = 'GUARDED' }
        if (item === 'Pressure Bandage') { nv.hr = 95; nv.status = 'STABLE'; nv.skin = 'Improving' }
      }
      if (casId === 'CAS-3') { if (item === 'Gauze Pads') { nv.status = 'STABLE'; nv.skin = 'Normal' } }
      if (casId === 'CAS-4') {
        if (item === 'Remove Wet Clothes') { nv.rr = 10; nv.skin = 'Less Cold' }
        if (item === 'Mylar Blanket') { nv.hr = 60; nv.rr = 14; nv.spo2 = 94; nv.status = 'STABLE'; nv.skin = 'Warming' }
      }
      if (casId === 'CAS-6') { if (item === 'Burn Dressing') { nv.hr = 95; nv.status = 'STABLE'; nv.skin = 'Dressed / Protected' } }
      if (casId === 'CAS-7') {
        if (item === 'Pressure Bandage') { nv.hr = 88; nv.status = 'GUARDED'; nv.skin = 'Pale but Stable' }
        if (item === 'IV Fluid Bag') { nv.spo2 = 97; nv.status = 'STABLE'; nv.skin = 'Improving' }
      }
      if (casId === 'CAS-8') { if (item === 'Gauze Pads') { nv.status = 'STABLE'; nv.skin = 'Normal' } }
      return { ...state, selectedItem: null, errorMsg: null, supplies: newSupplies,
        casualtyState: { ...state.casualtyState, [casId]: { ...cs, treatments: newTreatments, vitals: nv, treated: allTreated } } }
    }
    case 'DEGRADE_CASUALTY': {
      const { casId } = action.payload
      const cs = state.casualtyState[casId]
      const cas = CASUALTIES.find(c => c.id === casId)
      if (cs.dead || cs.treated || cas.degradeRate === 0) return state
      const dt = cs.degradeTime + 1
      const nv = { ...cs.vitals }
      let dead = false
      if (casId === 'CAS-1') {
        nv.spo2 = Math.max(0, cs.vitals.spo2 - 0.4); nv.hr = Math.max(0, cs.vitals.hr - 0.15)
        nv.skin = nv.spo2 < 70 ? 'Deeply Cyanotic' : nv.spo2 < 80 ? 'Cyanotic' : 'Pale / Cyanotic'
        if (dt >= cas.degradeMax) { dead = true; nv.hr = 0; nv.rr = 0; nv.spo2 = 0; nv.status = 'DECEASED'; nv.skin = 'Grey' }
        else if (nv.spo2 < 70) nv.status = 'CRITICAL'
      }
      if (casId === 'CAS-2') {
        nv.hr = Math.min(160, cs.vitals.hr + 0.3); nv.spo2 = Math.max(0, cs.vitals.spo2 - 0.15)
        if (dt > 60) nv.hr = Math.max(0, cs.vitals.hr - 0.5)
        if (dt >= cas.degradeMax) { dead = true; nv.hr = 0; nv.rr = 0; nv.spo2 = 0; nv.status = 'DECEASED'; nv.skin = 'Grey / Mottled' }
        else nv.status = nv.hr > 130 ? 'CRITICAL' : 'GUARDED'
      }
      if (casId === 'CAS-4') {
        nv.hr = Math.max(0, cs.vitals.hr - 0.2); nv.rr = Math.max(0, cs.vitals.rr - 0.05); nv.spo2 = Math.max(0, cs.vitals.spo2 - 0.2)
        if (dt >= cas.degradeMax) { dead = true; nv.hr = 0; nv.rr = 0; nv.spo2 = 0; nv.status = 'DECEASED'; nv.skin = 'Grey / Cold' }
        else nv.status = nv.hr < 35 ? 'CRITICAL' : 'GUARDED'
      }
      if (casId === 'CAS-6') {
        nv.hr = Math.min(130, cs.vitals.hr + 0.08)
        if (dt >= cas.degradeMax) { nv.status = 'CRITICAL' } else nv.status = nv.hr > 120 ? 'CRITICAL' : 'GUARDED'
      }
      if (casId === 'CAS-7') {
        nv.hr = Math.max(0, cs.vitals.hr + 0.1); nv.spo2 = Math.max(0, cs.vitals.spo2 - 0.08)
        if (dt >= cas.degradeMax) { dead = true; nv.hr = 0; nv.rr = 0; nv.spo2 = 0; nv.status = 'DECEASED'; nv.skin = 'Grey' }
        else nv.status = nv.spo2 < 90 ? 'CRITICAL' : 'GUARDED'
      }
      return { ...state, casualtyState: { ...state.casualtyState, [casId]: { ...cs, degradeTime: dt, vitals: nv, dead } } }
    }
    case 'CLEAR_ERROR': return { ...state, errorMsg: null, shakeScreen: false }
    case 'FINISH_GAME': return { ...state, phase: 'report' }
    case 'SET_TYPEWRITER_DONE': return { ...state, typewriterDone: true }
    default: return state
  }
}

/* ══════════════════════════════════════════════
   AUDIO
   ══════════════════════════════════════════════ */
function getAudioCtx() {
  if (!getAudioCtx._ctx) { try { getAudioCtx._ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { return null } }
  return getAudioCtx._ctx
}
function playTone(f, d, t = 'sine', v = 0.15) {
  const ctx = getAudioCtx(); if (!ctx) return
  try { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = t; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d); o.stop(ctx.currentTime + d) } catch {}
}
function playHeartbeat() { playTone(440, 0.1, 'sine', 0.12) }
function playSuccess() { playTone(523, 0.12, 'sine', 0.1); setTimeout(() => playTone(659, 0.12, 'sine', 0.1), 130); setTimeout(() => playTone(784, 0.18, 'sine', 0.1), 260) }
function playError() { playTone(150, 0.25, 'square', 0.1) }
function playXray() { playTone(800, 0.08, 'sine', 0.08); setTimeout(() => playTone(1200, 0.15, 'sine', 0.06), 100) }
function playScan() { playTone(600, 0.3, 'sine', 0.06); setTimeout(() => playTone(900, 0.2, 'sine', 0.05), 200) }

/* ══════════════════════════════════════════════
   CSS KEYFRAMES
   ══════════════════════════════════════════════ */
const STYLE_ID = 'iron-tide-styles'
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style'); s.id = STYLE_ID
  s.textContent = `
    @keyframes it-rain{0%{transform:translateY(-100vh);opacity:.7}100%{transform:translateY(100vh);opacity:0}}
    @keyframes it-pulse-red{0%,100%{box-shadow:inset 0 0 80px rgba(220,38,38,.15)}50%{box-shadow:inset 0 0 120px rgba(220,38,38,.4)}}
    @keyframes it-pulse-red-fast{0%,100%{box-shadow:inset 0 0 100px rgba(220,38,38,.25)}50%{box-shadow:inset 0 0 160px rgba(220,38,38,.6)}}
    @keyframes it-pulse-glow{0%,100%{box-shadow:0 0 8px rgba(220,38,38,.4);transform:scale(1)}50%{box-shadow:0 0 16px rgba(220,38,38,.7),0 0 32px rgba(220,38,38,.4);transform:scale(1.05)}}
    @keyframes it-pulse-glow-green{0%,100%{box-shadow:0 0 8px rgba(34,197,94,.4)}50%{box-shadow:0 0 20px rgba(34,197,94,.8)}}
    @keyframes it-pulse-glow-blue{0%,100%{box-shadow:0 0 8px rgba(59,130,246,.3)}50%{box-shadow:0 0 20px rgba(59,130,246,.7)}}
    @keyframes it-heartbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.2)}30%{transform:scale(1)}45%{transform:scale(1.15)}60%{transform:scale(1)}}
    @keyframes it-shake{0%,100%{transform:translate(0,0)}10%{transform:translate(-4px,2px)}30%{transform:translate(-3px,-1px)}50%{transform:translate(-2px,2px)}70%{transform:translate(-1px,1px)}90%{transform:translate(-1px,0)}}
    @keyframes it-deploy-pulse{0%,100%{box-shadow:0 0 15px rgba(220,38,38,.3),0 0 30px rgba(220,38,38,.1)}50%{box-shadow:0 0 30px rgba(220,38,38,.6),0 0 60px rgba(220,38,38,.3)}}
    @keyframes it-typewriter-cursor{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes it-scan-line{0%{top:-2px}100%{top:100%}}
    @keyframes it-fade-in{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
    @keyframes it-lightning{0%,95%,100%{opacity:0}96%{opacity:.8}97%{opacity:.1}98%{opacity:.6}}
    @keyframes it-scan-sweep{0%{top:0;opacity:.8}100%{top:100%;opacity:.2}}
    @keyframes it-equipment-glow{0%,100%{box-shadow:0 0 5px rgba(59,130,246,.2)}50%{box-shadow:0 0 15px rgba(59,130,246,.5)}}
  `
  document.head.appendChild(s)
}

/* ══════════════════════════════════════════════
   HELPER COMPONENTS
   ══════════════════════════════════════════════ */
function RainEffect() {
  const drops = Array.from({ length: 80 }, (_, i) => ({ left: `${(i / 80) * 100 + Math.random() * 2}%`, delay: `${Math.random() * 2}s`, dur: `${0.4 + Math.random() * 0.5}s`, op: 0.15 + Math.random() * 0.3 }))
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
    {drops.map((d, i) => <div key={i} style={{ position: 'absolute', left: d.left, top: 0, width: 1.5, height: 22, background: `rgba(150,180,220,${d.op})`, animation: `it-rain ${d.dur} ${d.delay} linear infinite` }} />)}
  </div>
}
function Vignette({ intensity = 'normal' }) {
  const a = intensity === 'fast' ? 'it-pulse-red-fast 1s ease-in-out infinite' : intensity === 'normal' ? 'it-pulse-red 2.5s ease-in-out infinite' : 'none'
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,.7) 100%)', animation: a }} />
}
function ScanLine() {
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2, opacity: 0.03 }}>
    <div style={{ position: 'absolute', left: 0, width: '100%', height: 2, background: 'rgba(255,255,255,.5)', animation: 'it-scan-line 4s linear infinite' }} />
  </div>
}
function Typewriter({ text, speed = 35, onDone }) {
  const [displayed, setDisplayed] = useState('')
  const idx = useRef(0), doneRef = useRef(false)
  useEffect(() => {
    idx.current = 0; doneRef.current = false; setDisplayed('')
    const iv = setInterval(() => { idx.current++; if (idx.current >= text.length) { setDisplayed(text); clearInterval(iv); if (!doneRef.current) { doneRef.current = true; onDone?.() }; return }; setDisplayed(text.slice(0, idx.current)) }, speed)
    return () => clearInterval(iv)
  }, [text, speed])
  return <span>{displayed}<span style={{ animation: 'it-typewriter-cursor .7s step-end infinite', fontWeight: 'bold' }}>|</span></span>
}
function formatTime(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }
function tagColor(t) { return t === 'RED' ? COLORS.red : t === 'YELLOW' ? COLORS.amber : t === 'GREEN' ? COLORS.green : t === 'BLACK' ? '#333' : COLORS.muted }

/* ──────────── SOURCES PANEL ──────────── */
function SourcesPanel({ casId, onClose }) {
  const keys = PATIENT_SOURCES[casId] || ['triage', 'redcross']
  const cas = CASUALTIES.find(c => c.id === casId)
  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 380, background: 'rgba(10,15,30,0.97)', backdropFilter: 'blur(16px)', zIndex: 50, display: 'flex', flexDirection: 'column', borderLeft: `2px solid ${COLORS.blue}33`, animation: 'it-fade-in .3s ease', boxShadow: '-4px 0 30px rgba(0,0,0,.5)' }}>
      <div style={{ padding: '16px 18px', borderBottom: `1px solid ${COLORS.muted}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '.8rem', color: COLORS.blue, letterSpacing: '.1em', fontWeight: 'bold' }}>OFFICIAL SOURCES</div>
          <div style={{ fontSize: '1rem', color: COLORS.text, marginTop: 4 }}>{cas?.id}: {cas?.name}</div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,.05)', border: `1px solid ${COLORS.muted}44`, color: COLORS.text, padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: '"Courier New",monospace', fontSize: '.85rem' }}>CLOSE</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {keys.map((k, i) => {
          const src = SOURCES[k]
          if (!src) return null
          return (
            <div key={i} style={{ background: 'rgba(59,130,246,.04)', border: `1px solid ${COLORS.blue}22`, borderRadius: 6, padding: 14, borderLeft: `3px solid ${COLORS.blue}` }}>
              <div style={{ fontSize: '.75rem', color: COLORS.blue, fontWeight: 'bold', letterSpacing: '.08em', marginBottom: 4 }}>{src.org}</div>
              <div style={{ fontSize: '.9rem', color: COLORS.text, fontWeight: 'bold', marginBottom: 8 }}>{src.title}</div>
              <div style={{ fontSize: '.85rem', color: COLORS.muted, lineHeight: 1.6, fontStyle: 'italic', borderLeft: `2px solid ${COLORS.muted}33`, paddingLeft: 10, marginBottom: 8 }}>
                "{src.excerpt}"
              </div>
              <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.8rem', color: COLORS.blue, textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                onMouseLeave={e => e.target.style.textDecoration = 'none'}
              >View Source ↗</a>
            </div>
          )
        })}
        <div style={{ background: 'rgba(59,130,246,.06)', borderRadius: 4, padding: 10, fontSize: '.75rem', color: COLORS.blue, lineHeight: 1.5, marginTop: 8 }}>
          All sources are from official government agencies, medical associations, or internationally recognized humanitarian organizations.
        </div>
      </div>
    </div>
  )
}

/* ──────────── IMMERSIVE SCENE INVESTIGATION (Explore Phase) ──────────── */
function SceneInvestigation({ hotspot, onBack, onStartSearch, searching, progress, done, found }) {
  const containerRef = useRef(null)
  const [mouse, setMouse] = useState({ x: 50, y: 50 })
  const [nearZone, setNearZone] = useState(false)
  const [revealPct, setRevealPct] = useState(0) // 0-100: how much of the scene has been "revealed" by flashlight near the zone

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMouse({ x, y })

    // Check if flashlight is near the casualty zone
    if (hotspot.casualtyZone && !done) {
      const dx = x - hotspot.casualtyZone.x, dy = y - hotspot.casualtyZone.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const isNear = dist < 12
      setNearZone(isNear)
      if (isNear) setRevealPct(p => Math.min(100, p + 1.5))
    }
  }, [hotspot, done])

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} style={{
      position: 'relative', flex: 1, overflow: 'hidden', borderRadius: 8, cursor: 'none',
      userSelect: 'none',
    }}>
      {/* Full-screen scene photograph */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${hotspot.img})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: done ? (found ? 'brightness(0.6)' : 'grayscale(0.8) brightness(0.3)') : 'brightness(0.9)',
        transition: 'filter 1s',
      }} />

      {/* Darkness overlay with flashlight cutout */}
      {!done && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle 100px at ${mouse.x}% ${mouse.y}%, transparent 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.88) 100%)`,
          transition: 'background 0.05s',
          pointerEvents: 'none',
        }} />
      )}

      {/* Flashlight beam glow */}
      {!done && (
        <div style={{
          position: 'absolute',
          left: `${mouse.x}%`, top: `${mouse.y}%`,
          width: 200, height: 200,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,200,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Custom flashlight cursor */}
      {!done && (
        <div style={{
          position: 'absolute',
          left: `${mouse.x}%`, top: `${mouse.y}%`,
          width: 20, height: 20,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: '2px solid rgba(255,255,200,0.6)',
          pointerEvents: 'none',
          boxShadow: '0 0 10px rgba(255,255,200,0.3)',
          zIndex: 20,
        }} />
      )}

      {/* Casualty zone glow — becomes visible when flashlight is near */}
      {hotspot.casualtyZone && !done && (
        <div style={{
          position: 'absolute',
          left: `${hotspot.casualtyZone.x}%`, top: `${hotspot.casualtyZone.y}%`,
          transform: 'translate(-50%, -50%)',
          width: 70, height: 70, borderRadius: '50%',
          border: nearZone ? `2px solid ${COLORS.red}` : revealPct > 30 ? `1px solid ${COLORS.red}44` : 'none',
          background: nearZone ? 'rgba(220,38,38,0.2)' : revealPct > 50 ? 'rgba(220,38,38,0.08)' : 'transparent',
          boxShadow: nearZone ? `0 0 30px rgba(220,38,38,0.5), inset 0 0 20px rgba(220,38,38,0.2)` : 'none',
          animation: nearZone ? 'it-pulse-glow 1.5s ease-in-out infinite' : 'none',
          cursor: nearZone && !searching ? 'pointer' : 'none',
          pointerEvents: nearZone ? 'auto' : 'none',
          transition: 'border 0.3s, background 0.3s',
        }}
          onClick={() => nearZone && !searching && !done && onStartSearch()}
        >
          {nearZone && !searching && (
            <div style={{
              position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)',
              fontSize: '.85rem', color: COLORS.red, fontWeight: 'bold', whiteSpace: 'nowrap',
              textShadow: '0 0 10px rgba(0,0,0,0.8)',
              animation: 'it-fade-in .3s ease',
            }}>
              CLICK TO INVESTIGATE
            </div>
          )}
        </div>
      )}

      {/* No-casualty zone — need to search around, then click anywhere after enough scanning */}
      {!hotspot.casualtyZone && !done && revealPct < 100 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
        }} />
      )}

      {/* For empty locations: auto-search trigger after mouse covers enough area */}
      {!hotspot.hasCasualty && !done && !searching && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          cursor: 'pointer', pointerEvents: 'auto',
        }}
          onClick={onStartSearch}
        >
          <div style={{
            background: 'rgba(0,0,0,0.7)', border: `1px solid ${COLORS.amber}66`,
            padding: '10px 24px', borderRadius: 6, fontSize: '.95rem', color: COLORS.amber,
            fontWeight: 'bold', letterSpacing: '.1em', backdropFilter: 'blur(4px)',
            textShadow: '0 0 8px rgba(0,0,0,0.8)',
          }}>
            SCAN AREA FOR SURVIVORS
          </div>
        </div>
      )}

      {/* Searching progress overlay */}
      {searching && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 15 }}>
          <div style={{ background: 'rgba(0,0,0,0.7)', padding: '20px 40px', borderRadius: 8, textAlign: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ fontSize: '1.1rem', color: COLORS.amber, fontWeight: 'bold', letterSpacing: '.15em', marginBottom: 12 }}>INVESTIGATING...</div>
            <div style={{ width: 200, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: `linear-gradient(90deg, ${COLORS.amber}, ${COLORS.green})`, width: `${progress}%`, transition: 'width .05s linear', borderRadius: 3 }} />
            </div>
          </div>
        </div>
      )}

      {/* Result overlays */}
      {done && found && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 15, animation: 'it-fade-in .5s ease' }}>
          <div style={{ background: 'rgba(220,38,38,0.15)', border: `2px solid ${COLORS.red}`, padding: '24px 48px', borderRadius: 8, textAlign: 'center', backdropFilter: 'blur(8px)', boxShadow: '0 0 40px rgba(220,38,38,0.3)' }}>
            <div style={{ fontSize: '1.8rem', color: COLORS.red, fontWeight: 900, letterSpacing: '.2em', marginBottom: 8 }}>CASUALTY FOUND</div>
            <div style={{ fontSize: '1rem', color: COLORS.text }}>{CASUALTIES.find(c => c.hotspotIdx === hotspot.id)?.name || 'Unknown'}</div>
          </div>
        </div>
      )}
      {done && !found && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 15, animation: 'it-fade-in .5s ease' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid ${COLORS.muted}66`, padding: '24px 48px', borderRadius: 8, backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: '1.5rem', color: COLORS.green, fontWeight: 'bold', letterSpacing: '.15em' }}>ALL CLEAR</div>
          </div>
        </div>
      )}

      {/* Scene info overlay — top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 18px', background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: COLORS.text, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{hotspot.label}</div>
          <div style={{ fontSize: '.85rem', color: COLORS.muted, marginTop: 4, maxWidth: 500, lineHeight: 1.4, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{hotspot.desc}</div>
        </div>
        <button onClick={onBack} style={{
          background: 'rgba(0,0,0,0.6)', border: `1px solid ${COLORS.muted}66`, color: COLORS.text,
          padding: '8px 20px', borderRadius: 5, cursor: 'pointer', fontSize: '.9rem',
          fontFamily: '"Courier New",monospace', backdropFilter: 'blur(4px)',
          pointerEvents: 'auto', zIndex: 20,
        }}>&lt; BACK TO MAP</button>
      </div>

      {/* Bottom hint */}
      {!done && !searching && hotspot.hasCasualty && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10, pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: '8px 20px', borderRadius: 4, fontSize: '.85rem', color: COLORS.muted, backdropFilter: 'blur(4px)', textShadow: '0 1px 4px rgba(0,0,0,0.8)', textAlign: 'center' }}>
            Move your flashlight to search for survivors. Look carefully...
          </div>
        </div>
      )}

      {/* Rain effect inside scene */}
      <RainEffect />
    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
export default function IronTide() {
  const { dispatch: ctxDispatch } = useGame()
  const [gs, dispatch] = useReducer(gameStateReducer, initialGameState)
  const timerRef = useRef(null), degradeRef = useRef(null), searchRef = useRef(null), heartbeatRef = useRef(null)
  const [xrayMode, setXrayMode] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [activeScene, setActiveScene] = useState(null) // hotspot id for scene investigation view

  useEffect(() => { injectStyles() }, [])
  useEffect(() => {
    if (gs.phase === 'explore' || gs.phase === 'triage') { timerRef.current = setInterval(() => dispatch({ type: 'TICK' }), 1000); return () => clearInterval(timerRef.current) }
  }, [gs.phase])
  useEffect(() => {
    if (gs.phase === 'explore' || gs.phase === 'triage') {
      degradeRef.current = setInterval(() => { gs.foundCasualties.forEach(casId => dispatch({ type: 'DEGRADE_CASUALTY', payload: { casId } })) }, DEGRADE_INTERVAL)
      return () => clearInterval(degradeRef.current)
    }
  }, [gs.phase, gs.foundCasualties])
  useEffect(() => {
    if (gs.phase === 'triage' && gs.currentCasualty) {
      const cs = gs.casualtyState[gs.currentCasualty], cas = CASUALTIES.find(c => c.id === gs.currentCasualty)
      if (cs && !cs.dead && (cas.correctTag === 'RED' || cs.vitals.status === 'CRITICAL')) {
        heartbeatRef.current = setInterval(() => playHeartbeat(), 1200); return () => clearInterval(heartbeatRef.current)
      }
    }
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
  }, [gs.phase, gs.currentCasualty, gs.casualtyState])
  useEffect(() => { if (gs.errorMsg) { const t = setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 4000); return () => clearTimeout(t) } }, [gs.errorMsg])
  useEffect(() => { if (gs.shakeScreen) { playError(); const t = setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 600); return () => clearTimeout(t) } }, [gs.shakeScreen])
  useEffect(() => { if (gs.timer <= 0 && gs.phase !== 'report' && gs.phase !== 'start') dispatch({ type: 'FINISH_GAME' }) }, [gs.timer, gs.phase])
  useEffect(() => { setXrayMode(false); setShowSources(false) }, [gs.currentCasualty])

  const startSearch = useCallback((hsId) => {
    if (gs.searchingHotspot !== null || gs.searchedHotspots.includes(hsId)) return
    dispatch({ type: 'BEGIN_SEARCH', payload: hsId }); playScan()
    const step = 50, inc = 100 / (SEARCH_DURATION / step); let p = 0
    searchRef.current = setInterval(() => {
      p += inc; dispatch({ type: 'SEARCH_PROGRESS', payload: inc })
      if (p >= 100) { clearInterval(searchRef.current); dispatch({ type: 'FINISH_SEARCH', payload: hsId }); HOTSPOTS[hsId].hasCasualty ? playSuccess() : playError() }
    }, step)
  }, [gs.searchingHotspot, gs.searchedHotspots])

  const handleApplyItem = useCallback((casId, zone) => {
    if (!gs.selectedItem) return
    const item = gs.selectedItem, cas = CASUALTIES.find(c => c.id === casId)
    if (item === 'Recovery Position' || item === 'Remove Wet Clothes') { dispatch({ type: 'APPLY_TREATMENT', payload: { casId, item } }); playSuccess(); return }
    if (cas.treatmentZone && zone !== cas.treatmentZone) { playError(); return }
    dispatch({ type: 'APPLY_TREATMENT', payload: { casId, item } }); playSuccess()
  }, [gs.selectedItem])

  const computeScore = useCallback(() => {
    let triageCorrect = 0, treatmentCorrect = 0, survived = 0, wastedOnBlack = false
    const details = CASUALTIES.map(cas => {
      const cs = gs.casualtyState[cas.id]
      const tagOk = cs?.tag === cas.correctTag; if (tagOk) triageCorrect++
      const treatOk = cas.correctTreatment.length === 0 ? cs?.treatments.length === 0 : cas.correctTreatment.every(t => cs?.treatments.includes(t)); if (treatOk) treatmentCorrect++
      const alive = !cs?.dead; if (alive) survived++
      if (cas.id === 'CAS-5' && cs?.treatments.length > 0) wastedOnBlack = true
      return { cas, tag: cs?.tag || 'NONE', tagCorrect: tagOk, treatments: cs?.treatments || [], treatCorrect: treatOk, alive }
    })
    const n = NUM_PATIENTS
    const total = Math.round((triageCorrect / n) * 30 + (treatmentCorrect / n) * 40 + (survived / n) * 20 + (wastedOnBlack ? 0 : 5) + (gs.timer > 0 ? 5 : 0))
    return { triageCorrect, treatmentCorrect, survived, wastedOnBlack, timeRemaining: gs.timer, total, passed: total >= 60, details }
  }, [gs.casualtyState, gs.timer])

  const scoreRecorded = useRef(false)
  useEffect(() => {
    if (gs.phase === 'report' && !scoreRecorded.current) {
      scoreRecorded.current = true; const r = computeScore()
      ctxDispatch({ type: 'RECORD_SCORE', payload: { key: 'iron-tide', result: { score: r.total, passed: r.passed } } })
    }
  }, [gs.phase])

  /* ═══════════ START SCREEN ═══════════ */
  if (gs.phase === 'start') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: COLORS.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"Courier New",Courier,monospace', color: COLORS.text, overflow: 'hidden' }}>
        {/* Background image */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${SCENE_IMAGES.stormBg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.25, filter: 'brightness(0.6)' }} />
        <RainEffect /><Vignette intensity="normal" /><ScanLine />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'rgba(200,210,255,.12)', animation: 'it-lightning 8s ease-in-out infinite' }} />

        <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', maxWidth: 800, padding: '0 32px' }}>
          <h1 style={{ fontSize: '4.2rem', fontWeight: 900, letterSpacing: '.25em', textTransform: 'uppercase', color: COLORS.red, textShadow: '0 0 40px rgba(220,38,38,.6),0 0 80px rgba(220,38,38,.3)', margin: '0 0 16px', lineHeight: 1.1 }}>
            OPERATION:<br />IRON TIDE
          </h1>
          <div style={{ width: 160, height: 3, background: `linear-gradient(90deg,transparent,${COLORS.red},transparent)`, margin: '0 auto 28px' }} />
          <div style={{ background: 'rgba(0,0,0,.65)', border: `1px solid ${COLORS.red}44`, padding: '24px 28px', borderRadius: 6, marginBottom: 32, fontSize: '1.15rem', lineHeight: 1.8, textAlign: 'left', color: COLORS.amber, backdropFilter: 'blur(4px)' }}>
            <span style={{ color: COLORS.red, fontWeight: 'bold', fontSize: '1.2rem' }}>FLASH // PRIORITY // </span>
            <Typewriter text='FLASH FLOOD — SECTOR 7. MULTIPLE CASUALTIES REPORTED. 8 POTENTIAL VICTIMS. YOU ARE THE ONLY FIRST RESPONDER. SEARCH AND TRIAGE IMMEDIATELY.' speed={28} onDone={() => dispatch({ type: 'SET_TYPEWRITER_DONE' })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 40, fontSize: '1rem', color: COLORS.muted, letterSpacing: '.1em' }}>
            <span>CASUALTIES: <span style={{ color: COLORS.red, fontWeight: 'bold' }}>UP TO 8</span></span>
            <span>TIME: <span style={{ color: COLORS.amber, fontWeight: 'bold' }}>07:00</span></span>
            <span>LOCATIONS: <span style={{ color: COLORS.amber, fontWeight: 'bold' }}>11</span></span>
          </div>
          <button onClick={() => dispatch({ type: 'START_GAME' })} style={{ background: 'transparent', border: `2px solid ${COLORS.red}`, color: COLORS.red, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '.3em', padding: '18px 64px', cursor: 'pointer', fontFamily: '"Courier New",monospace', textTransform: 'uppercase', animation: 'it-deploy-pulse 2s ease-in-out infinite', transition: 'all .2s' }}
            onMouseEnter={e => { e.target.style.background = COLORS.red; e.target.style.color = '#fff' }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = COLORS.red }}
          >DEPLOY</button>
        </div>
      </div>
    )
  }

  /* ═══════════ EXPLORATION PHASE — IMMERSIVE ═══════════ */
  if (gs.phase === 'explore') {
    const vi = gs.timer < 60 ? 'fast' : gs.timer < 120 ? 'normal' : 'none'
    const sceneHs = activeScene !== null ? HOTSPOTS[activeScene] : null
    const sceneSearched = sceneHs ? gs.searchedHotspots.includes(sceneHs.id) : false
    const sceneSearching = sceneHs ? gs.searchingHotspot === sceneHs.id : false
    const sceneFound = sceneSearched && sceneHs?.hasCasualty
    const sceneEmpty = sceneSearched && sceneHs && !sceneHs.hasCasualty

    return (
      <div style={{ position: 'fixed', inset: 0, background: '#050510', fontFamily: '"Courier New",monospace', color: COLORS.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Vignette intensity={vi} />
        {/* HUD */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: 'rgba(0,0,0,.9)', borderBottom: `2px solid ${COLORS.red}33`, zIndex: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 28, fontSize: '1rem', letterSpacing: '.08em' }}>
            <span>CASUALTIES: <span style={{ color: COLORS.green, fontWeight: 'bold' }}>{gs.foundCasualties.length}/{NUM_PATIENTS}</span></span>
            <span>SEARCHED: <span style={{ color: COLORS.blue, fontWeight: 'bold' }}>{gs.searchedHotspots.length}/{HOTSPOTS.length}</span></span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: gs.timer < 60 ? COLORS.red : gs.timer < 120 ? COLORS.amber : COLORS.green, animation: gs.timer < 60 ? 'it-heartbeat 1s ease-in-out infinite' : 'none' }}>
            {formatTime(gs.timer)}
          </div>
        </div>

        {activeScene !== null && sceneHs ? (
          /* ──── SCENE INVESTIGATION VIEW ──── */
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <SceneInvestigation
              hotspot={sceneHs}
              onBack={() => setActiveScene(null)}
              onStartSearch={() => startSearch(sceneHs.id)}
              searching={sceneSearching}
              progress={gs.searchProgress}
              done={sceneSearched}
              found={sceneFound}
            />
            {/* Mini sidebar */}
            <div style={{ width: 220, background: 'rgba(10,15,25,.95)', borderLeft: `1px solid ${COLORS.muted}22`, display: 'flex', flexDirection: 'column', gap: 10, padding: 12, overflowY: 'auto', flexShrink: 0 }}>
              <div style={{ fontSize: '.8rem', color: COLORS.amber, fontWeight: 'bold', letterSpacing: '.08em', borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 6 }}>FOUND</div>
              {gs.foundCasualties.length === 0 && <div style={{ fontSize: '.8rem', color: COLORS.muted, fontStyle: 'italic' }}>No casualties yet...</div>}
              {gs.foundCasualties.map(casId => {
                const cas = CASUALTIES.find(c => c.id === casId)
                return <div key={casId} style={{ fontSize: '.8rem', color: COLORS.text, padding: '4px 0', borderBottom: `1px solid ${COLORS.muted}11` }}>{cas.id}: {cas.name}</div>
              })}
              <div style={{ flex: 1 }} />
              {sceneSearched && (
                <button onClick={() => setActiveScene(null)} style={{ background: 'rgba(59,130,246,.15)', border: `1px solid ${COLORS.blue}44`, color: COLORS.blue, padding: '10px', borderRadius: 5, cursor: 'pointer', fontSize: '.85rem', fontWeight: 'bold', fontFamily: '"Courier New",monospace' }}>
                  NEXT LOCATION →
                </button>
              )}
              {gs.foundCasualties.length > 0 && (
                <button onClick={() => dispatch({ type: 'BEGIN_TRIAGE' })} style={{ background: `linear-gradient(135deg,${COLORS.red},#b91c1c)`, color: '#fff', border: 'none', padding: '10px', borderRadius: 5, fontSize: '.85rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: '"Courier New",monospace' }}>
                  TRIAGE ({gs.foundCasualties.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ──── OVERHEAD MAP VIEW ──── */
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Map area */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {/* Aerial flood background */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${SCENE_IMAGES.playground})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.25) saturate(0.6)', }} />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(10,20,40,0.3) 0%, rgba(5,10,20,0.7) 100%)' }} />
              <RainEffect />

              {/* Map title */}
              <div style={{ position: 'absolute', top: 16, left: 20, zIndex: 10 }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: COLORS.text, textShadow: '0 2px 8px rgba(0,0,0,.8)', letterSpacing: '.1em' }}>SECTOR 7 — DISASTER ZONE</div>
                <div style={{ fontSize: '.85rem', color: COLORS.muted, marginTop: 4, textShadow: '0 1px 4px rgba(0,0,0,.8)' }}>Click a location to investigate. Use your flashlight to search for survivors.</div>
              </div>

              {/* Location markers — arranged on the map */}
              <div style={{ position: 'absolute', inset: 60, display: 'flex', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center', gap: 12, padding: '40px 20px' }}>
                {HOTSPOTS.map(hs => {
                  const searched = gs.searchedHotspots.includes(hs.id)
                  const found = searched && hs.hasCasualty
                  const empty = searched && !hs.hasCasualty
                  return (
                    <div key={hs.id}
                      onClick={() => !searched && setActiveScene(hs.id)}
                      style={{
                        width: 185, position: 'relative', borderRadius: 8, overflow: 'hidden',
                        border: found ? `2px solid ${COLORS.green}` : empty ? `2px solid ${COLORS.muted}33` : `2px solid ${COLORS.red}55`,
                        cursor: searched ? 'default' : 'pointer',
                        opacity: empty ? 0.4 : 1,
                        transition: 'all .3s, transform .2s',
                        boxShadow: found ? '0 0 20px rgba(34,197,94,.25)' : !searched ? '0 0 15px rgba(220,38,38,.15)' : 'none',
                        transform: searched ? 'scale(0.95)' : 'scale(1)',
                      }}
                      onMouseEnter={e => { if (!searched) e.currentTarget.style.transform = 'scale(1.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = searched ? 'scale(0.95)' : 'scale(1)' }}
                    >
                      {/* Thumbnail image */}
                      <div style={{
                        height: 80, backgroundImage: `url(${hs.img})`, backgroundSize: 'cover', backgroundPosition: 'center',
                        filter: empty ? 'grayscale(1) brightness(0.3)' : found ? 'brightness(0.5)' : 'brightness(0.45)',
                      }} />
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,.6) 100%)' }} />

                      {/* Status badge */}
                      {found && <div style={{ position: 'absolute', top: 6, right: 6, background: COLORS.red, color: '#fff', padding: '2px 8px', borderRadius: 3, fontSize: '.65rem', fontWeight: 'bold' }}>FOUND</div>}
                      {empty && <div style={{ position: 'absolute', top: 6, right: 6, background: COLORS.muted, color: '#fff', padding: '2px 8px', borderRadius: 3, fontSize: '.65rem', fontWeight: 'bold' }}>CLEAR</div>}
                      {!searched && <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(220,38,38,.3)', border: `1px solid ${COLORS.red}66`, color: COLORS.red, padding: '2px 8px', borderRadius: 3, fontSize: '.65rem', fontWeight: 'bold', animation: 'it-pulse-glow 2s ease-in-out infinite' }}>?</div>}

                      {/* Label */}
                      <div style={{ padding: '8px 10px', background: 'rgba(10,15,25,.95)' }}>
                        <div style={{ fontSize: '.82rem', fontWeight: 'bold', color: searched ? COLORS.muted : COLORS.text }}>{hs.label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ width: 250, background: 'rgba(10,15,25,.95)', borderLeft: `1px solid ${COLORS.muted}22`, display: 'flex', flexDirection: 'column', gap: 12, padding: 16, flexShrink: 0 }}>
              <div style={{ fontSize: '.9rem', color: COLORS.amber, fontWeight: 'bold', letterSpacing: '.08em', borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 8 }}>FOUND CASUALTIES</div>
              {gs.foundCasualties.length === 0 && <div style={{ fontSize: '.85rem', color: COLORS.muted, fontStyle: 'italic' }}>Investigate locations to find survivors...</div>}
              {gs.foundCasualties.map(casId => {
                const cas = CASUALTIES.find(c => c.id === casId), cs = gs.casualtyState[casId]
                return <div key={casId} style={{ padding: '8px 10px', borderRadius: 4, background: cs?.dead ? 'rgba(100,100,100,.15)' : 'rgba(220,38,38,.08)', border: `1px solid ${cs?.dead ? COLORS.muted + '33' : COLORS.red + '33'}`, fontSize: '.85rem' }}>
                  <div style={{ color: cs?.dead ? COLORS.muted : COLORS.text, fontWeight: 'bold' }}>{cas.id}: {cas.name}</div>
                  <div style={{ color: COLORS.muted, fontSize: '.7rem', marginTop: 2 }}>{cas.location}{cs?.dead ? ' — DECEASED' : ''}</div>
                </div>
              })}
              <div style={{ flex: 1 }} />
              <div style={{ background: 'rgba(17,24,39,.8)', border: `1px solid ${COLORS.muted}22`, borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: '.8rem', color: COLORS.amber, fontWeight: 'bold', marginBottom: 6 }}>SUPPLIES</div>
                {Object.entries(gs.supplies).map(([name, qty]) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: qty > 0 ? COLORS.text : COLORS.muted, padding: '2px 0' }}><span>{name}</span><span style={{ color: qty > 0 ? COLORS.green : COLORS.red, fontWeight: 'bold' }}>{qty}</span></div>)}
              </div>
              {gs.foundCasualties.length > 0 && (
                <button onClick={() => dispatch({ type: 'BEGIN_TRIAGE' })} style={{ background: `linear-gradient(135deg,${COLORS.red},#b91c1c)`, color: '#fff', border: 'none', padding: '14px 0', borderRadius: 6, fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '.12em', fontFamily: '"Courier New",monospace', boxShadow: '0 4px 20px rgba(220,38,38,.3)' }}>
                  BEGIN TRIAGE ({gs.foundCasualties.length})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ═══════════ TRIAGE PHASE ═══════════ */
  if (gs.phase === 'triage') {
    const vi = gs.timer < 60 ? 'fast' : gs.timer < 120 ? 'normal' : 'none'

    /* ---- Casualty list ---- */
    if (!gs.currentCasualty) {
      return (
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(180deg,#060610 0%,#0a1020 50%,#080d18 100%)', fontFamily: '"Courier New",monospace', color: COLORS.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Vignette intensity={vi} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: 'rgba(0,0,0,.85)', borderBottom: `2px solid ${COLORS.red}33`, zIndex: 10 }}>
            <div style={{ fontSize: '1.05rem', letterSpacing: '.08em' }}>TRIAGE MODE — <span style={{ color: COLORS.amber, fontWeight: 'bold' }}>SELECT CASUALTY</span></div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: gs.timer < 60 ? COLORS.red : gs.timer < 120 ? COLORS.amber : COLORS.green, animation: gs.timer < 60 ? 'it-heartbeat 1s ease-in-out infinite' : 'none' }}>{formatTime(gs.timer)}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', padding: 24, gap: 20, position: 'relative', zIndex: 5 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
              {gs.foundCasualties.map(casId => {
                const cas = CASUALTIES.find(c => c.id === casId), cs = gs.casualtyState[casId]
                return (
                  <button key={casId} onClick={() => dispatch({ type: 'SELECT_CASUALTY', payload: casId })} style={{
                    display: 'flex', alignItems: 'center', gap: 16, background: cs.dead ? 'rgba(50,50,50,.3)' : 'rgba(17,24,39,.9)',
                    border: `1px solid ${cs.dead ? COLORS.muted + '33' : cs.tag ? tagColor(cs.tag) + '66' : COLORS.red + '33'}`,
                    borderRadius: 6, padding: '14px 18px', cursor: 'pointer', textAlign: 'left', fontFamily: '"Courier New",monospace', color: COLORS.text, transition: 'all .2s',
                    animation: !cs.dead && !cs.treated && cas.degradeRate > 0 ? 'it-pulse-glow 3s ease-in-out infinite' : 'none', opacity: cs.dead ? 0.5 : 1,
                  }}>
                    <div style={{ width: 46, height: 46, borderRadius: 6, flexShrink: 0, background: cs.tag ? tagColor(cs.tag) : 'rgba(100,116,139,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 'bold', color: '#fff' }}>{cs.tag || '???'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{cas.id}: {cas.name}</div>
                      <div style={{ fontSize: '.85rem', color: COLORS.muted, marginTop: 2 }}>{cas.location}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '.9rem' }}>
                      <div style={{ color: cs.dead ? COLORS.muted : cs.vitals.hr < 50 ? COLORS.red : COLORS.green }}>HR: {cs.dead ? '---' : Math.round(cs.vitals.hr)}</div>
                      <div style={{ color: cs.dead ? COLORS.muted : cs.vitals.status === 'CRITICAL' ? COLORS.red : cs.vitals.status === 'STABLE' ? COLORS.green : COLORS.amber, fontWeight: 'bold', marginTop: 2 }}>{cs.vitals.status}</div>
                    </div>
                    <div style={{ fontSize: '.75rem', color: cs.treated ? COLORS.green : COLORS.amber, width: 68, textAlign: 'center', fontWeight: 'bold' }}>{cs.treated ? 'TREATED' : cs.treatments.length > 0 ? 'PARTIAL' : 'UNTREATED'}</div>
                  </button>
                )
              })}
            </div>
            <div style={{ width: 250, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'rgba(17,24,39,.9)', border: `1px solid ${COLORS.muted}22`, borderRadius: 6, padding: 16 }}>
                <div style={{ fontSize: '.9rem', color: COLORS.amber, letterSpacing: '.1em', marginBottom: 8, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 8, fontWeight: 'bold' }}>MED KIT</div>
                {Object.entries(gs.supplies).map(([n, q]) => <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: q > 0 ? COLORS.text : COLORS.muted, padding: '2px 0', textDecoration: q <= 0 ? 'line-through' : 'none' }}><span>{n}</span><span style={{ color: q > 0 ? COLORS.green : COLORS.red, fontWeight: 'bold' }}>{q}</span></div>)}
              </div>
              <button onClick={() => dispatch({ type: 'FINISH_GAME' })} style={{ background: `linear-gradient(135deg,${COLORS.amber},#d97706)`, color: '#000', border: 'none', padding: '14px 0', borderRadius: 6, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '.12em', fontFamily: '"Courier New",monospace' }}>FINISH TRIAGE</button>
              <div style={{ background: 'rgba(0,0,0,.5)', borderRadius: 6, padding: 14, fontSize: '.85rem', color: COLORS.muted, lineHeight: 1.7 }}>
                <div style={{ color: COLORS.amber, marginBottom: 6, fontWeight: 'bold' }}>PROCEDURE:</div>
                1. Select a casualty<br />2. Use medical tools to examine<br />3. Toggle X-RAY for bones<br />4. Rotate 3D body to inspect<br />5. Assign triage tag<br />6. Apply treatments<br />7. Check ? for official sources
              </div>
            </div>
          </div>
        </div>
      )
    }

    /* ---- Individual examination ---- */
    const cas = CASUALTIES.find(c => c.id === gs.currentCasualty), cs = gs.casualtyState[gs.currentCasualty]
    const handleZoneClick = (zone) => { if (gs.selectedItem) handleApplyItem(gs.currentCasualty, zone) }

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(180deg,#050510 0%,#0a0f1a 50%,#060810 100%)', fontFamily: '"Courier New",monospace', color: COLORS.text, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: gs.shakeScreen ? 'it-shake .4s ease-in-out' : 'none' }}>
        <Vignette intensity={gs.timer < 60 ? 'fast' : gs.timer < 120 ? 'normal' : 'none'} />
        {/* HUD */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: 'rgba(0,0,0,.85)', borderBottom: `2px solid ${COLORS.red}33`, zIndex: 10 }}>
          <button onClick={() => dispatch({ type: 'BACK_TO_LIST' })} style={{ background: 'rgba(255,255,255,.05)', border: `1px solid ${COLORS.muted}44`, color: COLORS.text, padding: '6px 18px', borderRadius: 4, cursor: 'pointer', fontSize: '.95rem', fontFamily: '"Courier New",monospace' }}>&lt; BACK</button>
          <div style={{ fontSize: '1.1rem', color: COLORS.amber, fontWeight: 'bold' }}>{cas.id}: {cas.name} — <span style={{ color: COLORS.muted, fontWeight: 'normal' }}>{cas.location}</span></div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: gs.timer < 60 ? COLORS.red : gs.timer < 120 ? COLORS.amber : COLORS.green, animation: gs.timer < 60 ? 'it-heartbeat 1s ease-in-out infinite' : 'none' }}>{formatTime(gs.timer)}</div>
        </div>
        {gs.errorMsg && <div style={{ background: 'rgba(220,38,38,.15)', border: `1px solid ${COLORS.red}`, padding: '12px 24px', fontSize: '1rem', color: COLORS.red, textAlign: 'center', zIndex: 10, animation: 'it-fade-in .3s ease', fontWeight: 'bold' }}>{gs.errorMsg}</div>}

        <div style={{ flex: 1, display: 'flex', padding: 16, gap: 16, position: 'relative', zIndex: 5, overflow: 'hidden' }}>
          {/* LEFT: Vitals + 3D Body */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Vitals */}
            <div style={{ display: 'flex', gap: 16, background: 'rgba(17,24,39,.9)', border: `1px solid ${COLORS.muted}22`, borderRadius: 6, padding: '12px 18px' }}>
              {[
                { l: 'HR', v: cs.dead ? '---' : Math.round(cs.vitals.hr), u: 'BPM', c: cs.dead ? COLORS.muted : cs.vitals.hr < 50 ? COLORS.red : cs.vitals.hr > 120 ? COLORS.amber : COLORS.green, anim: !cs.dead },
                { l: 'RR', v: cs.dead ? '---' : Math.round(cs.vitals.rr), u: '/min', c: cs.dead ? COLORS.muted : cs.vitals.rr < 10 ? COLORS.red : COLORS.green },
                { l: 'SpO2', v: cs.dead ? '---' : Math.round(cs.vitals.spo2), u: '%', c: cs.dead ? COLORS.muted : cs.vitals.spo2 < 85 ? COLORS.red : cs.vitals.spo2 < 92 ? COLORS.amber : COLORS.green },
                { l: 'SKIN', v: cs.vitals.skin, u: '', c: cs.dead ? COLORS.muted : COLORS.text, txt: true },
                { l: 'STATUS', v: cs.vitals.status, u: '', c: cs.vitals.status === 'DECEASED' ? COLORS.muted : cs.vitals.status === 'CRITICAL' ? COLORS.red : cs.vitals.status === 'STABLE' ? COLORS.green : COLORS.amber, txt: true },
              ].map((x, i) => <div key={i} style={{ textAlign: 'center', flex: x.txt ? 1.2 : 1 }}>
                <div style={{ fontSize: '.75rem', color: COLORS.muted, letterSpacing: '.1em', fontWeight: 'bold' }}>{x.l}</div>
                <div style={{ fontSize: x.txt ? '1rem' : '2rem', fontWeight: 'bold', color: x.c, marginTop: x.txt ? 4 : 0, animation: x.anim ? 'it-heartbeat 1.2s ease-in-out infinite' : 'none' }}>{x.v}</div>
                {x.u && <div style={{ fontSize: '.7rem', color: COLORS.muted }}>{x.u}</div>}
              </div>)}
            </div>

            {/* 3D Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(17,24,39,.9)', border: `1px solid ${xrayMode ? COLORS.blue + '44' : COLORS.muted + '22'}`, borderRadius: 6, overflow: 'hidden', position: 'relative', transition: 'border-color .5s', boxShadow: xrayMode ? '0 0 30px rgba(59,130,246,.15)' : '0 2px 15px rgba(0,0,0,.3)' }}>
              {cs.dead && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, fontSize: '2.5rem', fontWeight: 'bold', color: COLORS.muted, letterSpacing: '.2em', background: 'rgba(0,0,0,.5)', pointerEvents: 'none' }}>DECEASED</div>}
              <div style={{ flex: 1, opacity: cs.dead ? 0.3 : 1, transition: 'opacity 1s' }}>
                <HumanBody3D casualtyId={gs.currentCasualty} casualtyState={cs} selectedItem={gs.selectedItem} onZoneClick={handleZoneClick} xrayMode={xrayMode} />
              </div>
              {/* Controls */}
              <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
                <button onClick={() => { setXrayMode(m => !m); playXray() }} style={{ pointerEvents: 'auto', background: xrayMode ? 'rgba(59,130,246,.3)' : 'rgba(0,0,0,.6)', border: `2px solid ${xrayMode ? COLORS.blue : COLORS.muted + '66'}`, color: xrayMode ? COLORS.blue : COLORS.text, padding: '10px 22px', borderRadius: 6, cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', fontFamily: '"Courier New",monospace', letterSpacing: '.15em', animation: xrayMode ? 'it-pulse-glow-blue 2s ease-in-out infinite' : 'none', backdropFilter: 'blur(4px)' }}>
                  {xrayMode ? 'X-RAY: ON' : 'X-RAY: OFF'}
                </button>
                <div style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,.6)', padding: '8px 16px', borderRadius: 4, fontSize: '.8rem', color: COLORS.muted, backdropFilter: 'blur(4px)' }}>
                  {cas.id === 'CAS-4' ? 'CHILD' : 'ADULT'} — Drag to rotate
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', position: 'relative' }}>
            {/* Source citation ? button */}
            <button onClick={() => setShowSources(s => !s)} style={{
              position: 'absolute', top: 0, right: 0, zIndex: 40, width: 36, height: 36, borderRadius: '50%',
              background: showSources ? COLORS.blue : 'rgba(59,130,246,.15)', border: `2px solid ${COLORS.blue}`,
              color: showSources ? '#fff' : COLORS.blue, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'serif',
              boxShadow: '0 2px 10px rgba(0,0,0,.3)', transition: 'all .2s',
            }}>?</button>

            {/* Sources panel overlay */}
            {showSources && <SourcesPanel casId={gs.currentCasualty} onClose={() => setShowSources(false)} />}

            {/* Examination */}
            <div style={{ background: 'rgba(17,24,39,.9)', border: `1px solid ${COLORS.muted}22`, borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: '.95rem', color: COLORS.amber, letterSpacing: '.1em', marginBottom: 10, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 8, fontWeight: 'bold' }}>MEDICAL EXAMINATION</div>
              {[
                { key: 'breathing', label: 'STETHOSCOPE — BREATHING', result: cas.breathingResult },
                { key: 'pulse', label: 'PULSE OXIMETER — PULSE', result: cas.pulseResult },
                { key: 'wounds', label: 'PHYSICAL EXAM — WOUNDS', result: cas.woundsResult },
                { key: 'pupils', label: 'PENLIGHT — PUPILS', result: cas.pupilResult },
                { key: 'temperature', label: 'THERMOMETER — TEMP', result: cas.temperatureResult },
                { key: 'bp', label: 'BP CUFF — BLOOD PRESSURE', result: cas.bpResult },
              ].map(({ key, label, result }) => (
                <button key={key} onClick={() => dispatch({ type: 'CHECK_VITALS', payload: { casId: cas.id, checkType: key } })} style={{
                  width: '100%', textAlign: 'left', padding: '9px 12px', marginBottom: 5,
                  background: cs.checks.includes(key) ? 'rgba(34,197,94,.1)' : 'rgba(255,255,255,.03)',
                  border: `1px solid ${cs.checks.includes(key) ? COLORS.green + '44' : COLORS.muted + '22'}`,
                  borderRadius: 5, cursor: 'pointer', color: COLORS.text, fontFamily: '"Courier New",monospace', fontSize: '.9rem',
                  animation: !cs.checks.includes(key) && ['breathing', 'pulse', 'wounds'].includes(key) ? 'it-equipment-glow 3s ease-in-out infinite' : 'none',
                }}>
                  <span style={{ color: COLORS.blue, fontWeight: 'bold' }}>{label}</span>
                  {cs.checks.includes(key) && <div style={{ fontSize: '.85rem', color: COLORS.muted, marginTop: 5, lineHeight: 1.5 }}>{result}</div>}
                </button>
              ))}
            </div>

            {/* Triage tag */}
            <div style={{ background: 'rgba(17,24,39,.9)', border: `1px solid ${COLORS.muted}22`, borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: '.95rem', color: COLORS.amber, letterSpacing: '.1em', marginBottom: 10, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 8, fontWeight: 'bold' }}>TRIAGE TAG</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {TRIAGE_TAGS.map(tag => <button key={tag} onClick={() => dispatch({ type: 'SET_TAG', payload: { casId: cas.id, tag } })} style={{
                  flex: 1, padding: '10px 4px', borderRadius: 5,
                  border: cs.tag === tag ? '2px solid #fff' : `1px solid ${tagColor(tag)}66`,
                  background: cs.tag === tag ? tagColor(tag) : 'transparent',
                  color: cs.tag === tag ? '#fff' : tagColor(tag),
                  fontSize: '.85rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: '"Courier New",monospace',
                  boxShadow: cs.tag === tag ? `0 0 15px ${tagColor(tag)}44` : 'none',
                }}>{tag}</button>)}
              </div>
              {cs.tag && <div style={{ marginTop: 8, fontSize: '.85rem', color: COLORS.muted, textAlign: 'center' }}>Tagged: <span style={{ color: tagColor(cs.tag), fontWeight: 'bold' }}>{cs.tag}</span></div>}
            </div>

            {/* Med Kit */}
            <div style={{ background: 'rgba(17,24,39,.9)', border: `1px solid ${COLORS.muted}22`, borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: '.95rem', color: COLORS.amber, letterSpacing: '.1em', marginBottom: 10, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 8, fontWeight: 'bold' }}>
                MED KIT {gs.selectedItem && <span style={{ color: COLORS.green }}>— {gs.selectedItem}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(gs.supplies).map(([name, qty]) => <button key={name} onClick={() => { if (qty > 0 && !cs.dead) dispatch({ type: 'SELECT_ITEM', payload: name }) }} disabled={qty <= 0 || cs.dead} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 5,
                  background: gs.selectedItem === name ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.02)',
                  border: gs.selectedItem === name ? `2px solid ${COLORS.green}` : `1px solid ${COLORS.muted}22`,
                  color: qty > 0 ? COLORS.text : COLORS.muted, cursor: qty > 0 && !cs.dead ? 'pointer' : 'not-allowed',
                  fontFamily: '"Courier New",monospace', fontSize: '.85rem', textDecoration: qty <= 0 ? 'line-through' : 'none', opacity: qty <= 0 ? 0.4 : 1,
                }}><span>{name}</span><span style={{ color: qty > 0 ? COLORS.green : COLORS.red, fontWeight: 'bold' }}>{qty}</span></button>)}
              </div>
              {gs.selectedItem && <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: 8, fontSize: '.8rem', color: COLORS.green, background: 'rgba(34,197,94,.08)', borderRadius: 4, border: `1px solid ${COLORS.green}33`, textAlign: 'center' }}>Click body zone to apply</div>
                <button onClick={() => dispatch({ type: 'DESELECT_ITEM' })} style={{ padding: '8px 14px', background: 'rgba(220,38,38,.1)', border: `1px solid ${COLORS.red}44`, borderRadius: 4, color: COLORS.red, fontSize: '.8rem', cursor: 'pointer', fontFamily: '"Courier New",monospace', fontWeight: 'bold' }}>DROP</button>
              </div>}
            </div>

            {/* Special actions */}
            {cas.id === 'CAS-1' && cs.treatments.includes('Rescue Breathing Mask') && !cs.treatments.includes('Recovery Position') && !cs.dead && (
              <button onClick={() => { dispatch({ type: 'APPLY_TREATMENT', payload: { casId: cas.id, item: 'Recovery Position' } }); playSuccess() }} style={{ background: `linear-gradient(135deg,${COLORS.blue},#2563eb)`, color: '#fff', border: 'none', padding: '12px 0', borderRadius: 6, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '.1em', fontFamily: '"Courier New",monospace', animation: 'it-pulse-glow-green 2s ease-in-out infinite' }}>RECOVERY POSITION</button>
            )}
            {cas.id === 'CAS-4' && !cs.treatments.includes('Remove Wet Clothes') && !cs.dead && (
              <button onClick={() => { dispatch({ type: 'APPLY_TREATMENT', payload: { casId: cas.id, item: 'Remove Wet Clothes' } }); playSuccess() }} style={{ background: `linear-gradient(135deg,${COLORS.blue},#2563eb)`, color: '#fff', border: 'none', padding: '12px 0', borderRadius: 6, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: '"Courier New",monospace' }}>REMOVE WET CLOTHING</button>
            )}

            {/* Applied treatments */}
            {cs.treatments.length > 0 && (
              <div style={{ background: 'rgba(34,197,94,.06)', border: `1px solid ${COLORS.green}22`, borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: '.85rem', color: COLORS.green, letterSpacing: '.08em', marginBottom: 6, fontWeight: 'bold' }}>APPLIED</div>
                {cs.treatments.map((t, i) => <div key={i} style={{ fontSize: '.85rem', color: COLORS.text, padding: '2px 0' }}>+ {t}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════ REPORT ═══════════ */
  if (gs.phase === 'report') {
    const r = computeScore()
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(180deg,#050510 0%,#0a0f1a 50%,#060810 100%)', fontFamily: '"Courier New",monospace', color: COLORS.text, overflow: 'auto' }}>
        <Vignette intensity="none" />
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 28px', position: 'relative', zIndex: 5 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: '.95rem', color: COLORS.red, letterSpacing: '.2em', marginBottom: 10, fontWeight: 'bold' }}>CLASSIFIED // AFTER-ACTION REPORT</div>
            <h1 style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '.15em', color: COLORS.text, margin: 0 }}>OPERATION: IRON TIDE</h1>
            <div style={{ width: 140, height: 3, background: `linear-gradient(90deg,transparent,${COLORS.red},transparent)`, margin: '14px auto' }} />
            <div style={{ fontSize: '1rem', color: COLORS.muted }}>DEBRIEF — SECTOR 7 FLASH FLOOD — {NUM_PATIENTS} CASUALTIES</div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { l: 'TRIAGE', v: `${r.triageCorrect}/${NUM_PATIENTS}`, c: r.triageCorrect >= 6 ? COLORS.green : r.triageCorrect >= 4 ? COLORS.amber : COLORS.red },
              { l: 'TREATMENT', v: `${r.treatmentCorrect}/${NUM_PATIENTS}`, c: r.treatmentCorrect >= 6 ? COLORS.green : r.treatmentCorrect >= 4 ? COLORS.amber : COLORS.red },
              { l: 'SURVIVED', v: `${r.survived}/${NUM_PATIENTS}`, c: r.survived >= 6 ? COLORS.green : r.survived >= 4 ? COLORS.amber : COLORS.red },
              { l: 'TIME LEFT', v: formatTime(r.timeRemaining), c: r.timeRemaining > 120 ? COLORS.green : r.timeRemaining > 0 ? COLORS.amber : COLORS.red },
              { l: 'WASTED', v: r.wastedOnBlack ? 'YES' : 'NO', c: r.wastedOnBlack ? COLORS.red : COLORS.green },
            ].map((s, i) => <div key={i} style={{ background: 'rgba(17,24,39,.9)', border: `1px solid ${COLORS.muted}22`, borderRadius: 6, padding: '14px 20px', textAlign: 'center', minWidth: 120 }}>
              <div style={{ fontSize: '.75rem', color: COLORS.muted, letterSpacing: '.1em', marginBottom: 6, fontWeight: 'bold' }}>{s.l}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: s.c }}>{s.v}</div>
            </div>)}
          </div>

          {/* Overall score */}
          <div style={{ textAlign: 'center', marginBottom: 36, padding: '24px 0', background: 'rgba(17,24,39,.9)', borderRadius: 8, border: `1px solid ${r.passed ? COLORS.green : COLORS.red}44` }}>
            <div style={{ fontSize: '.95rem', color: COLORS.muted, letterSpacing: '.15em', marginBottom: 10, fontWeight: 'bold' }}>OVERALL SCORE</div>
            <div style={{ fontSize: '4.5rem', fontWeight: 900, color: r.total >= 80 ? COLORS.green : r.total >= 60 ? COLORS.amber : COLORS.red }}>{r.total}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', letterSpacing: '.2em', color: r.passed ? COLORS.green : COLORS.red, marginTop: 6 }}>
              {r.total >= 90 ? 'EXEMPLARY PERFORMANCE' : r.total >= 80 ? 'MISSION SUCCESS' : r.total >= 60 ? 'PASSED — NEEDS IMPROVEMENT' : 'MISSION FAILURE'}
            </div>
          </div>

          {/* Per-casualty breakdown */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: '1.1rem', color: COLORS.amber, letterSpacing: '.15em', marginBottom: 20, borderBottom: `1px solid ${COLORS.muted}22`, paddingBottom: 10, fontWeight: 'bold' }}>CASUALTY-BY-CASUALTY DEBRIEF</div>
            {r.details.map((d, i) => (
              <div key={i} style={{ background: 'rgba(17,24,39,.9)', border: `1px solid ${COLORS.muted}22`, borderRadius: 6, padding: 18, marginBottom: 12, animation: 'it-fade-in .5s ease forwards', animationDelay: `${i * 0.1}s`, opacity: 0, borderLeft: `4px solid ${tagColor(d.cas.correctTag)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{d.cas.id}: {d.cas.name}</div>
                    <div style={{ fontSize: '.85rem', color: COLORS.muted, marginTop: 2 }}>{d.cas.location}</div>
                  </div>
                  <div style={{ fontSize: '.9rem', fontWeight: 'bold', color: d.alive || d.cas.correctTag === 'BLACK' ? COLORS.green : COLORS.red }}>
                    {d.cas.correctTag === 'BLACK' ? 'EXPECTANT' : d.alive ? 'SURVIVED' : 'DIED'}
                  </div>
                </div>
                <div style={{ fontSize: '.9rem', marginBottom: 8 }}>
                  <span style={{ color: COLORS.muted }}>Tag: </span>
                  <span style={{ color: d.tagCorrect ? COLORS.green : COLORS.red, fontWeight: 'bold' }}>{d.tag} {d.tagCorrect ? '[CORRECT]' : `[WRONG — ${d.cas.correctTag}]`}</span>
                </div>
                <div style={{ fontSize: '.9rem', marginBottom: 10 }}>
                  <span style={{ color: COLORS.muted }}>Treatment: </span>
                  <span style={{ color: d.treatCorrect ? COLORS.green : COLORS.amber }}>
                    {d.treatments.length === 0 ? 'None' : d.treatments.join(', ')}
                    {d.treatCorrect ? ' [CORRECT]' : ` [NEEDED: ${d.cas.correctTreatment.length === 0 ? 'None' : d.cas.correctTreatment.join(', ')}]`}
                  </span>
                </div>
                <div style={{ background: 'rgba(59,130,246,.06)', border: `1px solid ${COLORS.blue}22`, borderRadius: 5, padding: '10px 12px', fontSize: '.85rem', color: COLORS.blue, lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 'bold' }}>MEDICAL NOTES: </span>{d.cas.educational}
                </div>
                {/* Source references for this patient */}
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(PATIENT_SOURCES[d.cas.id] || []).map((sk, j) => {
                    const src = SOURCES[sk]
                    return src ? <a key={j} href={src.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.7rem', color: COLORS.blue, background: 'rgba(59,130,246,.08)', padding: '2px 8px', borderRadius: 3, textDecoration: 'none', border: `1px solid ${COLORS.blue}22` }}>{src.org} ↗</a> : null
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', paddingBottom: 48 }}>
            <button onClick={() => { scoreRecorded.current = false; dispatch({ type: 'START_GAME' }) }} style={{ background: `linear-gradient(135deg,${COLORS.red},#b91c1c)`, color: '#fff', border: 'none', padding: '16px 48px', borderRadius: 6, fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '.15em', fontFamily: '"Courier New",monospace' }}>REDEPLOY</button>
            <button onClick={() => ctxDispatch({ type: 'BACK_TO_MENU' })} style={{ background: 'transparent', color: COLORS.muted, border: `1px solid ${COLORS.muted}44`, padding: '16px 48px', borderRadius: 6, fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '.15em', fontFamily: '"Courier New",monospace' }}
              onMouseEnter={e => { e.target.style.borderColor = COLORS.text; e.target.style.color = COLORS.text }}
              onMouseLeave={e => { e.target.style.borderColor = COLORS.muted + '44'; e.target.style.color = COLORS.muted }}
            >RETURN TO BASE</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
