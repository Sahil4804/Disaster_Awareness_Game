/**
 * Module 6 — First Aid Triage (START Protocol)
 *
 * Two-phase educational puzzle:
 *   Phase 1: Triage — Assign 10 flood-aftermath patients to START categories
 *   Phase 2: Treatment — Apply correct med-kit items to each treatable patient
 *
 * All inline CSS. No external dependencies beyond React.
 */
import { useState, useReducer, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext'

/* ─── Color palette ──────────────────────────────────────────────────────── */
const C = {
  bg:        '#1e1e2e',
  card:      '#2a2a3e',
  red:       '#ff4757',
  yellow:    '#ffa502',
  green:     '#2ed573',
  black:     '#57606f',
  text:      '#f1f2f6',
  secondary: '#a4b0be',
  border:    'rgba(255,255,255,0.08)',
  font:      "system-ui, -apple-system, sans-serif",
}

/* ─── Patient definitions ────────────────────────────────────────────────── */
const PATIENTS = [
  {
    id: 'PT-1', name: 'Near-Drowning Victim', trueCategory: 'RED',
    symptoms: ['Unconscious', 'Faint pulse detected', 'Water in lungs — gurgling sounds', 'Cyanotic (blue) lips'],
    injuryZone: 'chest',
    correctTreatment: ['rescueMask', 'mylarBlanket'],
    treatmentSlotCount: 2,
    treatmentExplanation: 'Rescue breathing clears water from lungs and restores oxygen. Mylar blanket prevents hypothermia in a wet, unconscious patient.',
  },
  {
    id: 'PT-2', name: 'Arterial Debris Cut', trueCategory: 'RED',
    symptoms: ['Deep laceration on right thigh', 'Bright red blood SPURTING rhythmically', 'Patient pale and confused', 'Rapid weak pulse'],
    injuryZone: 'rightLeg',
    correctTreatment: ['tourniquet'],
    treatmentSlotCount: 1,
    treatmentExplanation: 'Arterial bleeding kills in minutes. A tourniquet applied HIGH and TIGHT above the wound is the only field intervention that stops arterial hemorrhage.',
  },
  {
    id: 'PT-3', name: 'Crush Syndrome', trueCategory: 'RED',
    symptoms: ['Right leg trapped under concrete slab for 4+ hours', 'Leg is swollen and discolored', 'Patient alert but in severe pain', 'Dark urine output'],
    injuryZone: 'rightLeg',
    correctTreatment: ['tourniquet', 'cleanWater'],
    treatmentSlotCount: 2,
    treatmentExplanation: 'CRITICAL: Tourniquet MUST be applied BEFORE lifting debris. Crushed muscle releases lethal potassium and myoglobin — a "toxic wave" that causes cardiac arrest. IV fluids (clean water) dilute toxins.',
  },
  {
    id: 'PT-4', name: 'Severe Asthma Attack', trueCategory: 'RED',
    symptoms: ['Severe wheezing and gasping', 'Cannot complete sentences', 'Blue lips (cyanosis)', 'Using accessory muscles to breathe'],
    injuryZone: 'chest',
    correctTreatment: ['inhaler'],
    treatmentSlotCount: 1,
    treatmentExplanation: 'Albuterol is a bronchodilator — it relaxes the smooth muscle of the airways. Without it, severe bronchospasm leads to respiratory arrest.',
  },
  {
    id: 'PT-5', name: 'Snakebite Victim', trueCategory: 'YELLOW',
    symptoms: ['Two puncture wounds on left calf', 'Rapidly spreading swelling', 'Severe burning pain', 'Patient anxious but stable vitals'],
    injuryZone: 'leftLeg',
    correctTreatment: ['cleanWater', 'splintTape'],
    treatmentSlotCount: 2,
    trapItems: ['tourniquet'],
    trapFeedback: 'NEVER tourniquet a snakebite! It traps venom in the limb, causing tissue necrosis and potential amputation. Immobilize the limb with a splint to slow lymphatic spread.',
    treatmentExplanation: 'Clean the wound with water, then IMMOBILIZE the limb (splint) to reduce lymphatic flow. Keep the bite below heart level. Tourniquets are contraindicated.',
  },
  {
    id: 'PT-6', name: 'Diabetic Emergency', trueCategory: 'YELLOW',
    symptoms: ['Profuse sweating', 'Hands shaking uncontrollably', 'Confused and slurring words', 'Lost insulin supply in the flood'],
    injuryZone: 'head',
    correctTreatment: ['glucose'],
    treatmentSlotCount: 1,
    treatmentExplanation: 'Hypoglycemia (low blood sugar) can cause seizures, coma, and death. Oral glucose is the fastest field treatment. If unconscious, do NOT give oral fluids — aspiration risk.',
  },
  {
    id: 'PT-7', name: 'Closed Forearm Fracture', trueCategory: 'YELLOW',
    symptoms: ['Visible deformity of left forearm', 'Extreme pain and swelling', 'Good radial pulse in hand', 'Can wiggle fingers'],
    injuryZone: 'leftArm',
    correctTreatment: ['splintTape'],
    treatmentSlotCount: 1,
    treatmentExplanation: 'A closed fracture with good distal pulse is stable. Splint in the position found — do NOT try to straighten it. Check circulation (pulse, sensation) after splinting.',
  },
  {
    id: 'PT-8', name: 'Hypothermia Patient', trueCategory: 'GREEN',
    symptoms: ['Slurred speech', 'Violently shivering', 'Soaking wet clothes', 'Stumbling gait but ambulatory'],
    injuryZone: 'torso',
    correctTreatment: ['dryClothes', 'mylarBlanket'],
    treatmentSlotCount: 2,
    treatmentExplanation: 'Wet clothes cause evaporative heat loss 25x faster than dry. Remove wet layers FIRST, then wrap in Mylar blanket to trap radiant body heat.',
  },
  {
    id: 'PT-9', name: 'Dysentery / Cholera', trueCategory: 'GREEN',
    symptoms: ['Severe watery diarrhea', 'Vomiting for 12+ hours', 'Drank untreated floodwater', 'Sunken eyes, dry mouth (severe dehydration)'],
    injuryZone: 'abdomen',
    correctTreatment: ['cleanWater', 'ors'],
    treatmentSlotCount: 2,
    treatmentExplanation: 'Cholera kills through dehydration, not infection. ORS (Oral Rehydration Salts) replace lost electrolytes. Clean water + ORS can reduce cholera mortality from 50% to under 1%.',
  },
  {
    id: 'PT-10', name: 'Massive Head Trauma', trueCategory: 'BLACK',
    symptoms: ['Exposed brain matter visible', 'No spontaneous breathing', 'No pulse after opening airway', 'Fixed dilated pupils'],
    injuryZone: 'head',
    correctTreatment: [],
    treatmentSlotCount: 0,
    treatmentExplanation: 'This patient has injuries incompatible with life. Using resources here means another patient dies. Triage means making the hardest decision to save the most lives.',
  },
]

/* ─── Triage error messages (per patient) ────────────────────────────────── */
function triageErrorMessage(patient, assigned) {
  const { id, trueCategory, name } = patient
  if (assigned === trueCategory) return null
  switch (id) {
    case 'PT-1':
      if (assigned === 'YELLOW' || assigned === 'GREEN')
        return `Triage Error (${name}): An unconscious patient with no gag reflex and water in lungs is at immediate risk of death. Faint pulse = still salvageable. This is RED — Immediate.`
      if (assigned === 'BLACK')
        return `Triage Error (${name}): Faint pulse detected means this patient is alive and salvageable. BLACK is only for patients with injuries incompatible with life. This is RED — Immediate.`
      return `Triage Error (${name}): Unconscious near-drowning with cyanosis requires immediate intervention. Correct category: RED — Immediate.`
    case 'PT-2':
      if (assigned === 'YELLOW')
        return `Triage Error (${name}): Active arterial SPURTING blood is an immediate life threat (RED). This patient will bleed out in minutes without intervention.`
      if (assigned === 'GREEN')
        return `Triage Error (${name}): Bright red blood spurting rhythmically = arterial hemorrhage. This patient will die in minutes. This is RED — Immediate, not walking wounded.`
      if (assigned === 'BLACK')
        return `Triage Error (${name}): Patient is pale and confused but has a pulse and is conscious. Arterial bleeding is immediately life-threatening but treatable. This is RED — Immediate.`
      return `Triage Error (${name}): Arterial hemorrhage = RED — Immediate. This patient will die without a tourniquet within minutes.`
    case 'PT-3':
      if (assigned === 'YELLOW')
        return `Triage Error (${name}): Crush syndrome releases lethal toxins when pressure is released. Without immediate tourniquet + fluids, this patient faces cardiac arrest. This is RED — Immediate.`
      if (assigned === 'GREEN' || assigned === 'BLACK')
        return `Triage Error (${name}): Despite being alert, crush syndrome is immediately life-threatening. The "toxic wave" from reperfusion can cause cardiac arrest in minutes. RED — Immediate.`
      return `Triage Error (${name}): Crush syndrome requires immediate intervention. Correct: RED — Immediate.`
    case 'PT-4':
      if (assigned === 'YELLOW')
        return `Triage Error (${name}): Cannot complete sentences + cyanosis = severe respiratory distress. Without bronchodilator, this progresses to respiratory arrest in minutes. RED — Immediate.`
      if (assigned === 'GREEN')
        return `Triage Error (${name}): Blue lips and accessory muscle use = imminent respiratory failure. This is far beyond "walking wounded." RED — Immediate.`
      if (assigned === 'BLACK')
        return `Triage Error (${name}): Patient is still breathing (wheezing) and conscious. A single inhaler puff can save this life. This is RED — Immediate, not expectant.`
      return `Triage Error (${name}): Severe asthma with cyanosis = RED — Immediate.`
    case 'PT-5':
      if (assigned === 'RED')
        return `Triage Error (${name}): Snakebites progress over hours, not minutes. With stable vitals, this is YELLOW — Delayed. Prioritize patients who will die in the next 30 minutes.`
      if (assigned === 'GREEN')
        return `Triage Error (${name}): Rapidly spreading swelling from a venomous bite needs medical attention — just not immediately. YELLOW — Delayed.`
      if (assigned === 'BLACK')
        return `Triage Error (${name}): Snakebite with stable vitals is very treatable. Correct category: YELLOW — Delayed.`
      return `Triage Error (${name}): Snakebite with stable vitals = YELLOW — Delayed.`
    case 'PT-6':
      if (assigned === 'RED')
        return `Triage Error (${name}): Hypoglycemia is serious but correctable with simple oral glucose. Patient is conscious. YELLOW — Delayed.`
      if (assigned === 'GREEN')
        return `Triage Error (${name}): Confusion and slurred speech indicate declining mental status. This patient needs treatment soon, not just observation. YELLOW — Delayed.`
      if (assigned === 'BLACK')
        return `Triage Error (${name}): This patient just needs sugar! Hypoglycemia is one of the most treatable emergencies. YELLOW — Delayed.`
      return `Triage Error (${name}): Diabetic emergency with declining consciousness = YELLOW — Delayed.`
    case 'PT-7':
      if (assigned === 'RED')
        return `Triage Error (${name}): Good distal pulse and finger movement = no vascular compromise. A closed fracture is painful but not immediately life-threatening. YELLOW — Delayed.`
      if (assigned === 'GREEN')
        return `Triage Error (${name}): A visible deformity fracture needs splinting to prevent nerve/vascular damage. Not just "walking wounded." YELLOW — Delayed.`
      if (assigned === 'BLACK')
        return `Triage Error (${name}): A broken arm is very treatable. This patient needs a splint. YELLOW — Delayed.`
      return `Triage Error (${name}): Closed fracture with intact circulation = YELLOW — Delayed.`
    case 'PT-8':
      if (assigned === 'RED')
        return `Triage Error (${name}): This patient is ambulatory (walking). In START triage, anyone who can walk is GREEN — regardless of how bad they look.`
      if (assigned === 'YELLOW')
        return `Triage Error (${name}): Key word: "ambulatory." In START triage, the very first step is "Can the patient walk?" If yes = GREEN, period. Stumbling still counts as walking.`
      if (assigned === 'BLACK')
        return `Triage Error (${name}): Shivering is actually a good sign — the body is still generating heat. This ambulatory patient is GREEN — Walking Wounded.`
      return `Triage Error (${name}): Ambulatory patient = GREEN — Walking Wounded.`
    case 'PT-9':
      if (assigned === 'RED')
        return `Triage Error (${name}): Dehydration from cholera is serious but progresses over hours. ORS can be self-administered. GREEN — Walking Wounded (can walk to hydration station).`
      if (assigned === 'YELLOW')
        return `Triage Error (${name}): Despite looking terrible, this patient can walk to a rehydration point. Dehydration treatment (ORS) is simple and self-administrable. GREEN — Walking Wounded.`
      if (assigned === 'BLACK')
        return `Triage Error (${name}): Cholera/dysentery is highly treatable with ORS! Mortality drops from 50% to under 1% with simple rehydration. GREEN — Walking Wounded.`
      return `Triage Error (${name}): Ambulatory dehydration patient = GREEN — Walking Wounded.`
    case 'PT-10':
      if (assigned === 'RED')
        return `Triage Error (${name}): Exposed brain matter with no pulse or breathing after airway opened = injuries incompatible with life. This is BLACK — Expectant. Resources must go to the living.`
      if (assigned === 'YELLOW')
        return `Triage Error (${name}): No pulse, no breathing, fixed dilated pupils, exposed brain matter. No amount of field treatment can save this patient. BLACK — Expectant.`
      if (assigned === 'GREEN')
        return `Triage Error (${name}): This patient is deceased. Exposed brain matter and no vital signs = BLACK — Expectant. Do not allocate resources.`
      return `Triage Error (${name}): No vital signs + catastrophic injury = BLACK — Expectant.`
    default:
      return `Triage Error: ${name} was incorrectly categorized as ${assigned}. Correct: ${trueCategory}.`
  }
}

/* ─── Wrong-item feedback for treatment ──────────────────────────────────── */
function wrongItemFeedback(patient, itemKey) {
  const { id } = patient
  const lookup = {
    'PT-1': {
      tourniquet: 'A tourniquet is for limb hemorrhage. This patient needs airway management, not bleeding control.',
      gauze: 'There is no external wound to dress. The problem is water IN the lungs — you need to restore breathing.',
      splintTape: 'Nothing is broken. This patient is drowning from the inside. Focus on airway and warmth.',
      inhaler: 'The airway obstruction is from water, not bronchospasm. You need rescue breathing to clear fluid.',
    },
    'PT-2': {
      gauze: 'Gauze and pressure cannot stop arterial bleeding — the pressure from a spurting artery will blow right through. You need a tourniquet.',
      splintTape: 'A splint does nothing for hemorrhage. This patient is bleeding out.',
      mylarBlanket: 'A blanket will not stop arterial bleeding. Apply a tourniquet first.',
    },
    'PT-3': {
      gauze: 'There is no open wound. The danger is internal — crushed muscle toxins. Think: tourniquet before extrication + fluids.',
      mylarBlanket: 'Warmth is secondary. The lethal threat is potassium and myoglobin release when the slab is lifted.',
      splintTape: 'The leg is trapped, not broken in a standard sense. You need to prevent toxic reperfusion.',
    },
    'PT-4': {
      rescueMask: 'The patient IS breathing (wheezing). The problem is bronchospasm — constricted airways. You need a bronchodilator, not rescue breathing.',
      tourniquet: 'There is no bleeding. This is a respiratory emergency.',
      gauze: 'There is no wound. This patient cannot breathe due to airway constriction.',
    },
    'PT-5': {
      gauze: 'Puncture wounds from fangs are tiny — gauze does not address the spreading venom. Immobilize the limb instead.',
      inhaler: 'This is a snakebite, not a respiratory condition. Focus on slowing venom spread.',
      glucose: 'Sugar does nothing for venom. Clean the wound and immobilize the limb.',
    },
    'PT-6': {
      inhaler: 'This is not a breathing problem. The patient has low blood sugar — they need glucose.',
      tourniquet: 'There is no bleeding or venom. This patient needs sugar, urgently.',
      cleanWater: 'Water will not raise blood sugar. The patient needs glucose or sugar specifically.',
    },
    'PT-7': {
      tourniquet: 'There is no bleeding — this is a closed fracture. Good distal pulse means circulation is intact. Just splint it.',
      gauze: 'No open wound. This is a closed fracture. Splint the limb in the position found.',
      cleanWater: 'Water does not help a broken bone. Splint and immobilize.',
    },
    'PT-8': {
      inhaler: 'This is hypothermia, not asthma. The patient needs dry clothes and insulation.',
      tourniquet: 'Nothing is bleeding. This patient is cold. Remove wet clothes and insulate.',
      glucose: 'While hypothermia can affect blood sugar, the priority is removing wet clothes and warming.',
    },
    'PT-9': {
      inhaler: 'This is gastrointestinal, not respiratory. The patient needs rehydration.',
      tourniquet: 'There is no wound. This patient needs fluids and electrolytes.',
      gauze: 'There is nothing to bandage. The patient is losing fluids through diarrhea and vomiting.',
      splintTape: 'Nothing is broken. This patient needs rehydration therapy.',
    },
  }
  const patientLookup = lookup[id]
  if (patientLookup && patientLookup[itemKey]) return patientLookup[itemKey]
  return `This item does not address this patient's condition. Review the symptoms carefully.`
}

/* ─── Shake keyframes (injected once) ────────────────────────────────────── */
const SHAKE_CSS = `
@keyframes m6shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
@keyframes m6glow {
  0% { box-shadow: 0 0 5px rgba(46,213,115,0.3); }
  50% { box-shadow: 0 0 20px rgba(46,213,115,0.7); }
  100% { box-shadow: 0 0 5px rgba(46,213,115,0.3); }
}
@keyframes m6fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`

/* ─── Med Kit definition ─────────────────────────────────────────────────── */
const INITIAL_MEDKIT = {
  cleanWater:    { name: 'Clean Water',           icon: '\uD83D\uDCA7', qty: 3 },
  gauze:         { name: 'Gauze & Pressure',       icon: '\uD83E\uDE79', qty: 4 },
  tourniquet:    { name: 'Tourniquet',             icon: '\uD83D\uDD17', qty: 2 },
  mylarBlanket:  { name: 'Mylar Blanket',          icon: '\uD83E\uDEB6', qty: 2 },
  ors:           { name: 'ORS Rehydration',        icon: '\uD83E\uDDC2', qty: 2 },
  splintTape:    { name: 'Splint & Tape',          icon: '\uD83E\uDDB4', qty: 3 },
  antiFungal:    { name: 'Anti-Fungal Powder',     icon: '\uD83E\uDDF4', qty: 2 },
  inhaler:       { name: 'Albuterol Inhaler',      icon: '\uD83D\uDCA8', qty: 1 },
  dryClothes:    { name: 'Dry Clothes',            icon: '\uD83D\uDC55', qty: 2 },
  glucose:       { name: 'Glucose/Sugar',          icon: '\uD83C\uDF6C', qty: 2 },
  rescueMask:    { name: 'Rescue Breathing Mask',  icon: '\uD83D\uDE2E\u200D\uD83D\uDCA8', qty: 1 },
}

/* ─── Build treatment order from triage assignments ──────────────────────── */
function buildTreatmentOrder(triageAssignments) {
  const priority = { RED: 0, YELLOW: 1, GREEN: 2, BLACK: 3 }
  const sorted = [...PATIENTS]
    .map(p => ({ ...p, assignedCategory: triageAssignments[p.id] || p.trueCategory }))
    .sort((a, b) => priority[a.trueCategory] - priority[b.trueCategory])
    .filter(p => p.trueCategory !== 'BLACK')
  return sorted.map(p => p.id)
}

/* ─── Reducer ────────────────────────────────────────────────────────────── */
const initialState = {
  phase: 'intro',
  patients: PATIENTS,
  triageAssignments: {},
  triageLocked: false,
  triageErrors: [],
  currentPatientIdx: 0,
  treatmentOrder: [],
  treatmentSlots: [],
  treatmentFeedback: null,
  treatedPatients: {},
  medKit: JSON.parse(JSON.stringify(INITIAL_MEDKIT)),
  wastedOnBlack: false,
  score: 0,
  triageScore: 0,
  treatmentScore: 0,
  triageCorrectCount: 0,
  treatmentCorrectCount: 0,
  shakeSlot: false,
  glowSlot: false,
  errorReviewIdx: 0,
}

function reducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...initialState, phase: 'triage', medKit: JSON.parse(JSON.stringify(INITIAL_MEDKIT)) }

    case 'ASSIGN_TRIAGE': {
      const { patientId, category } = action.payload
      if (state.triageLocked) return state
      return {
        ...state,
        triageAssignments: { ...state.triageAssignments, [patientId]: category },
      }
    }

    case 'LOCK_TRIAGE': {
      const errors = []
      let correctCount = 0
      PATIENTS.forEach(p => {
        const assigned = state.triageAssignments[p.id]
        if (assigned === p.trueCategory) {
          correctCount++
        } else {
          const msg = triageErrorMessage(p, assigned)
          if (msg) errors.push(msg)
        }
      })
      const triageScore = correctCount * 8
      return {
        ...state,
        triageLocked: true,
        triageErrors: errors,
        triageScore,
        triageCorrectCount: correctCount,
        phase: errors.length > 0 ? 'triageReview' : 'treatment',
        errorReviewIdx: 0,
        ...(errors.length === 0 ? {
          treatmentOrder: buildTreatmentOrder(state.triageAssignments),
          currentPatientIdx: 0,
          treatmentSlots: [],
        } : {}),
      }
    }

    case 'NEXT_ERROR': {
      const nextIdx = state.errorReviewIdx + 1
      if (nextIdx >= state.triageErrors.length) {
        const order = buildTreatmentOrder(state.triageAssignments)
        return {
          ...state,
          phase: 'treatment',
          errorReviewIdx: 0,
          treatmentOrder: order,
          currentPatientIdx: 0,
          treatmentSlots: [],
        }
      }
      return { ...state, errorReviewIdx: nextIdx }
    }

    case 'SKIP_TO_TREATMENT': {
      const order = buildTreatmentOrder(state.triageAssignments)
      return {
        ...state,
        phase: 'treatment',
        errorReviewIdx: 0,
        treatmentOrder: order,
        currentPatientIdx: 0,
        treatmentSlots: [],
      }
    }

    case 'PLACE_ITEM': {
      const { itemKey } = action.payload
      const currentPid = state.treatmentOrder[state.currentPatientIdx]
      const patient = PATIENTS.find(p => p.id === currentPid)
      if (!patient) return state
      if (state.treatmentSlots.length >= patient.treatmentSlotCount) return state
      const kitItem = state.medKit[itemKey]
      if (!kitItem || kitItem.qty <= 0) return state
      const newKit = JSON.parse(JSON.stringify(state.medKit))
      newKit[itemKey].qty -= 1
      return {
        ...state,
        treatmentSlots: [...state.treatmentSlots, itemKey],
        medKit: newKit,
        treatmentFeedback: null,
        shakeSlot: false,
        glowSlot: false,
      }
    }

    case 'REMOVE_SLOT_ITEM': {
      const { slotIdx } = action.payload
      const itemKey = state.treatmentSlots[slotIdx]
      if (!itemKey) return state
      const newKit = JSON.parse(JSON.stringify(state.medKit))
      newKit[itemKey].qty += 1
      const newSlots = [...state.treatmentSlots]
      newSlots.splice(slotIdx, 1)
      return {
        ...state,
        treatmentSlots: newSlots,
        medKit: newKit,
        treatmentFeedback: null,
        shakeSlot: false,
        glowSlot: false,
      }
    }

    case 'CONFIRM_TREATMENT': {
      const currentPid = state.treatmentOrder[state.currentPatientIdx]
      const patient = PATIENTS.find(p => p.id === currentPid)
      if (!patient) return state
      if (state.treatmentSlots.length !== patient.treatmentSlotCount) {
        return {
          ...state,
          treatmentFeedback: { text: `This patient requires exactly ${patient.treatmentSlotCount} treatment item(s). Fill all slots before confirming.`, correct: false },
          shakeSlot: true,
          glowSlot: false,
        }
      }

      /* Check for trap items first */
      if (patient.trapItems) {
        for (const slot of state.treatmentSlots) {
          if (patient.trapItems.includes(slot)) {
            /* Return ALL items to kit */
            const newKit = JSON.parse(JSON.stringify(state.medKit))
            state.treatmentSlots.forEach(k => { newKit[k].qty += 1 })
            return {
              ...state,
              treatmentFeedback: { text: patient.trapFeedback, correct: false },
              treatmentSlots: [],
              medKit: newKit,
              shakeSlot: true,
              glowSlot: false,
            }
          }
        }
      }

      /* Check correctness — order matters */
      const isCorrect = patient.correctTreatment.length === state.treatmentSlots.length &&
        patient.correctTreatment.every((item, i) => state.treatmentSlots[i] === item)

      if (isCorrect) {
        return {
          ...state,
          treatmentFeedback: { text: patient.treatmentExplanation, correct: true },
          treatedPatients: {
            ...state.treatedPatients,
            [currentPid]: { correct: true, itemsUsed: [...state.treatmentSlots] },
          },
          treatmentCorrectCount: state.treatmentCorrectCount + 1,
          shakeSlot: false,
          glowSlot: true,
        }
      }

      /* Wrong combination — give specific feedback for the first wrong item */
      let feedbackText = ''
      for (const slot of state.treatmentSlots) {
        if (!patient.correctTreatment.includes(slot)) {
          feedbackText = wrongItemFeedback(patient, slot)
          break
        }
      }
      if (!feedbackText) {
        /* Items are correct but in wrong order */
        feedbackText = 'The items are relevant, but the ORDER matters. Think about what must be done FIRST to save this patient.'
      }

      /* Return items to kit */
      const newKit = JSON.parse(JSON.stringify(state.medKit))
      state.treatmentSlots.forEach(k => { newKit[k].qty += 1 })

      return {
        ...state,
        treatmentFeedback: { text: feedbackText, correct: false },
        treatmentSlots: [],
        medKit: newKit,
        shakeSlot: true,
        glowSlot: false,
      }
    }

    case 'NEXT_PATIENT': {
      const nextIdx = state.currentPatientIdx + 1
      if (nextIdx >= state.treatmentOrder.length) {
        /* Calculate final scores */
        const treatmentScore = state.treatmentCorrectCount * 5
        const trapPenalty = state.wastedOnBlack ? -20 : 0
        const total = Math.min(100, state.triageScore + treatmentScore + trapPenalty)
        return {
          ...state,
          phase: 'result',
          treatmentScore,
          score: total,
        }
      }
      return {
        ...state,
        currentPatientIdx: nextIdx,
        treatmentSlots: [],
        treatmentFeedback: null,
        shakeSlot: false,
        glowSlot: false,
      }
    }

    case 'FINISH': {
      const treatmentScore = state.treatmentCorrectCount * 5
      const trapPenalty = state.wastedOnBlack ? -20 : 0
      const total = Math.min(100, state.triageScore + treatmentScore + trapPenalty)
      return {
        ...state,
        phase: 'result',
        treatmentScore,
        score: total,
      }
    }

    case 'CLEAR_SHAKE':
      return { ...state, shakeSlot: false }

    default:
      return state
  }
}

/* ─── Body Outline SVG ───────────────────────────────────────────────────── */
function BodyOutline({ zone, size = 100 }) {
  const s = size
  const scale = s / 100
  const zoneHighlights = {
    head:     <circle cx={50*scale} cy={14*scale} r={10*scale} fill="rgba(255,71,87,0.5)" stroke={C.red} strokeWidth={1.5} />,
    chest:    <ellipse cx={50*scale} cy={36*scale} rx={16*scale} ry={10*scale} fill="rgba(255,71,87,0.4)" stroke={C.red} strokeWidth={1.5} />,
    abdomen:  <ellipse cx={50*scale} cy={52*scale} rx={14*scale} ry={8*scale} fill="rgba(255,71,87,0.4)" stroke={C.red} strokeWidth={1.5} />,
    torso:    <ellipse cx={50*scale} cy={44*scale} rx={17*scale} ry={18*scale} fill="rgba(255,71,87,0.3)" stroke={C.red} strokeWidth={1.5} />,
    leftArm:  <rect x={16*scale} y={30*scale} width={8*scale} height={28*scale} rx={4*scale} fill="rgba(255,71,87,0.4)" stroke={C.red} strokeWidth={1.5} />,
    rightArm: <rect x={76*scale} y={30*scale} width={8*scale} height={28*scale} rx={4*scale} fill="rgba(255,71,87,0.4)" stroke={C.red} strokeWidth={1.5} />,
    leftLeg:  <rect x={36*scale} y={64*scale} width={9*scale} height={30*scale} rx={4*scale} fill="rgba(255,71,87,0.4)" stroke={C.red} strokeWidth={1.5} />,
    rightLeg: <rect x={55*scale} y={64*scale} width={9*scale} height={30*scale} rx={4*scale} fill="rgba(255,71,87,0.4)" stroke={C.red} strokeWidth={1.5} />,
  }

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ flexShrink: 0 }}>
      {/* Head */}
      <circle cx={50*scale} cy={14*scale} r={8*scale} fill="none" stroke={C.secondary} strokeWidth={1.2} />
      {/* Neck */}
      <line x1={50*scale} y1={22*scale} x2={50*scale} y2={26*scale} stroke={C.secondary} strokeWidth={1.2} />
      {/* Torso */}
      <rect x={34*scale} y={26*scale} width={32*scale} height={36*scale} rx={6*scale} fill="none" stroke={C.secondary} strokeWidth={1.2} />
      {/* Left arm */}
      <line x1={34*scale} y1={28*scale} x2={20*scale} y2={34*scale} stroke={C.secondary} strokeWidth={1.2} />
      <line x1={20*scale} y1={34*scale} x2={18*scale} y2={56*scale} stroke={C.secondary} strokeWidth={1.2} />
      {/* Right arm */}
      <line x1={66*scale} y1={28*scale} x2={80*scale} y2={34*scale} stroke={C.secondary} strokeWidth={1.2} />
      <line x1={80*scale} y1={34*scale} x2={82*scale} y2={56*scale} stroke={C.secondary} strokeWidth={1.2} />
      {/* Left leg */}
      <line x1={42*scale} y1={62*scale} x2={40*scale} y2={94*scale} stroke={C.secondary} strokeWidth={1.2} />
      {/* Right leg */}
      <line x1={58*scale} y1={62*scale} x2={60*scale} y2={94*scale} stroke={C.secondary} strokeWidth={1.2} />
      {/* Highlight zone */}
      {zone && zoneHighlights[zone]}
    </svg>
  )
}

/* ─── Category styling helpers ───────────────────────────────────────────── */
const CAT_COLORS = { RED: C.red, YELLOW: C.yellow, GREEN: C.green, BLACK: C.black }
const CAT_LABELS = {
  RED: 'RED \u2014 Immediate',
  YELLOW: 'YELLOW \u2014 Delayed',
  GREEN: 'GREEN \u2014 Walking Wounded',
  BLACK: 'BLACK \u2014 Expectant',
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
export default function Module6_FirstAidTriage() {
  const { dispatch: gameDispatch } = useGame()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [hoveredItem, setHoveredItem] = useState(null)
  const styleRef = useRef(null)
  const autoAdvanceRef = useRef(null)
  const hasRecordedScore = useRef(false)

  /* Inject keyframe CSS once */
  if (!styleRef.current && typeof document !== 'undefined') {
    const tag = document.createElement('style')
    tag.textContent = SHAKE_CSS
    document.head.appendChild(tag)
    styleRef.current = tag
  }

  /* Clear shake after animation */
  const clearShake = useCallback(() => {
    setTimeout(() => dispatch({ type: 'CLEAR_SHAKE' }), 500)
  }, [])

  /* Record score when reaching result */
  const recordScore = useCallback((score) => {
    const passed = score >= 50
    gameDispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-6', result: { score, passed } } })
  }, [gameDispatch])

  /* ── Shared styles ──────────────────────────────────────────────────────── */
  const pageStyle = {
    background: C.bg,
    minHeight: '100vh',
    color: C.text,
    fontFamily: C.font,
    padding: '20px',
    boxSizing: 'border-box',
    animation: 'm6fadeIn 0.4s ease-out',
  }

  const cardStyle = {
    background: C.card,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    padding: '16px',
    boxSizing: 'border-box',
  }

  const btnBase = {
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontFamily: C.font,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#fff',
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: INTRO
     ════════════════════════════════════════════════════════════════════════ */
  if (state.phase === 'intro') {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{'\u26D1\uFE0F'}</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, color: C.text }}>
            Module 6: First Aid Triage
          </h1>
          <h2 style={{ fontSize: 18, fontWeight: 400, color: C.secondary, marginBottom: 32 }}>
            Mass Casualty Incident {'\u2014'} START Protocol
          </h2>
          <div style={{ ...cardStyle, textAlign: 'left', marginBottom: 32 }}>
            <p style={{ color: C.secondary, lineHeight: 1.7, marginBottom: 16, fontSize: 15 }}>
              A flash flood has devastated the area. You are the first responder on scene with a limited
              medical kit. Ten patients need your help {'\u2014'} but not all can be saved, and treating them
              in the wrong order will cost lives.
            </p>
            <p style={{ color: C.text, lineHeight: 1.7, marginBottom: 16, fontSize: 15, fontWeight: 600 }}>
              This exercise has two phases:
            </p>
            <div style={{ paddingLeft: 16 }}>
              <p style={{ color: C.red, lineHeight: 1.7, marginBottom: 8, fontSize: 15 }}>
                <strong>Phase 1 {'\u2014'} Triage:</strong>{' '}
                <span style={{ color: C.secondary }}>Assign each patient to a START category (RED, YELLOW, GREEN, or BLACK) based on their symptoms.</span>
              </p>
              <p style={{ color: C.green, lineHeight: 1.7, marginBottom: 8, fontSize: 15 }}>
                <strong>Phase 2 {'\u2014'} Treatment:</strong>{' '}
                <span style={{ color: C.secondary }}>Apply the correct items from your med kit to each patient, in priority order.</span>
              </p>
            </div>
            <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(255,71,87,0.1)', borderRadius: 8, border: `1px solid rgba(255,71,87,0.2)` }}>
              <p style={{ color: C.red, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                {'\u26A0\uFE0F'} Warning: Some treatment choices are TRAPS {'\u2014'} medically harmful actions that feel intuitive but are wrong.
                Read symptoms carefully. This is designed to teach real triage decision-making.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => dispatch({ type: 'START' })}
              style={{ ...btnBase, background: C.red, fontSize: 16, padding: '14px 40px' }}
            >
              Begin Triage
            </button>
            <button
              onClick={() => gameDispatch({ type: 'BACK_TO_MODULES' })}
              style={{ ...btnBase, background: 'transparent', border: `1px solid ${C.secondary}`, color: C.secondary }}
            >
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: TRIAGE
     ════════════════════════════════════════════════════════════════════════ */
  if (state.phase === 'triage') {
    const allAssigned = PATIENTS.every(p => state.triageAssignments[p.id])

    /* Count per category */
    const counts = { RED: 0, YELLOW: 0, GREEN: 0, BLACK: 0 }
    Object.values(state.triageAssignments).forEach(c => { if (c) counts[c]++ })

    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              Phase 1: Triage Assessment
            </h2>
            <span style={{ color: C.secondary, fontSize: 14 }}>
              {Object.keys(state.triageAssignments).length} / {PATIENTS.length} assigned
            </span>
          </div>

          {/* Category drop zones */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {['RED', 'YELLOW', 'GREEN', 'BLACK'].map(cat => (
              <div key={cat} style={{
                ...cardStyle,
                borderColor: CAT_COLORS[cat],
                borderWidth: 2,
                borderStyle: 'solid',
                textAlign: 'center',
                minHeight: 80,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: CAT_COLORS[cat], marginBottom: 6 }}>
                  {CAT_LABELS[cat]}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: CAT_COLORS[cat] }}>
                  {counts[cat]}
                </div>
                <div style={{ fontSize: 11, color: C.secondary }}>
                  patient{counts[cat] !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>

          {/* Patient grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {PATIENTS.map(patient => {
              const assigned = state.triageAssignments[patient.id]
              return (
                <div key={patient.id} style={{
                  ...cardStyle,
                  border: assigned ? `2px solid ${CAT_COLORS[assigned]}` : `1px solid ${C.border}`,
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                  boxShadow: assigned ? `0 0 12px ${CAT_COLORS[assigned]}33` : 'none',
                }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    <BodyOutline zone={patient.injuryZone} size={70} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>{patient.id}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{patient.name}</div>
                      {assigned && (
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: CAT_COLORS[assigned],
                          color: assigned === 'YELLOW' ? '#1e1e2e' : '#fff',
                        }}>
                          {assigned}
                        </span>
                      )}
                    </div>
                  </div>
                  <ul style={{ margin: '0 0 12px 0', padding: '0 0 0 18px', listStyle: 'disc' }}>
                    {patient.symptoms.map((s, i) => (
                      <li key={i} style={{ fontSize: 13, color: C.secondary, lineHeight: 1.6, marginBottom: 2 }}>{s}</li>
                    ))}
                  </ul>
                  {/* Triage buttons */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['RED', 'YELLOW', 'GREEN', 'BLACK'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => dispatch({ type: 'ASSIGN_TRIAGE', payload: { patientId: patient.id, category: cat } })}
                        style={{
                          ...btnBase,
                          flex: 1,
                          padding: '6px 0',
                          fontSize: 12,
                          background: assigned === cat ? CAT_COLORS[cat] : 'transparent',
                          border: `2px solid ${CAT_COLORS[cat]}`,
                          color: assigned === cat ? (cat === 'YELLOW' ? '#1e1e2e' : '#fff') : CAT_COLORS[cat],
                          opacity: assigned && assigned !== cat ? 0.4 : 1,
                        }}
                      >
                        {cat.charAt(0)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Lock In button */}
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            {allAssigned ? (
              <button
                onClick={() => dispatch({ type: 'LOCK_TRIAGE' })}
                style={{
                  ...btnBase,
                  background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
                  fontSize: 16,
                  padding: '14px 48px',
                  boxShadow: '0 4px 20px rgba(255,71,87,0.3)',
                }}
              >
                {'\uD83D\uDD12'} LOCK IN TRIAGE
              </button>
            ) : (
              <p style={{ color: C.secondary, fontSize: 14 }}>
                Assign all 10 patients to a category to proceed.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: TRIAGE REVIEW
     ════════════════════════════════════════════════════════════════════════ */
  if (state.phase === 'triageReview') {
    const error = state.triageErrors[state.errorReviewIdx]
    const totalErrors = state.triageErrors.length

    /* Start auto-advance timer */
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)
    autoAdvanceRef.current = setTimeout(() => {
      dispatch({ type: 'NEXT_ERROR' })
    }, 5000)

    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 700, margin: '0 auto', paddingTop: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
            Triage Review
          </h2>
          <p style={{ color: C.secondary, fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
            Score: {state.triageCorrectCount}/10 correct {'\u2014'} {totalErrors} error{totalErrors !== 1 ? 's' : ''} found
          </p>

          <div style={{
            ...cardStyle,
            border: `2px solid ${C.red}`,
            padding: 24,
            animation: 'm6fadeIn 0.3s ease-out',
            minHeight: 120,
          }} key={state.errorReviewIdx}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>{'\u274C'}</span>
              <span style={{ fontSize: 13, color: C.secondary }}>
                Error {state.errorReviewIdx + 1} of {totalErrors}
              </span>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: C.text, margin: 0 }}>
              {error}
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: C.red,
              width: `${((state.errorReviewIdx + 1) / totalErrors) * 100}%`,
              transition: 'width 0.3s',
              borderRadius: 4,
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <span style={{ color: C.secondary, fontSize: 13 }}>
              Auto-advancing in 5s...
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)
                  dispatch({ type: 'NEXT_ERROR' })
                }}
                style={{ ...btnBase, background: C.card, border: `1px solid ${C.border}`, fontSize: 13, padding: '8px 16px' }}
              >
                {state.errorReviewIdx < totalErrors - 1 ? 'Next Error' : 'Continue to Treatment'}
              </button>
              <button
                onClick={() => {
                  if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)
                  dispatch({ type: 'SKIP_TO_TREATMENT' })
                }}
                style={{ ...btnBase, background: 'transparent', border: `1px solid ${C.secondary}`, color: C.secondary, fontSize: 13, padding: '8px 16px' }}
              >
                Skip All
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: TREATMENT
     ════════════════════════════════════════════════════════════════════════ */
  if (state.phase === 'treatment') {
    const currentPid = state.treatmentOrder[state.currentPatientIdx]
    const patient = PATIENTS.find(p => p.id === currentPid)

    /* If we somehow have no patient, finish */
    if (!patient) {
      dispatch({ type: 'FINISH' })
      return null
    }

    /* BLACK patient auto-skip */
    if (patient.trueCategory === 'BLACK') {
      /* Shouldn't happen since we filter out BLACK, but safety net */
      dispatch({ type: 'NEXT_PATIENT' })
      return null
    }

    const slotsArray = Array.from({ length: patient.treatmentSlotCount }, (_, i) => state.treatmentSlots[i] || null)
    const allSlotsFilled = state.treatmentSlots.length === patient.treatmentSlotCount
    const patientNumber = state.currentPatientIdx + 1
    const totalTreatable = state.treatmentOrder.length
    const medKitEntries = Object.entries(state.medKit)

    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              Phase 2: Treatment
            </h2>
            <span style={{ color: C.secondary, fontSize: 14 }}>
              Patient {patientNumber} of {totalTreatable}
            </span>
          </div>

          {/* Exam Room */}
          <div style={{
            ...cardStyle,
            padding: 24,
            marginBottom: 20,
            animation: 'm6fadeIn 0.3s ease-out',
          }} key={currentPid}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {/* Body outline */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 110 }}>
                <BodyOutline zone={patient.injuryZone} size={110} />
                <span style={{
                  marginTop: 8,
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  background: CAT_COLORS[patient.trueCategory],
                  color: patient.trueCategory === 'YELLOW' ? '#1e1e2e' : '#fff',
                }}>
                  {patient.trueCategory}
                </span>
              </div>

              {/* Patient info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>{patient.id}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px 0', color: C.text }}>
                  {patient.name}
                </h3>
                <ul style={{ margin: 0, padding: '0 0 0 18px', listStyle: 'disc' }}>
                  {patient.symptoms.map((s, i) => (
                    <li key={i} style={{ fontSize: 14, color: C.secondary, lineHeight: 1.7, marginBottom: 2 }}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Treatment slots */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, color: C.secondary, marginBottom: 10, fontWeight: 600 }}>
                Treatment Slots ({patient.treatmentSlotCount} required):
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {slotsArray.map((itemKey, idx) => {
                  const item = itemKey ? state.medKit[itemKey] || INITIAL_MEDKIT[itemKey] : null
                  return (
                    <div
                      key={idx}
                      onClick={() => { if (itemKey) dispatch({ type: 'REMOVE_SLOT_ITEM', payload: { slotIdx: idx } }) }}
                      style={{
                        width: 140,
                        height: 80,
                        borderRadius: 10,
                        border: itemKey
                          ? `2px solid ${state.glowSlot ? C.green : 'rgba(255,255,255,0.2)'}`
                          : `2px dashed rgba(255,255,255,0.15)`,
                        background: itemKey ? 'rgba(255,255,255,0.05)' : 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: itemKey ? 'pointer' : 'default',
                        transition: 'all 0.3s',
                        animation: state.shakeSlot ? 'm6shake 0.4s ease-in-out' : (state.glowSlot ? 'm6glow 1s ease-in-out infinite' : 'none'),
                        position: 'relative',
                      }}
                    >
                      {itemKey ? (
                        <>
                          <span style={{ fontSize: 24 }}>{item?.icon || '?'}</span>
                          <span style={{ fontSize: 11, color: C.text, marginTop: 4, textAlign: 'center', padding: '0 4px' }}>
                            {item?.name || itemKey}
                          </span>
                          <span style={{
                            position: 'absolute', top: 4, right: 6,
                            fontSize: 10, color: C.secondary, opacity: 0.6,
                          }}>
                            {'\u2715'}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
                          Slot {idx + 1}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Treatment feedback */}
            {state.treatmentFeedback && (
              <div style={{
                marginTop: 16,
                padding: '12px 16px',
                borderRadius: 8,
                background: state.treatmentFeedback.correct
                  ? 'rgba(46,213,115,0.12)'
                  : 'rgba(255,71,87,0.12)',
                border: `1px solid ${state.treatmentFeedback.correct ? C.green : C.red}40`,
                animation: 'm6fadeIn 0.3s ease-out',
              }}>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: state.treatmentFeedback.correct ? C.green : C.red,
                  fontWeight: state.treatmentFeedback.correct ? 400 : 600,
                }}>
                  {state.treatmentFeedback.correct ? '\u2705 ' : '\u274C '}{state.treatmentFeedback.text}
                </p>
              </div>
            )}

            {/* Confirm / Next buttons */}
            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!state.treatmentFeedback?.correct && (
                <button
                  onClick={() => {
                    dispatch({ type: 'CONFIRM_TREATMENT' })
                    clearShake()
                  }}
                  disabled={!allSlotsFilled}
                  style={{
                    ...btnBase,
                    background: allSlotsFilled ? C.green : C.black,
                    color: allSlotsFilled ? '#1e1e2e' : C.secondary,
                    opacity: allSlotsFilled ? 1 : 0.5,
                    cursor: allSlotsFilled ? 'pointer' : 'not-allowed',
                  }}
                >
                  Confirm Treatment
                </button>
              )}
              {state.treatmentFeedback?.correct && (
                <button
                  onClick={() => dispatch({ type: 'NEXT_PATIENT' })}
                  style={{ ...btnBase, background: C.green, color: '#1e1e2e' }}
                >
                  {state.currentPatientIdx < state.treatmentOrder.length - 1
                    ? 'Next Patient \u2192'
                    : 'View Results'}
                </button>
              )}
            </div>
          </div>

          {/* BLACK patient notice (shown if the next sorted patient would be BLACK) */}
          {/* Med Kit */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px 0', color: C.text }}>
              {'\uD83C\uDFE5'} Med Kit
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
              gap: 10,
            }}>
              {medKitEntries.map(([key, item]) => {
                const disabled = item.qty <= 0 || allSlotsFilled || state.treatmentFeedback?.correct
                return (
                  <button
                    key={key}
                    onClick={() => { if (!disabled) dispatch({ type: 'PLACE_ITEM', payload: { itemKey: key } }) }}
                    onMouseEnter={() => { if (!disabled) setHoveredItem(key) }}
                    onMouseLeave={() => setHoveredItem(null)}
                    disabled={disabled}
                    style={{
                      background: disabled
                        ? 'rgba(255,255,255,0.02)'
                        : hoveredItem === key
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${disabled ? 'rgba(255,255,255,0.04)' : hoveredItem === key ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 8,
                      padding: '10px 8px',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      textAlign: 'center',
                      opacity: disabled ? 0.35 : 1,
                      transition: 'all 0.2s',
                      fontFamily: C.font,
                      transform: hoveredItem === key && !disabled ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 22 }}>{item.icon}</div>
                    <div style={{ fontSize: 11, color: C.text, marginTop: 4, lineHeight: 1.3 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: C.secondary, marginTop: 4 }}>
                      Qty: {item.qty}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: RESULT
     ════════════════════════════════════════════════════════════════════════ */
  if (state.phase === 'result') {
    const totalScore = state.score
    const passed = totalScore >= 50

    /* Record score on first render of result */
    if (!hasRecordedScore.current) {
      hasRecordedScore.current = true
      recordScore(totalScore)
    }

    const treatmentCorrectCount = state.treatmentCorrectCount

    /* Key lessons */
    const keyLessons = [
      'In START triage, the FIRST question is always: "Can they walk?" If yes, they are GREEN regardless of appearance.',
      'Arterial bleeding (bright red, spurting) is always RED \u2014 Immediate. Minutes matter.',
      'NEVER tourniquet a snakebite \u2014 it traps venom and causes tissue death. Immobilize with a splint instead.',
      'Crush syndrome: apply tourniquet BEFORE freeing the trapped limb to prevent lethal "toxic wave" reperfusion.',
      'BLACK (Expectant) is the hardest call \u2014 but using resources on unsalvageable patients means salvageable patients die.',
      'Cholera kills through dehydration, not the disease itself. ORS + clean water reduces mortality from 50% to under 1%.',
      'Hypothermia protocol: remove wet clothes FIRST, then insulate. Wet fabric causes 25x faster heat loss.',
    ]

    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 20 }}>
          {/* Score header */}
          <div style={{ textAlign: 'center', marginBottom: 32, animation: 'm6fadeIn 0.5s ease-out' }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: passed ? C.green : C.red, marginBottom: 8 }}>
              {totalScore}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: passed ? C.green : C.red, marginBottom: 8 }}>
              {passed ? 'PASSED' : 'FAILED'}
            </div>
            <div style={{ fontSize: 14, color: C.secondary }}>
              {passed ? 'You demonstrated competent triage and treatment skills.' : 'Score 50 or higher to pass. Review the lessons below and try again.'}
            </div>
          </div>

          {/* Score breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
            <div style={{ ...cardStyle, textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.text }}>{state.triageCorrectCount}/10</div>
              <div style={{ fontSize: 13, color: C.secondary, marginTop: 4 }}>Triage Accuracy</div>
              <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>({state.triageScore} pts)</div>
            </div>
            <div style={{ ...cardStyle, textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.text }}>{treatmentCorrectCount}/9</div>
              <div style={{ fontSize: 13, color: C.secondary, marginTop: 4 }}>Treatment Accuracy</div>
              <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>({state.treatmentScore} pts)</div>
            </div>
            <div style={{ ...cardStyle, textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: state.wastedOnBlack ? C.red : C.green }}>
                {state.wastedOnBlack ? '-20' : '0'}
              </div>
              <div style={{ fontSize: 13, color: C.secondary, marginTop: 4 }}>Resource Waste Penalty</div>
              <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                {state.wastedOnBlack ? 'Wasted on expectant patient' : 'No waste'}
              </div>
            </div>
          </div>

          {/* Patient-by-patient review */}
          <div style={{ ...cardStyle, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', color: C.text }}>
              Patient Review
            </h3>
            {PATIENTS.map(patient => {
              const assignedCat = state.triageAssignments[patient.id]
              const triageCorrect = assignedCat === patient.trueCategory
              const treated = state.treatedPatients[patient.id]
              const treatmentCorrect = treated?.correct || false
              const isBlack = patient.trueCategory === 'BLACK'

              return (
                <div key={patient.id} style={{
                  padding: '14px 16px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${C.border}`,
                  marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{patient.id}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{patient.name}</span>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                      fontSize: 11, fontWeight: 700,
                      background: CAT_COLORS[patient.trueCategory],
                      color: patient.trueCategory === 'YELLOW' ? '#1e1e2e' : '#fff',
                    }}>
                      {patient.trueCategory}
                    </span>
                    {/* Triage result */}
                    <span style={{ fontSize: 12, color: triageCorrect ? C.green : C.red }}>
                      {triageCorrect ? '\u2705 Triage correct' : `\u274C Triaged as ${assignedCat}`}
                    </span>
                    {/* Treatment result */}
                    {!isBlack && (
                      <span style={{ fontSize: 12, color: treatmentCorrect ? C.green : C.red }}>
                        {treatmentCorrect ? '\u2705 Treated correctly' : '\u274C Treatment incorrect'}
                      </span>
                    )}
                    {isBlack && (
                      <span style={{ fontSize: 12, color: C.secondary }}>
                        No treatment (expectant)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {!isBlack && (
                      <div style={{ fontSize: 12, color: C.secondary }}>
                        <strong style={{ color: C.text }}>Correct treatment:</strong>{' '}
                        {patient.correctTreatment.map(k => INITIAL_MEDKIT[k]?.name || k).join(' + ')}
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: C.secondary, lineHeight: 1.6, margin: '6px 0 0 0' }}>
                    {patient.treatmentExplanation}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Key Lessons */}
          <div style={{ ...cardStyle, padding: 20, marginBottom: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px 0', color: C.text }}>
              {'\uD83D\uDCA1'} Key Lessons
            </h3>
            <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
              {keyLessons.map((lesson, i) => (
                <li key={i} style={{ fontSize: 14, color: C.secondary, lineHeight: 1.7, marginBottom: 8 }}>
                  {lesson}
                </li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 40 }}>
            <button
              onClick={() => { hasRecordedScore.current = false; dispatch({ type: 'START' }) }}
              style={{ ...btnBase, background: passed ? C.card : C.red, border: `1px solid ${C.border}`, fontSize: 15, padding: '12px 32px' }}
            >
              {'\uD83D\uDD04'} Try Again
            </button>
            <button
              onClick={() => gameDispatch({ type: 'BACK_TO_MODULES' })}
              style={{ ...btnBase, background: passed ? C.green : C.card, color: passed ? '#1e1e2e' : C.text, fontSize: 15, padding: '12px 32px' }}
            >
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* Fallback */
  return (
    <div style={pageStyle}>
      <p style={{ textAlign: 'center', color: C.secondary }}>Unknown phase. Please restart.</p>
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <button
          onClick={() => dispatch({ type: 'START' })}
          style={{ ...btnBase, background: C.red }}
        >
          Restart
        </button>
      </div>
    </div>
  )
}
