import { GameProvider, useGame } from './context/GameContext'
import MainMenu from './components/MainMenu'
import DisasterSelect from './components/DisasterSelect'
import ModuleSelect from './components/ModuleSelect'
import MetricsDashboard from './components/MetricsDashboard'
import SourcesPanel from './components/SourcesPanel'
import Presentation from './components/Presentation'
import IronTide from './modules/IronTide'
import { getModuleSources } from './data/moduleSources'
import GoBagModule from './modules/flood/Module1_GoBag'
import HomeDefenseModule from './modules/flood/Module2_HomeDefense'
import YardLockdownModule from './modules/flood/Module3_YardLockdown'
import SinkingCarModule from './modules/flood/Module4_SinkingCar'
import TreacherousTrekModule from './modules/flood/Module5_TreacherousTrek'
import FirstResponderModule from './modules/flood/Module6_FirstResponder'
import CampSafeHavenModule from './modules/flood/Module7_CampSafeHaven'
import SOSSignalingModule from './modules/flood/Module8_SOSSignaling'
import ToxicCleanupModule from './modules/flood/Module9_ToxicCleanup'
import InvisibleTrapModule from './modules/flood/Module10_InvisibleTrap'
import ToxicSoupModule from './modules/flood/Module11_ToxicSoup'
import WallOfWaterModule from './modules/flood/Module12_WallOfWater'
import CalmMindModule from './modules/flood/Module13_CalmMind'
import TheSwarmModule from './modules/flood/Module14_TheSwarm'

function Router() {
  const { state } = useGame()

  switch (state.screen) {
    case 'mainMenu':      return <MainMenu />
    case 'disasterSelect': return <DisasterSelect />
    case 'moduleSelect':   return <ModuleSelect />
    case 'module':         return <ModuleRouter />
    case 'metrics':        return <MetricsDashboard />
    case 'presentation':   return <Presentation />
    case 'ironTide':       return <IronTide />
    default:               return <MainMenu />
  }
}

function ModuleRouter() {
  const { state } = useGame()
  const { selectedDisaster, selectedModule } = state

  // Resolve the module component
  let moduleEl = <ModulePlaceholder />
  if (selectedDisaster === 'flood') {
    switch (selectedModule) {
      case 1:  moduleEl = <GoBagModule />;        break
      case 2:  moduleEl = <HomeDefenseModule />;   break
      case 3:  moduleEl = <YardLockdownModule />;  break
      case 4:  moduleEl = <SinkingCarModule />;    break
      case 5:  moduleEl = <TreacherousTrekModule />; break
      case 6:  moduleEl = <FirstResponderModule />; break
      case 7:  moduleEl = <CampSafeHavenModule />; break
      case 8:  moduleEl = <SOSSignalingModule />;  break
      case 9:  moduleEl = <ToxicCleanupModule />;  break
      case 10: moduleEl = <InvisibleTrapModule />; break
      case 11: moduleEl = <ToxicSoupModule />;     break
      case 12: moduleEl = <WallOfWaterModule />;   break
      case 13: moduleEl = <CalmMindModule />;      break
      case 14: moduleEl = <TheSwarmModule />;      break
      default: break
    }
  }

  // Inject the sources panel once — it floats over whatever the module renders
  const sources = getModuleSources(selectedDisaster, selectedModule)

  return (
    <>
      {moduleEl}
      <SourcesPanel moduleData={sources} />
    </>
  )
}

function ModulePlaceholder() {
  const { state, dispatch } = useGame()
  return (
    <div style={styles.placeholder}>
      <h2 style={{ color: '#f1f5f9' }}>Module {state.selectedModule} — Coming Soon</h2>
      <p style={{ marginTop: 12, color: '#94a3b8' }}>This module is under construction.</p>
      <button style={styles.backBtn} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
        ← Back to Modules
      </button>
    </div>
  )
}

const styles = {
  placeholder: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100vh', textAlign: 'center',
    color: '#f1f5f9',
  },
  backBtn: {
    marginTop: 24, padding: '10px 28px', background: '#334155',
    color: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: 16,
  },
}

export default function App() {
  return (
    <GameProvider>
      <Router />
    </GameProvider>
  )
}
