import { createContext, useContext, useReducer, useEffect } from 'react'

const GameContext = createContext()

const STORAGE_KEY = 'disaster-sim-v1'

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const { scores, completedModules } = JSON.parse(raw)
      return { scores: scores || {}, completedModules: completedModules || [] }
    }
  } catch {}
  return { scores: {}, completedModules: [] }
}

const persisted = loadPersisted()

const initialState = {
  screen: 'mainMenu',        // mainMenu | disasterSelect | moduleSelect | module | metrics
  selectedDisaster: null,
  selectedModule: null,
  scores: persisted.scores,               // { "flood-1": { score, passed, attempts, bestScore, ... } }
  completedModules: persisted.completedModules,
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, screen: action.payload }

    case 'SELECT_DISASTER':
      return { ...state, selectedDisaster: action.payload, screen: 'moduleSelect' }

    case 'SELECT_MODULE':
      return { ...state, selectedModule: action.payload, screen: 'module' }

    // Jump directly to a module from any screen (e.g. Metrics dashboard)
    case 'PLAY_MODULE':
      return {
        ...state,
        selectedDisaster: action.payload.disaster,
        selectedModule: action.payload.module,
        screen: 'module',
      }

    case 'RECORD_SCORE': {
      const { key, result } = action.payload
      const prev = state.scores[key] || {}
      const attempts = (prev.attempts || 0) + 1
      // Always clamp to 0-100 regardless of what any module sends
      const clampedScore = Math.max(0, Math.min(100, Math.round(result.score)))
      const bestScore = Math.max(clampedScore, prev.bestScore || 0)
      const merged = { ...result, score: clampedScore, bestScore, attempts }
      return {
        ...state,
        scores: { ...state.scores, [key]: merged },
        completedModules: result.passed
          ? [...new Set([...state.completedModules, key])]
          : state.completedModules,
      }
    }

    case 'RESET_PROGRESS':
      return { ...state, scores: {}, completedModules: [] }

    case 'BACK_TO_MODULES':
      return { ...state, screen: 'moduleSelect', selectedModule: null }

    case 'BACK_TO_DISASTERS':
      return { ...state, screen: 'disasterSelect', selectedDisaster: null, selectedModule: null }

    case 'BACK_TO_MENU':
      return { ...state, screen: 'mainMenu', selectedDisaster: null, selectedModule: null }

    default:
      return state
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  // Persist scores + completedModules to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ scores: state.scores, completedModules: state.completedModules })
      )
    } catch {}
  }, [state.scores, state.completedModules])

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
