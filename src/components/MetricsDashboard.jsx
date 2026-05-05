import { useState, useMemo } from 'react'
import { useGame } from '../context/GameContext'

// ─── Static data — only the 6 active games ─────────────────────────────────

const ALL_MODULES = {
  flood: [
    {
      id: 1, title: 'The 60-Second Go-Bag', phase: 'Preparedness', icon: '🎒', color: '#3b82f6',
      topic: 'Emergency packing & item prioritization',
      skills: ['priority', 'resource', 'speed', 'protocol'],
      whatYouLearn: ['Pick critical items in 60s', 'Manage backpack weight', 'Recognize NDMA-recommended go-bag list'],
      tipsLow:  ['Re-read the blueprint before exploring', 'Never skip water, ID, medicine, light', 'Watch the weight gauge — heavy ≠ safer'],
      tipsMid:  ['Aim to fill the bag in under 90s', 'Drop sentimental items before food/medicine', 'Try the speed-run with shorter timer next'],
      tipsHigh: ['Try other bag-loadout scenarios for new disasters', 'Help peers — explain why each item matters'],
    },
    {
      id: 2, title: 'Build the Raft', phase: 'Response', icon: '🛶', color: '#f59e0b',
      topic: 'Improvised flotation engineering (NDRF method)',
      skills: ['priority', 'protocol', 'resource', 'engineering'],
      whatYouLearn: ['4-component raft anatomy', 'Why sealed drums + bamboo + nylon + paddle works', 'Spotting bad materials (cardboard, jute, electrical wire)'],
      tipsLow:  ['Always read the blueprint first (+5 bonus)', 'Sealed drums for hull — never wood/metal', 'Nylon rope > jute. Synthetic stays strong wet'],
      tipsMid:  ['Use a bamboo deck — light & water-resistant', 'Pick a flat-blade paddle, not a steel rod', 'Watch the stress test to learn why a part failed'],
      tipsHigh: ['Try with no blueprint and beat 30s', 'Memorize the 4-component checklist for real life'],
    },
    {
      id: 3, title: 'Flood Rescue', phase: 'Response', icon: '🔦', color: '#ef4444',
      topic: 'Night raft rescue & hazard navigation',
      skills: ['hazard', 'navigation', 'pressure', 'protocol'],
      whatYouLearn: ['Identify distress signals (fire/flag/torch/SOS/shout)', 'Avoid live-wire shock zones', 'Boat capacity & multi-trip planning'],
      tipsLow:  ['Listen for victim audio cues — closer = faster beep', 'Stay 20m+ away from sparking poles', 'Drop off at shelter before picking up more'],
      tipsMid:  ['Plan a route through fewer hazard zones', 'Clear debris before retrying same lane', 'Shouting victims need to be reached quickly'],
      tipsHigh: ['No-shock perfect run? Try going faster next time', 'Mentor: explain why fire signals beat shouting'],
    },
    {
      id: 4, title: 'Field Triage', phase: 'Survival', icon: '🩺', color: '#22c55e',
      topic: 'START triage, supply run & treatment (ABCs)',
      skills: ['priority', 'protocol', 'resource', 'pressure'],
      whatYouLearn: ['START method: CRITICAL → HIGH → MEDIUM → LOW', 'Treat dehydration, hypothermia, fractures, cuts', 'Choose right govt resource location'],
      tipsLow:  ['Pregnant/child = always CRITICAL first', 'Use the body diagram + X-ray during examine', 'Match treatment items to injury (ORS for dehydration)'],
      tipsMid:  ['Compare shop safety + stock before route choice', 'Avoid pharm2 — it has a live-wire zone nearby', 'Read NDMA tip on each card before treating'],
      tipsHigh: ['Run a perfect triage with no wrong items', 'Practice ABCs (Airway, Breathing, Circulation)'],
    },
    {
      id: 5, title: 'The Sinking Car', phase: 'Survival', icon: '🚗', color: '#a855f7',
      topic: 'Vehicle escape — Calm, Unbuckle, Window, Break, Swim',
      skills: ['pressure', 'speed', 'protocol', 'navigation'],
      whatYouLearn: ['"Turn Around, Don\'t Drown" route choice', 'Why doors won\'t open underwater (~600 lbs/sqft)', 'Strike CORNERS of side windows, not windshield'],
      tipsLow:  ['Choose elevated routes (State Road over highway)', 'Calm breathing FIRST — panic burns oxygen', 'Use headrest spike on side window corner'],
      tipsMid:  ['Keep cabin water under 70% to avoid failure', 'Window before break — try the switch first', 'Escape upward — never re-enter floodwater'],
      tipsHigh: ['Beat the run with cabin water under 30%', 'Memorize the 5-step CUWBS sequence cold'],
    },
    {
      id: 6, title: 'SOS Signaling', phase: 'Survival', icon: '🪞', color: '#06b6d4',
      topic: 'Condition-based rescue signaling',
      skills: ['hazard', 'protocol', 'priority', 'pressure'],
      whatYouLearn: ['Match signal to weather (mirror/fire/flag/whistle/SOS)', 'Day vs night signal effectiveness', 'Persist with the right pattern (3-3-3 SOS)'],
      tipsLow:  ['Read conditions before grabbing a signal', 'Mirror only works in sunlight — not at night', 'Whistle carries 3x farther than shouting'],
      tipsMid:  ['Fire is the king of night signals — visible 5+ km', 'Bright flag for day — orange/red on highest point', 'Use SOS rhythm (3 short, 3 long, 3 short)'],
      tipsHigh: ['Practice signaling at maximum range / lowest visibility', 'Teach others the day vs night decision tree'],
    },
  ],
}

const PHASES = [
  { key: 'Preparedness', emoji: '🛡️', color: '#3b82f6', grad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.22)'  },
  { key: 'Response',     emoji: '🚨', color: '#f59e0b', grad: 'linear-gradient(135deg,#b45309,#f59e0b)', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)'  },
  { key: 'Survival',     emoji: '⛺', color: '#22c55e', grad: 'linear-gradient(135deg,#15803d,#22c55e)', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.22)'   },
]

// ─── Skill dimensions — cross-cut every module ─────────────────────────────
// Each module is tagged with which skills it tests. Skill score = avg of
// scores from modules tagged with that skill (only counting attempted ones).
const SKILL_DIMENSIONS = [
  { key: 'priority',    label: 'Priority Decisions',  icon: '🧠', desc: 'Choosing what matters first when seconds count.' },
  { key: 'protocol',    label: 'NDMA Knowledge',      icon: '📋', desc: 'Following established disaster-response protocols.' },
  { key: 'hazard',      label: 'Hazard Awareness',    icon: '⚠️', desc: 'Spotting and avoiding dangers (live wires, deep water, debris).' },
  { key: 'resource',    label: 'Resource Management', icon: '📦', desc: 'Using limited supplies and capacity wisely.' },
  { key: 'speed',       label: 'Time Management',     icon: '⏱️', desc: 'Acting fast under shrinking time windows.' },
  { key: 'pressure',    label: 'Calm Under Pressure', icon: '😤', desc: 'Steady decision-making when panic would lose lives.' },
  { key: 'navigation',  label: 'Navigation',          icon: '🧭', desc: 'Routing safely through flooded, hazardous terrain.' },
  { key: 'engineering', label: 'Improvised Engineering', icon: '🔧', desc: 'Building a working solution from what\'s on hand.' },
]

const DISASTERS = [
  { key: 'flood', label: 'Flood Survival', emoji: '🌊', color: '#3b82f6' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGrade(score, attempted) {
  if (!attempted) return { letter: '—',  label: 'Not Started', color: '#475569', bg: 'rgba(71,85,105,0.15)'    }
  if (score >= 93) return { letter: 'A+', label: 'Expert',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  }
  if (score >= 85) return { letter: 'A',  label: 'Advanced',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   }
  if (score >= 75) return { letter: 'B+', label: 'Proficient',  color: '#a3e635', bg: 'rgba(163,230,53,0.12)'  }
  if (score >= 65) return { letter: 'B',  label: 'Informed',    color: '#facc15', bg: 'rgba(250,204,21,0.12)'  }
  if (score >= 55) return { letter: 'C+', label: 'Aware',       color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  }
  if (score >= 45) return { letter: 'C',  label: 'Basic',       color: '#f87171', bg: 'rgba(248,113,113,0.12)' }
  if (score >= 30) return { letter: 'D',  label: 'Novice',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   }
  return              { letter: 'F',  label: 'Critical',    color: '#dc2626', bg: 'rgba(220,38,38,0.12)'   }
}

function scoreColor(s) {
  if (s >= 80) return '#22c55e'
  if (s >= 60) return '#facc15'
  if (s >= 40) return '#f97316'
  return '#ef4444'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreBar({ pct = 0, color = '#3b82f6', h = 8 }) {
  return (
    <div style={{ height: h, background: 'rgba(255,255,255,0.07)', borderRadius: h, overflow: 'hidden', width: '100%' }}>
      <div style={{
        height: '100%',
        width: `${Math.max(0, Math.min(100, pct))}%`,
        background: color,
        borderRadius: h,
        transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: `0 0 8px ${color}55`,
      }} />
    </div>
  )
}

function CircleGauge({ score = 0, color = '#3b82f6', size = 130 }) {
  const inner = Math.round(size * 0.72)
  const deg   = Math.round((Math.max(0, Math.min(100, score)) / 100) * 360)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `conic-gradient(${color} 0deg ${deg}deg, rgba(255,255,255,0.07) ${deg}deg 360deg)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      filter: `drop-shadow(0 0 18px ${color}55)`,
    }}>
      <div style={{
        width: inner, height: inner, borderRadius: '50%', background: '#0b1120',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      }}>
        <span style={{ fontSize: Math.round(size * 0.19), fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
          {score}%
        </span>
        <span style={{ fontSize: Math.round(size * 0.09), color: '#64748b', lineHeight: 1.4 }}>score</span>
      </div>
    </div>
  )
}

function SkillRadar({ skills, size = 280 }) {
  const center = size / 2
  const radius = size * 0.38
  const n = skills.length
  // Polygon points for given value-fraction (0..1) per skill
  const polyPoints = (frac) => skills.map((_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const r = radius * (typeof frac === 'function' ? frac(i) : frac)
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)]
  })
  // Background gridlines (4 levels)
  const grid = [0.25, 0.5, 0.75, 1].map(f => polyPoints(f).map(([x,y]) => `${x},${y}`).join(' '))
  // Score polygon — clamp very low values to a small visible minimum so untested isn't invisible
  const scoreFracs = skills.map(s => s.attempted > 0 ? Math.max(0.04, s.avg / 100) : 0.04)
  const scorePoly = polyPoints((i) => scoreFracs[i]).map(([x,y]) => `${x},${y}`).join(' ')
  // Spokes
  const spokes = skills.map((_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return { x1: center, y1: center, x2: center + radius * Math.cos(angle), y2: center + radius * Math.sin(angle) }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* Grid polygons */}
      {grid.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth={1} />
      ))}
      {/* Spokes */}
      {spokes.map((s, i) => (
        <line key={i} {...s} stroke="rgba(148,163,184,0.18)" strokeWidth={1} />
      ))}
      {/* Score polygon */}
      <polygon points={scorePoly} fill="rgba(96,165,250,0.25)" stroke="#60a5fa" strokeWidth={2} />
      {/* Score dots */}
      {polyPoints((i) => scoreFracs[i]).map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill={skills[i].attempted ? skills[i].levelColor : '#334155'} stroke="#0b1120" strokeWidth={1.5} />
      ))}
      {/* Labels */}
      {skills.map((s, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
        const lx = center + (radius + 28) * Math.cos(angle)
        const ly = center + (radius + 28) * Math.sin(angle)
        return (
          <g key={i}>
            <text x={lx} y={ly - 4} textAnchor="middle" fill="#cbd5e1" fontSize={11} fontWeight={700}>{s.icon}</text>
            <text x={lx} y={ly + 8} textAnchor="middle" fill="#94a3b8" fontSize={9} fontWeight={600}>{s.label.split(' ')[0]}</text>
            <text x={lx} y={ly + 20} textAnchor="middle" fill={s.attempted ? s.levelColor : '#475569'} fontSize={10} fontWeight={800}>
              {s.attempted ? `${s.avg}%` : '—'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function GradeBadge({ grade, large = false }) {
  return (
    <span style={{
      fontSize: large ? 22 : 14,
      fontWeight: 800,
      padding: large ? '5px 16px' : '2px 9px',
      borderRadius: 7,
      color: grade.color,
      background: grade.bg,
      border: `1px solid ${grade.color}55`,
      letterSpacing: 0.5,
      whiteSpace: 'nowrap',
    }}>
      {grade.letter}
    </span>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MetricsDashboard() {
  const { state, dispatch } = useGame()
  const [activeDisaster, setActiveDisaster] = useState(state.selectedDisaster || 'flood')
  const [resetConfirm, setResetConfirm] = useState(false)
  const [expandedPhase, setExpandedPhase] = useState(null)

  const metrics = useMemo(() => {
    const dis  = activeDisaster
    const mods = ALL_MODULES[dis] || []

    const phaseStats = PHASES.map(ph => {
      const pMods    = mods.filter(m => m.phase === ph.key)
      const attempted = pMods.filter(m => !!state.scores[`${dis}-${m.id}`])
      const passed    = pMods.filter(m => state.completedModules.includes(`${dis}-${m.id}`))
      const avgScore  = attempted.length
        ? Math.round(attempted.reduce((s, m) => s + (state.scores[`${dis}-${m.id}`]?.score || 0), 0) / attempted.length)
        : 0
      return {
        ...ph,
        modules:   pMods,
        attempted: attempted.length,
        passed:    passed.length,
        total:     pMods.length,
        avgScore,
        grade:     getGrade(avgScore, attempted.length),
      }
    })

    const allAttempted = mods.filter(m => !!state.scores[`${dis}-${m.id}`])
    const overallScore = allAttempted.length
      ? Math.round(allAttempted.reduce((s, m) => s + (state.scores[`${dis}-${m.id}`]?.score || 0), 0) / allAttempted.length)
      : 0
    const totalPassed  = mods.filter(m => state.completedModules.includes(`${dis}-${m.id}`)).length
    const passRate     = allAttempted.length ? Math.round((totalPassed / allAttempted.length) * 100) : 0

    const strengths = mods
      .filter(m => (state.scores[`${dis}-${m.id}`]?.score || 0) >= 75)
      .map(m => ({ ...m, score: state.scores[`${dis}-${m.id}`].score, attempts: state.scores[`${dis}-${m.id}`].attempts || 1 }))
      .sort((a, b) => b.score - a.score)

    const gaps = mods
      .filter(m => {
        const s = state.scores[`${dis}-${m.id}`]
        return s ? s.score < 65 : true
      })
      .map(m => {
        const s = state.scores[`${dis}-${m.id}`]
        return { ...m, score: s?.score ?? null, attempts: s?.attempts ?? 0, tried: !!s }
      })
      .sort((a, b) => {
        if (!a.tried && !b.tried) return 0
        if (!a.tried) return 1
        if (!b.tried) return -1
        return a.score - b.score
      })

    // Best and weakest phases (among attempted)
    const attemptedPhases = phaseStats.filter(p => p.attempted > 0)
    const bestPhase    = attemptedPhases.length ? [...attemptedPhases].sort((a, b) => b.avgScore - a.avgScore)[0] : null
    const weakestPhase = attemptedPhases.length ? [...attemptedPhases].sort((a, b) => a.avgScore - b.avgScore)[0] : null

    // Total attempts across all modules
    const totalAttempts = mods.reduce((sum, m) => sum + (state.scores[`${dis}-${m.id}`]?.attempts || 0), 0)

    // ─── Skill dimensions: compute avg score per skill across tagged modules ───
    const skillStats = SKILL_DIMENSIONS.map(skill => {
      const tagged = mods.filter(m => m.skills?.includes(skill.key))
      const attemptedTagged = tagged.filter(m => !!state.scores[`${dis}-${m.id}`])
      const avg = attemptedTagged.length
        ? Math.round(attemptedTagged.reduce((s, m) => s + (state.scores[`${dis}-${m.id}`]?.score || 0), 0) / attemptedTagged.length)
        : 0
      let level = 'Untested'
      let levelColor = '#475569'
      if (attemptedTagged.length > 0) {
        if (avg >= 85)      { level = 'Mastered';   levelColor = '#22c55e' }
        else if (avg >= 70) { level = 'Strong';     levelColor = '#84cc16' }
        else if (avg >= 55) { level = 'Developing'; levelColor = '#facc15' }
        else if (avg >= 35) { level = 'Lacking';    levelColor = '#fb923c' }
        else                { level = 'Critical Gap'; levelColor = '#ef4444' }
      }
      return {
        ...skill,
        avg, level, levelColor,
        modules: tagged,
        attempted: attemptedTagged.length,
        total: tagged.length,
        weakModule: attemptedTagged.length
          ? [...attemptedTagged].sort((a,b) => (state.scores[`${dis}-${a.id}`]?.score || 0) - (state.scores[`${dis}-${b.id}`]?.score || 0))[0]
          : null,
      }
    })

    const masteredSkills = skillStats.filter(s => s.attempted > 0 && s.avg >= 70)
    const lackingSkills  = skillStats.filter(s => s.attempted > 0 && s.avg < 55)
    const untestedSkills = skillStats.filter(s => s.attempted === 0)

    // ─── Personalized "Next 3 Steps" recommendations ───
    const nextSteps = []

    // Step 1: lowest-scoring tried module → retry it
    const triedSorted = mods
      .map(m => ({ m, s: state.scores[`${dis}-${m.id}`] }))
      .filter(x => x.s)
      .sort((a, b) => (a.s.score || 0) - (b.s.score || 0))
    if (triedSorted.length && triedSorted[0].s.score < 75) {
      const t = triedSorted[0]
      nextSteps.push({
        kind: 'retry',
        title: `Retry "${t.m.title}"`,
        why:   `Your current best is ${t.s.bestScore || t.s.score}%. This is your weakest tried module.`,
        action: t.m.tipsLow?.[0] || 'Re-read the blueprint and focus on the basics.',
        moduleId: t.m.id,
        color: t.m.color,
      })
    }

    // Step 2: untried module relevant to weakest skill (or any untried)
    const untried = mods.filter(m => !state.scores[`${dis}-${m.id}`])
    if (untried.length) {
      let pick = untried[0]
      if (lackingSkills.length) {
        const skillKey = lackingSkills[0].key
        const skillMatch = untried.find(m => m.skills?.includes(skillKey))
        if (skillMatch) pick = skillMatch
      }
      nextSteps.push({
        kind: 'untried',
        title: `Try "${pick.title}"`,
        why:   `You haven't attempted this yet. It builds: ${pick.skills?.map(k => SKILL_DIMENSIONS.find(s => s.key === k)?.label).filter(Boolean).join(', ')}.`,
        action: pick.whatYouLearn?.[0] || 'Start with the intro and read the blueprint.',
        moduleId: pick.id,
        color: pick.color,
      })
    }

    // Step 3: If a skill is critical gap, point at the strongest module that builds it
    if (lackingSkills.length && nextSteps.length < 3) {
      const skill = lackingSkills.sort((a,b) => a.avg - b.avg)[0]
      // The module that would help build this skill the most: highest-tagged untested or lowest tried
      const candidates = skill.modules.filter(m => !nextSteps.some(ns => ns.moduleId === m.id))
      if (candidates.length) {
        const target = candidates[0]
        nextSteps.push({
          kind: 'skill',
          title: `Build "${skill.label}" via ${target.title}`,
          why:   `Your ${skill.label} score is ${skill.avg}% — ${skill.level}. ${skill.desc}`,
          action: target.tipsLow?.[0] || `Practice the ${skill.label} fundamentals in this module.`,
          moduleId: target.id,
          color: target.color,
        })
      }
    }

    // Build per-module insight (used in Deep Analysis section)
    const moduleInsights = mods.map(m => {
      const s = state.scores[`${dis}-${m.id}`]
      const score = s?.score ?? null
      const tried = !!s
      let bucket = 'untried' // untried | low | mid | high
      let tips = []
      let verdict = 'Not yet attempted — start here to assess.'
      if (tried) {
        if (score >= 80) { bucket = 'high'; tips = m.tipsHigh || []; verdict = `You\'ve got this dialled in (${score}%). Keep your edge sharp.` }
        else if (score >= 60) { bucket = 'mid'; tips = m.tipsMid || []; verdict = `Solid foundation (${score}%). A focused retry can push you to mastery.` }
        else { bucket = 'low'; tips = m.tipsLow || []; verdict = `Critical gap (${score}%). Review the blueprint and protocols before retrying.` }
      } else {
        tips = m.tipsLow || []
      }
      return {
        ...m, score, tried, bucket, tips, verdict,
        attempts: s?.attempts || 0,
        bestScore: s?.bestScore ?? null,
        improving: s?.bestScore != null && s?.attempts > 1 && s.bestScore > (s.score || 0) ? false
                  : s?.attempts > 1 && (s.bestScore || 0) >= (s.score || 0) ? true : null,
      }
    })

    return {
      mods, phaseStats,
      overallScore, overallGrade: getGrade(overallScore, allAttempted.length),
      totalAttempted: allAttempted.length, totalPassed, totalModules: mods.length,
      passRate, strengths, gaps, bestPhase, weakestPhase, totalAttempts,
      skillStats, masteredSkills, lackingSkills, untestedSkills,
      nextSteps, moduleInsights,
    }
  }, [activeDisaster, state.scores, state.completedModules])

  const noData = metrics.totalAttempted === 0

  const handleReset = () => {
    dispatch({ type: 'RESET_PROGRESS' })
    setResetConfirm(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={st.page}>

      {/* ── Reset confirm modal ── */}
      {resetConfirm && (
        <div style={st.overlay}>
          <div style={st.modal}>
            <span style={{ fontSize: 44 }}>⚠️</span>
            <h3 style={{ color: '#f8fafc', marginTop: 12, fontSize: 18 }}>Reset All Progress?</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '10px 0 22px', textAlign: 'center', lineHeight: 1.6 }}>
              This permanently deletes all your scores,<br />completion data, and attempt history.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={st.dangerBtn} onClick={handleReset}>Yes, Reset Everything</button>
              <button style={st.cancelBtn} onClick={() => setResetConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div style={st.header}>
        <button style={st.backBtn} onClick={() => dispatch({ type: 'NAVIGATE', payload: 'mainMenu' })}>
          ← Back to Menu
        </button>
        <h1 style={st.pageTitle}>📊 Readiness Dashboard</h1>
        <button style={st.resetBtn} onClick={() => setResetConfirm(true)}>🗑️ Reset</button>
      </div>

      {/* ── Disaster tabs ── */}
      <div style={st.tabs}>
        {DISASTERS.map(d => (
          <button
            key={d.key}
            style={{
              ...st.tab,
              ...(activeDisaster === d.key
                ? { background: `${d.color}22`, borderColor: d.color, color: d.color }
                : {}),
            }}
            onClick={() => setActiveDisaster(d.key)}
          >
            {d.emoji} {d.label}
          </button>
        ))}
        <span style={st.tabNote}>More disasters coming soon</span>
      </div>

      {/* ── Empty state ── */}
      {noData ? (
        <div style={st.emptyState}>
          <span style={{ fontSize: 68 }}>🎮</span>
          <h2 style={{ color: '#f8fafc', marginTop: 18, fontSize: 22 }}>No Data Yet</h2>
          <p style={{ color: '#94a3b8', marginTop: 10, fontSize: 15, maxWidth: 340, textAlign: 'center', lineHeight: 1.7 }}>
            Complete some modules to see your readiness metrics, knowledge gaps, and performance breakdown here.
          </p>
          <button
            style={st.primaryBtn}
            onClick={() => dispatch({ type: 'SELECT_DISASTER', payload: activeDisaster })}
          >
            🚀 Start Training
          </button>
        </div>
      ) : (
        <>
          {/* ══ HERO ROW: Circular score + Phase snapshot ══ */}
          <div style={st.heroRow}>

            {/* Overall score card */}
            <div style={st.heroCard}>
              <p style={st.cardLabel}>🏆 Overall Readiness</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 18 }}>
                <CircleGauge score={metrics.overallScore} color={metrics.overallGrade.color} size={138} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <GradeBadge grade={metrics.overallGrade} large />
                    <span style={{ color: metrics.overallGrade.color, fontWeight: 700, fontSize: 17 }}>
                      {metrics.overallGrade.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <StatLine label="Attempted"  val={`${metrics.totalAttempted} / ${metrics.totalModules}`} col="#94a3b8" />
                    <StatLine label="Passed"     val={`${metrics.totalPassed} / ${metrics.totalModules}`}   col="#4ade80" />
                    <StatLine label="Pass Rate"  val={`${metrics.passRate}%`}                               col="#60a5fa" />
                    <StatLine label="Total Tries" val={metrics.totalAttempts}                               col="#a78bfa" />
                  </div>
                  {metrics.bestPhase && (
                    <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
                      💪 Best: <span style={{ color: metrics.bestPhase.color, fontWeight: 700 }}>{metrics.bestPhase.key}</span>
                      {metrics.weakestPhase && metrics.weakestPhase.key !== metrics.bestPhase.key && (
                        <> &nbsp;|&nbsp; ⚠️ Weakest: <span style={{ color: metrics.weakestPhase.color, fontWeight: 700 }}>{metrics.weakestPhase.key}</span></>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Knowledge snapshot */}
            <div style={st.heroCard}>
              <p style={st.cardLabel}>📡 Knowledge Snapshot</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
                {metrics.phaseStats.map(ph => (
                  <div key={ph.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{ph.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>{ph.key}</span>
                        <span style={{ fontSize: 12, color: ph.attempted ? ph.color : '#475569', fontWeight: 700 }}>
                          {ph.attempted ? `${ph.avgScore}%` : 'Not started'}
                        </span>
                      </div>
                      <ScoreBar pct={ph.avgScore} color={ph.attempted ? ph.color : '#334155'} h={8} />
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b', width: 52, textAlign: 'right' }}>
                      {ph.passed}/{ph.total} ✅
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ PHASE CARDS GRID ══ */}
          <SectionTitle>Phase Breakdown</SectionTitle>
          <div style={st.phaseGrid}>
            {metrics.phaseStats.map(ph => (
              <div key={ph.key} style={{ ...st.phaseCard, background: ph.bg, borderColor: ph.border }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 30 }}>{ph.emoji}</span>
                    <h4 style={{ color: ph.color, fontSize: 13, fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                      {ph.key}
                    </h4>
                  </div>
                  <GradeBadge grade={ph.grade} />
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Phase Score</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: ph.attempted ? ph.color : '#475569' }}>
                      {ph.attempted ? `${ph.avgScore}%` : '—'}
                    </span>
                  </div>
                  <ScoreBar pct={ph.avgScore} color={ph.attempted ? ph.color : '#334155'} h={10} />
                </div>

                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <MiniStat label="Passed"   val={`${ph.passed}/${ph.total}`} />
                  <MiniStat label="Tried"    val={`${ph.attempted}/${ph.total}`} />
                </div>

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize: 12, color: ph.grade.color, fontWeight: 600 }}>
                    {ph.grade.label}
                  </span>
                  {ph.attempted < ph.total && (
                    <span style={{ fontSize: 11, color: '#475569', float: 'right' }}>
                      {ph.total - ph.attempted} not tried
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ══ MODULE BREAKDOWN ══ */}
          <SectionTitle>Module-by-Module Breakdown</SectionTitle>
          {metrics.phaseStats.map(ph => (
            <div key={ph.key} style={st.phaseSection}>
              <button
                style={{ ...st.phaseSectionHeader, borderColor: ph.border, background: ph.bg }}
                onClick={() => setExpandedPhase(expandedPhase === ph.key ? null : ph.key)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{ph.emoji}</span>
                  <span style={{ color: ph.color, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {ph.key}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    ({ph.passed}/{ph.total} passed · {ph.attempted ? `avg ${ph.avgScore}%` : 'not started'})
                  </span>
                </span>
                <span style={{ fontSize: 16, color: '#64748b', transition: 'transform 0.2s', transform: expandedPhase === ph.key ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
              </button>

              {(expandedPhase === null || expandedPhase === ph.key) && (
                <div style={st.moduleList}>
                  {ph.modules.map((m, i) => {
                    const key      = `${activeDisaster}-${m.id}`
                    const sData    = state.scores[key]
                    const passed   = state.completedModules.includes(key)
                    const score    = sData?.score ?? null
                    const attempts = sData?.attempts ?? 0
                    const bestScore = sData?.bestScore ?? score
                    const notTried = !sData

                    return (
                      <div
                        key={m.id}
                        style={{
                          ...st.moduleRow,
                          background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                          opacity: notTried ? 0.6 : 1,
                        }}
                      >
                        {/* Icon + Title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, flex: '0 0 200px' }}>
                          <span style={{ fontSize: 22 }}>{m.icon}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{m.title}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Mod {m.id} · {m.topic}</div>
                          </div>
                        </div>

                        {/* Score bar */}
                        <div style={{ flex: 1, padding: '0 20px' }}>
                          {notTried ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1 }}><ScoreBar pct={0} color="#334155" h={8} /></div>
                              <span style={{ fontSize: 11, color: '#475569' }}>Not tried</span>
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1 }}><ScoreBar pct={score} color={scoreColor(score)} h={8} /></div>
                                <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(score), minWidth: 38, textAlign: 'right' }}>
                                  {score}%
                                </span>
                              </div>
                              {bestScore > score && (
                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                  Best: {bestScore}%
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Status + controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 160px', justifyContent: 'flex-end' }}>
                          {!notTried && (
                            <>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                                background: passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                color: passed ? '#4ade80' : '#f87171',
                              }}>
                                {passed ? '✅ Pass' : '❌ Fail'}
                              </span>
                              <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                                {attempts} {attempts === 1 ? 'try' : 'tries'}
                              </span>
                            </>
                          )}
                          <button
                            style={st.playBtn}
                            onClick={() => dispatch({ type: 'PLAY_MODULE', payload: { disaster: activeDisaster, module: m.id } })}
                            title={notTried ? 'Start module' : 'Retry module'}
                          >
                            {notTried ? '▶ Start' : '↩ Retry'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          {/* ══ SKILL PROFILE — radar + skill strip ══ */}
          <SectionTitle>🧭 Skill Profile</SectionTitle>
          <div style={st.skillBlock}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 280 }}>
              <SkillRadar skills={metrics.skillStats} size={300}/>
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.65, marginBottom: 14 }}>
                Each module trains a mix of skills. Your level in a skill = average of scores across all modules that test it.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {metrics.skillStats.map(s => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'rgba(255,255,255,0.025)', borderRadius: 8, border: `1px solid ${s.attempted ? s.levelColor + '33' : 'rgba(255,255,255,0.05)'}` }}>
                    <span style={{ fontSize: 18, width: 22, textAlign: 'center' }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4, marginTop: 1 }}>{s.desc}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 70 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: s.attempted ? s.levelColor : '#475569' }}>
                        {s.attempted ? `${s.avg}%` : '—'}
                      </div>
                      <div style={{ fontSize: 9, color: s.attempted ? s.levelColor : '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {s.level}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ WHAT YOU MASTER vs WHAT'S LACKING ══ */}
          <SectionTitle>📊 What You Master vs What's Lacking</SectionTitle>
          <div style={st.recoGrid}>

            {/* Mastered skills */}
            <div style={{ ...st.recoCard, borderColor: 'rgba(74,222,128,0.25)' }}>
              <h3 style={{ color: '#4ade80', fontSize: 14, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                💪 What You're NOT Lacking
                <span style={{ fontSize: 11, color: '#4ade8088', fontWeight: 600 }}>({metrics.masteredSkills.length} skills ≥70%)</span>
              </h3>
              {metrics.masteredSkills.length === 0 ? (
                <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                  Reach 70% average in any skill to see your mastery here. Keep training!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {metrics.masteredSkills.map(s => (
                    <div key={s.key} style={{ padding: 10, borderRadius: 10, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18 }}>{s.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#bbf7d0' }}>{s.label}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: s.levelColor }}>{s.avg}%</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#86efac', lineHeight: 1.5 }}>
                        {s.level === 'Mastered' ? '✅ ' : '👍 '}
                        {s.desc} You’ve demonstrated this across {s.attempted}/{s.total} modules.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lacking skills */}
            <div style={{ ...st.recoCard, borderColor: 'rgba(248,113,113,0.25)' }}>
              <h3 style={{ color: '#f87171', fontSize: 14, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ What You're Lacking
                <span style={{ fontSize: 11, color: '#f8717188', fontWeight: 600 }}>({metrics.lackingSkills.length} skills &lt;55%, {metrics.untestedSkills.length} untested)</span>
              </h3>
              {metrics.lackingSkills.length === 0 && metrics.untestedSkills.length === 0 ? (
                <p style={{ color: '#4ade80', fontSize: 13 }}>
                  🎉 No critical skill gaps. You are evenly trained across all dimensions.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {metrics.lackingSkills.map(s => (
                    <div key={s.key} style={{ padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18 }}>{s.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#fecaca' }}>{s.label}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: s.levelColor }}>{s.avg}%</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#fca5a5', lineHeight: 1.5, marginBottom: 6 }}>
                        {s.desc}
                      </div>
                      {s.weakModule && (
                        <button
                          style={{ ...st.playBtn, fontSize: 11, padding: '4px 10px' }}
                          onClick={() => dispatch({ type: 'PLAY_MODULE', payload: { disaster: activeDisaster, module: s.weakModule.id } })}
                        >
                          ↩ Retry {s.weakModule.title}
                        </button>
                      )}
                    </div>
                  ))}
                  {metrics.untestedSkills.map(s => (
                    <div key={s.key} style={{ padding: 10, borderRadius: 10, background: 'rgba(100,116,139,0.06)', border: '1px solid rgba(100,116,139,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18, opacity: 0.6 }}>{s.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>{s.label}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Untested</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
                        Play any module that builds this skill to assess.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ══ HOW TO BECOME BETTER — Personalized next steps ══ */}
          {metrics.nextSteps.length > 0 && (
            <>
              <SectionTitle>🚀 How to Become Better — Your Next {metrics.nextSteps.length} Step{metrics.nextSteps.length === 1 ? '' : 's'}</SectionTitle>
              <div style={st.nextStepsGrid}>
                {metrics.nextSteps.map((step, i) => (
                  <div key={i} style={{ ...st.nextStepCard, borderColor: step.color + '55', background: `linear-gradient(180deg, ${step.color}11, rgba(255,255,255,0.02))` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: step.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>{i+1}</div>
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: step.color, textTransform: 'uppercase' }}>
                        {step.kind === 'retry' ? 'Retry to improve' : step.kind === 'untried' ? 'New challenge' : 'Build skill'}
                      </span>
                    </div>
                    <h4 style={{ fontSize: 15, color: '#f1f5f9', fontWeight: 800, marginBottom: 6 }}>{step.title}</h4>
                    <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.55, marginBottom: 8 }}>{step.why}</p>
                    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '7px 10px', borderLeft: `3px solid ${step.color}`, marginBottom: 12 }}>
                      <div style={{ color: step.color, fontSize: 9, fontWeight: 800, marginBottom: 2, letterSpacing: 1 }}>💡 ACTION</div>
                      <div style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 1.55 }}>{step.action}</div>
                    </div>
                    <button
                      style={{ ...st.playBtn, width: '100%', padding: '8px', fontSize: 12, background: `${step.color}22`, borderColor: step.color, color: step.color }}
                      onClick={() => dispatch({ type: 'PLAY_MODULE', payload: { disaster: activeDisaster, module: step.moduleId } })}
                    >
                      {step.kind === 'untried' ? '▶ Start now' : '↩ Open module'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ══ DEEP ANALYSIS — per-module verdict + tips ══ */}
          <SectionTitle>🔍 Deep Analysis — Per Module</SectionTitle>
          <div style={st.deepGrid}>
            {metrics.moduleInsights.map(m => {
              const bucketColor = m.bucket === 'high' ? '#22c55e' : m.bucket === 'mid' ? '#facc15' : m.bucket === 'low' ? '#ef4444' : '#64748b'
              const bucketLabel = m.bucket === 'high' ? 'STRONG' : m.bucket === 'mid' ? 'OK' : m.bucket === 'low' ? 'WEAK' : 'UNTRIED'
              return (
                <div key={m.id} style={{ ...st.deepCard, borderColor: m.color + '44' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 11, background: `${m.color}22`, border: `1.5px solid ${m.color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{m.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>{m.title}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Mod {m.id} · {m.topic}</div>
                    </div>
                    <div style={{ background: bucketColor + '22', color: bucketColor, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>{bucketLabel}</div>
                  </div>

                  {/* Score line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}><ScoreBar pct={m.score || 0} color={m.tried ? bucketColor : '#334155'} h={8}/></div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: m.tried ? bucketColor : '#475569', minWidth: 44, textAlign: 'right' }}>
                      {m.tried ? `${m.score}%` : '—'}
                    </span>
                  </div>

                  {/* Verdict */}
                  <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 8 }}>{m.verdict}</div>

                  {/* Skills tested */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {m.skills?.map(skKey => {
                      const sk = SKILL_DIMENSIONS.find(x => x.key === skKey)
                      return sk ? (
                        <span key={skKey} style={{ fontSize: 9, color: '#94a3b8', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                          {sk.icon} {sk.label}
                        </span>
                      ) : null
                    })}
                  </div>

                  {/* Tips */}
                  {m.tips.length > 0 && (
                    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '8px 10px', borderLeft: `3px solid ${m.color}` }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: m.color, letterSpacing: 1, marginBottom: 4 }}>
                        {m.bucket === 'high' ? '🏆 KEEP THE EDGE' : m.bucket === 'mid' ? '🎯 PUSH TO MASTERY' : m.bucket === 'low' ? '🛠 FOCUS ON' : '📋 START WITH'}
                      </div>
                      {m.tips.slice(0, 3).map((t, i) => (
                        <div key={i} style={{ fontSize: 10, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 2, display: 'flex', gap: 5 }}>
                          <span style={{ color: m.color }}>•</span>
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    style={{ ...st.playBtn, width: '100%', marginTop: 10, padding: '7px', fontSize: 12, background: `${m.color}22`, borderColor: m.color, color: m.color }}
                    onClick={() => dispatch({ type: 'PLAY_MODULE', payload: { disaster: activeDisaster, module: m.id } })}
                  >
                    {m.tried ? `↩ Retry · best ${m.bestScore || m.score}%` : '▶ Start module'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* ══ SUMMARY STATS FOOTER BAR ══ */}
          <div style={st.statsBar}>
            <StatBox num={metrics.totalAttempted}          label="Attempted"        />
            <div style={st.statsDivider} />
            <StatBox num={metrics.totalPassed}             label="Passed"           numColor="#4ade80" />
            <div style={st.statsDivider} />
            <StatBox num={`${metrics.overallScore}%`}      label="Avg Score"        numColor={metrics.overallGrade.color} />
            <div style={st.statsDivider} />
            <StatBox num={`${metrics.passRate}%`}          label="Pass Rate"        numColor="#60a5fa" />
            <div style={st.statsDivider} />
            <StatBox num={metrics.totalAttempts}           label="Total Tries"      numColor="#a78bfa" />
            <div style={st.statsDivider} />
            <StatBox num={metrics.overallGrade.label}      label="Readiness Level"  numColor={metrics.overallGrade.color} />
          </div>

          {/* ── CTA ── */}
          <div style={{ textAlign: 'center', padding: '28px 0 56px' }}>
            <button
              style={st.primaryBtn}
              onClick={() => dispatch({ type: 'SELECT_DISASTER', payload: activeDisaster })}
            >
              🚀 Continue Training
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tiny helper components ──────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: 14, fontWeight: 700, color: '#f8fafc',
      textTransform: 'uppercase', letterSpacing: 1.5,
      marginBottom: 16, paddingLeft: 12,
      borderLeft: '3px solid #3b82f6',
    }}>
      {children}
    </h2>
  )
}

function StatLine({ label, val, col }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
      <span style={{ color: '#64748b', minWidth: 80 }}>{label}</span>
      <span style={{ color: col || '#e2e8f0', fontWeight: 700 }}>{val}</span>
    </div>
  )
}

function MiniStat({ label, val }) {
  return (
    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '5px 0' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>{val}</div>
      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
    </div>
  )
}

function StatBox({ num, label, numColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 80 }}>
      <span style={{ fontSize: 24, fontWeight: 800, color: numColor || '#f8fafc', lineHeight: 1 }}>{num}</span>
      <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>{label}</span>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const st = {
  page: {
    minHeight: '100vh',
    padding: '0 28px 60px',
    maxWidth: 980,
    margin: '0 auto',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '24px 0 20px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: 20, fontWeight: 800, color: '#f8fafc',
    background: 'linear-gradient(90deg,#60a5fa,#a78bfa)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  backBtn: {
    background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, padding: '6px 0',
  },
  resetBtn: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
    color: '#f87171', cursor: 'pointer', borderRadius: 8,
    fontSize: 13, padding: '6px 14px', fontWeight: 600,
  },
  tabs: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap',
  },
  tab: {
    padding: '8px 22px', borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
    cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.15s',
  },
  tabNote: { fontSize: 12, color: '#334155', marginLeft: 'auto' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '80px 0', textAlign: 'center',
  },
  primaryBtn: {
    padding: '14px 48px', fontSize: 17, fontWeight: 700,
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(37,99,235,0.4)', marginTop: 24,
  },
  heroRow: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 36,
  },
  heroCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 16, padding: 24,
  },
  cardLabel: {
    fontSize: 12, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 1.4, margin: 0,
  },
  phaseGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
    gap: 16, marginBottom: 36,
  },
  phaseCard: {
    borderRadius: 14, padding: 20, border: '1px solid',
    transition: 'transform 0.15s',
  },
  phaseSection: { marginBottom: 20 },
  phaseSectionHeader: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderRadius: 10, border: '1px solid',
    cursor: 'pointer', marginBottom: 0, transition: 'opacity 0.15s',
  },
  moduleList: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    overflow: 'hidden',
    marginBottom: 8,
  },
  moduleRow: {
    display: 'flex', alignItems: 'center', padding: '13px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.1s',
    flexWrap: 'wrap', gap: 10,
  },
  playBtn: {
    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
    color: '#60a5fa', cursor: 'pointer', borderRadius: 6,
    fontSize: 12, padding: '5px 12px', fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  recoGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 36,
  },
  recoCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 22,
  },
  skillBlock: {
    display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(96,165,250,0.06), rgba(167,139,250,0.04))',
    border: '1px solid rgba(96,165,250,0.18)',
    borderRadius: 18, padding: 24, marginBottom: 36,
  },
  nextStepsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 36,
  },
  nextStepCard: {
    border: '1.5px solid', borderRadius: 14, padding: 18,
    boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
  },
  deepGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16, marginBottom: 36,
  },
  deepCard: {
    background: 'rgba(255,255,255,0.025)',
    border: '1.5px solid', borderRadius: 14, padding: 16,
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
  },
  statsBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 16, padding: '22px 24px', marginBottom: 28,
    flexWrap: 'wrap', gap: 12,
  },
  statsDivider: {
    width: 1, height: 44, background: 'rgba(255,255,255,0.08)',
  },
  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
  },
  modal: {
    background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 18, padding: '36px 44px', textAlign: 'center', maxWidth: 380,
  },
  dangerBtn: {
    padding: '10px 20px',
    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
    color: '#f87171', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  },
}
