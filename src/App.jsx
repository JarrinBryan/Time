import { useState, useEffect, useCallback } from 'react'
import Timer from './components/Timer'
import TaskList from './components/TaskList'
import './styles/global.css'
import './styles/App.css'

const QUOTES = [
  "El éxito es la suma de pequeños esfuerzos repetidos día a día.",
  "No tienes que ser brillante, solo consistente.",
  "Una tarea a la vez. Eso es todo.",
  "El foco es el superpoder del siglo 21.",
  "Avanza despacio, pero nunca te detengas.",
  "Haz algo hoy que tu yo del futuro agradezca.",
  "La disciplina es elegir entre lo que quieres ahora y lo que quieres más.",
  "Pequeños pasos cada día llevan lejos.",
]

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
}

function App() {
  const [pomsDone, setPomsDone]       = useState(0)
  const [focusMinutes, setFocusMinutes] = useState(0)
  const [goalTarget, setGoalTarget]   = useState(6)
  const [heatData, setHeatData]       = useState({})
  const [tasksDoneCount, setTasksDoneCount] = useState(0)
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  // Load from localStorage
  useEffect(() => {
    const key = todayKey()
    setPomsDone(parseInt(localStorage.getItem('ff_poms_' + key) || '0'))
    setFocusMinutes(parseFloat(localStorage.getItem('ff_focus_' + key) || '0'))
    setGoalTarget(parseInt(localStorage.getItem('ff_goal') || '6'))
    try {
      setHeatData(JSON.parse(localStorage.getItem('ff_heat') || '{}'))
    } catch(e) {}
  }, [])

  const handlePomComplete = useCallback(() => {
    const key = todayKey()
    setPomsDone(prev => {
      const next = prev + 1
      localStorage.setItem('ff_poms_' + key, next)
      return next
    })
    setHeatData(prev => {
      const next = { ...prev, [key]: (prev[key] || 0) + 1 }
      localStorage.setItem('ff_heat', JSON.stringify(next))
      return next
    })
  }, [])

  const handleFocusTick = useCallback(() => {
    setFocusMinutes(prev => {
      const next = prev + (1/60)
      localStorage.setItem('ff_focus_' + todayKey(), next)
      return next
    })
  }, [])

  const changeGoal = (delta) => {
    setGoalTarget(prev => {
      const next = Math.max(1, Math.min(20, prev + delta))
      localStorage.setItem('ff_goal', next)
      return next
    })
  }

  const now = new Date()
  const dateStr = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`
  const goalPct = Math.min(100, Math.round(pomsDone / goalTarget * 100))

  return (
    <>
      <div id="app-root">
        {/* HEADER */}
        <header className="app-header">
          <div className="logo">
            <div className="logo-icon">🎯</div>
            <div className="logo-text">Focus<span>Flow</span></div>
          </div>
          <div className="header-right">
            <div className="streak-badge">🔥 1 día</div>
            <div className="date-badge">{dateStr}</div>
          </div>
        </header>

        <div className="main-grid">
          {/* LEFT */}
          <div className="left-col">
            <Timer
              onPomComplete={handlePomComplete}
              onFocusTick={handleFocusTick}
              pomsDone={pomsDone}
              quote={quote}
            />

            {/* GOAL */}
            <div className="card">
              <div className="card-title">Objetivo del día</div>
              <div className="goal-row">
                <span className="goal-label">
                  Meta: <strong>{goalTarget}</strong> pomodoros
                </span>
                <span className="goal-count">
                  {Math.min(pomsDone, goalTarget)}/{goalTarget}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: goalPct + '%' }} />
              </div>
              <div className="goal-btns">
                <button className="goal-btn" onClick={() => changeGoal(-1)}>− Meta</button>
                <button className="goal-btn" onClick={() => changeGoal(1)}>+ Meta</button>
              </div>
            </div>

            {/* STATS */}
            <div className="card">
              <div className="card-title">Estadísticas de hoy</div>
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-value stat-poms">{pomsDone}</div>
                  <div className="stat-label">Pomodoros</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value stat-tasks">{tasksDoneCount}</div>
                  <div className="stat-label">Tareas hechas</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value stat-focus">{Math.round(focusMinutes)}m</div>
                  <div className="stat-label">Enfocado</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="right-col">
            <TaskList onDoneCountChange={setTasksDoneCount} />
            <Heatmap heatData={heatData} />
          </div>
        </div>
      </div>
    </>
  )
}

/* ── HEATMAP (inline en App para no crear archivo extra) ── */
function Heatmap({ heatData }) {
  const weeks = 12
  const today = new Date()
  const days  = weeks * 7
  const dayRows = Array.from({ length: 7 }, () => [])

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
    const v   = Math.min(5, heatData[key] || 0)
    const mon = MONTHS[d.getMonth()]
    const tip = `${d.getDate()} ${mon}: ${heatData[key] || 0} pomodoros`
    const dow = d.getDay()
    dayRows[dow].push(
      <div key={key} className="heatmap-cell" data-v={v} data-tip={tip} />
    )
  }

  return (
    <div className="card">
      <div className="card-title">Actividad — últimas 12 semanas</div>
      <div className="heatmap-grid">
        {dayRows.map((row, i) => (
          <div key={i} className="heatmap-row">{row}</div>
        ))}
      </div>
      <div className="hm-legend">
        Menos
        <div className="hm-legend-cells">
          {['var(--surface3)','rgba(99,102,241,.3)','rgba(99,102,241,.5)','rgba(99,102,241,.7)','var(--accent)'].map((bg, i) => (
            <div key={i} className="hm-lc" style={{ background: bg }} />
          ))}
        </div>
        Más
      </div>
    </div>
  )
}

export default App