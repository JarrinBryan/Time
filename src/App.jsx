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

const MONTHS     = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DAYS       = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DAYS_SHORT = ['D','L','M','X','J','V','S']

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
}

function App() {
  const [pomsDone,       setPomsDone]       = useState(0)
  const [focusMinutes,   setFocusMinutes]   = useState(0)
  const [goalTarget,     setGoalTarget]     = useState(6)
  const [heatData,       setHeatData]       = useState({})
  const [tasksDoneCount, setTasksDoneCount] = useState(0)
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  useEffect(() => {
    const key = todayKey()
    setPomsDone(parseInt(localStorage.getItem('ff_poms_' + key) || '0'))
    setFocusMinutes(parseFloat(localStorage.getItem('ff_focus_' + key) || '0'))
    setGoalTarget(parseInt(localStorage.getItem('ff_goal') || '6'))
    try { setHeatData(JSON.parse(localStorage.getItem('ff_heat') || '{}')) } catch(e) {}
  }, [])

  const handlePomComplete = useCallback((completed) => {
    const key = todayKey()
    setPomsDone(prev => {
      const next = prev + 1
      localStorage.setItem('ff_poms_' + key, next)
      return next
    })
    if (completed) {
      setHeatData(prev => {
        const next = { ...prev, [key]: (prev[key] || 0) + 1 }
        localStorage.setItem('ff_heat', JSON.stringify(next))
        return next
      })
    }
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

  const now     = new Date()
  const dateStr = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`
  const goalPct = Math.min(100, Math.round(pomsDone / goalTarget * 100))

  return (
    <div id="app-root">
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
        {/* COLUMNA IZQUIERDA */}
        <div className="left-col">
          <Timer
            onPomComplete={handlePomComplete}
            onFocusTick={handleFocusTick}
            pomsDone={pomsDone}
            quote={quote}
          />

          {/* OBJETIVO */}
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

          {/* ESTADÍSTICAS */}
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

        {/* COLUMNA DERECHA */}
        <div className="right-col">
          <TaskList onDoneCountChange={setTasksDoneCount} />
          <Heatmap heatData={heatData} />
        </div>
      </div>
    </div>
  )
}

/* ── HEATMAP ── */
function Heatmap({ heatData }) {
  const weeks = 12
  const today = new Date()

  const grid = Array.from({ length: 7 }, () => [])

  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d   = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
    const v   = Math.min(5, heatData[key] || 0)
    const dow = d.getDay()
    const tip = `${d.getDate()} ${MONTHS[d.getMonth()]}: ${heatData[key] || 0} pomodoros`
    grid[dow].push({ key, v, tip, d: new Date(d) })
  }

  // Etiquetas de mes por columna
  const weekLabels = []
  for (let w = 0; w < weeks; w++) {
    const col  = grid.find(row => row[w])
    const cell = col ? col[w] : null
    if (cell) {
      const prevCol  = grid.find(r => r[w - 1])
      const prevCell = prevCol ? prevCol[w - 1] : null
      const showMonth = !prevCell || prevCell.d.getMonth() !== cell.d.getMonth()
      weekLabels.push({ w, label: showMonth ? MONTHS[cell.d.getMonth()] : '' })
    } else {
      weekLabels.push({ w, label: '' })
    }
  }

  return (
    <div className="card">
      <div className="card-title">Actividad — últimas 12 semanas</div>

      <div style={{ overflowX: 'auto' }}>
        {/* Etiquetas de mes */}
        <div style={{ display:'flex', marginLeft:'24px', marginBottom:'4px' }}>
          {weekLabels.map(({ w, label }) => (
            <div key={w} style={{
              width:'17px', fontSize:'.6rem', color:'var(--text3)',
              flexShrink:0, textAlign:'left', overflow:'hidden',
            }}>
              {label}
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:'4px' }}>
          {/* Etiquetas de día L M X J V S D */}
          <div style={{ display:'flex', flexDirection:'column', gap:'3px', marginRight:'2px' }}>
            {DAYS_SHORT.map((d, i) => (
              <div key={i} style={{
                width:'18px', height:'14px', fontSize:'.6rem',
                color:'var(--text3)', display:'flex',
                alignItems:'center', justifyContent:'flex-end', flexShrink:0,
              }}>
                {i % 2 === 1 ? d : ''}
              </div>
            ))}
          </div>

          {/* Grid de celdas */}
          <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} style={{ display:'flex', gap:'3px' }}>
                {row.map(cell => (
                  <div
                    key={cell.key}
                    className="heatmap-cell"
                    data-v={cell.v}
                    data-tip={cell.tip}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hm-legend">
        Menos
        <div className="hm-legend-cells">
          {[
            'var(--surface3)',
            'rgba(99,102,241,.25)',
            'rgba(99,102,241,.45)',
            'rgba(99,102,241,.7)',
            'var(--accent)',
          ].map((bg, i) => (
            <div key={i} className="hm-lc" style={{ background: bg }} />
          ))}
        </div>
        Más
      </div>
    </div>
  )
}

export default App