import { useState, useEffect, useCallback, useRef } from 'react'
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
  const [pomsDone,       setPomsDone]       = useState(0)
  const [focusMinutes,   setFocusMinutes]   = useState(0)
  const [tasksDoneCount, setTasksDoneCount] = useState(0)
  const [tasks,          setTasks]          = useState([])
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  // Calcular racha real
  const [streak, setStreak] = useState(1)

  useEffect(() => {
    const key = todayKey()
    setPomsDone(parseInt(localStorage.getItem('ff_poms_' + key) || '0'))
    setFocusMinutes(parseFloat(localStorage.getItem('ff_focus_' + key) || '0'))
    try {
      const saved = JSON.parse(localStorage.getItem('ff_tasks') || '[]')
      setTasks(saved)
      // Contar tareas completadas hoy
      const done = saved.filter(t => t.date === key && t.done?.includes(key)).length
      setTasksDoneCount(done)
    } catch(e) {}

    // Calcular racha
    calcStreak()
  }, [])

  const calcStreak = () => {
    try {
      const heat = JSON.parse(localStorage.getItem('ff_heat') || '{}')
      let count = 0
      const today = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const k = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
        if (heat[k] && heat[k] > 0) { count++ } else if (i > 0) { break }
      }
      setStreak(Math.max(1, count))
    } catch(e) { setStreak(1) }
  }

  const handlePomComplete = useCallback((completed) => {
    if (!completed) return
    const key = todayKey()
    setPomsDone(prev => {
      const next = prev + 1
      localStorage.setItem('ff_poms_' + key, next)
      // Actualizar heatmap
      try {
        const heat = JSON.parse(localStorage.getItem('ff_heat') || '{}')
        heat[key] = (heat[key] || 0) + 1
        localStorage.setItem('ff_heat', JSON.stringify(heat))
      } catch(e) {}
      return next
    })
    calcStreak()
  }, [])

  const handleFocusTick = useCallback(() => {
    setFocusMinutes(prev => {
      const next = prev + (1/60)
      localStorage.setItem('ff_focus_' + todayKey(), next)
      return next
    })
  }, [])

  // Timer completa una tarea del calendario
  const handleTaskComplete = useCallback((taskId, dateK, result) => {
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id !== taskId) return t
        const done = t.done || []
        // Solo marcar si dijo que sí o parcialmente
        if ((result === true || result === 'partial') && !done.includes(dateK)) {
          return { ...t, done: [...done, dateK] }
        }
        return t
      })
      localStorage.setItem('ff_tasks', JSON.stringify(next))
      const today = todayKey()
      const count = next.filter(t => t.date === today && t.done?.includes(today)).length
      setTasksDoneCount(count)
      return next
    })
  }, [])

  // TaskList notifica cambios de tareas a App
  const handleTasksChange = useCallback((updatedTasks) => {
    setTasks(updatedTasks)
    const today = todayKey()
    const count = updatedTasks.filter(t => t.date === today && t.done?.includes(today)).length
    setTasksDoneCount(count)
  }, [])

  const now     = new Date()
  const dateStr = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`
  const today   = todayKey()
  const todayTasks = tasks.filter(t => t.date === today)
  const todayDone  = todayTasks.filter(t => t.done?.includes(today)).length

  return (
    <div id="app-root">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">🎯</div>
          <div className="logo-text">Focus<span>Flow</span></div>
        </div>
        <div className="header-right">
          <div className="streak-badge">🔥 {streak} {streak === 1 ? 'día' : 'días'}</div>
          <div className="date-badge">{dateStr}</div>
        </div>
      </header>

      <div className="main-grid">
        {/* IZQUIERDA */}
        <div className="left-col">

          {/* TIMER — recibe tasks directamente */}
          <Timer
            onPomComplete={handlePomComplete}
            onFocusTick={handleFocusTick}
            onTaskComplete={handleTaskComplete}
            pomsDone={pomsDone}
            quote={quote}
            tasks={tasks}
          />

          {/* OBJETIVO DEL DÍA */}
          <div className="card">
            <div className="card-title">Objetivo del día</div>

            {todayTasks.length === 0 ? (
              <div style={{ fontSize:'.8rem', color:'var(--text3)', textAlign:'center',
                padding:'.75rem 0' }}>
                Sin actividades para hoy.<br/>
                <span style={{ fontSize:'.72rem' }}>Añade algo en el calendario →</span>
              </div>
            ) : (
              <>
                {/* Barra de progreso */}
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:'.4rem' }}>
                  <span style={{ fontSize:'.78rem', color:'var(--text2)' }}>
                    Actividades completadas
                  </span>
                  <span style={{ fontSize:'.78rem', fontWeight:700, color:'var(--text2)' }}>
                    {todayDone}/{todayTasks.length}
                  </span>
                </div>
                <div className="progress-bar" style={{ marginBottom:'.75rem' }}>
                  <div className="progress-fill" style={{
                    width: todayTasks.length > 0
                      ? Math.round(todayDone / todayTasks.length * 100) + '%'
                      : '0%'
                  }}/>
                </div>

                {/* Lista de actividades de hoy */}
                <div style={{ display:'flex', flexDirection:'column', gap:'.3rem' }}>
                  {todayTasks
                    .sort((a,b) => (a.time||'').localeCompare(b.time||''))
                    .map(t => {
                      const isDone = t.done?.includes(today)
                      return (
                        <div key={t.id} style={{
                          display:'flex', alignItems:'center', gap:'.5rem',
                          padding:'.35rem .5rem',
                          background: isDone ? 'rgba(16,185,129,0.08)' : 'var(--surface2)',
                          borderRadius:'8px',
                          border: `1px solid ${isDone ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
                        }}>
                          <span style={{ fontSize:'.85rem' }}>{isDone ? '✅' : '⬜'}</span>
                          <span style={{
                            flex:1, fontSize:'.78rem',
                            color: isDone ? 'var(--green)' : 'var(--text)',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}>
                            {t.text}
                          </span>
                          {t.time && (
                            <span style={{ fontSize:'.68rem', color:'var(--text3)',
                              flexShrink:0 }}>
                              {t.time}
                            </span>
                          )}
                        </div>
                      )
                  })}
                </div>
              </>
            )}
          </div>

          {/* ESTADÍSTICAS */}
          <div className="card">
            <div className="card-title">Estadísticas de hoy</div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value stat-poms">{pomsDone}</div>
                <div className="stat-label">Sesiones</div>
              </div>
              <div className="stat-card">
                <div className="stat-value stat-tasks">{todayDone}</div>
                <div className="stat-label">Completadas</div>
              </div>
              <div className="stat-card">
                <div className="stat-value stat-focus">{Math.round(focusMinutes)}m</div>
                <div className="stat-label">Enfocado</div>
              </div>
            </div>
          </div>
        </div>

        {/* DERECHA — calendario */}
        <div className="right-col">
          <TaskList
            onDoneCountChange={setTasksDoneCount}
            onTasksChange={handleTasksChange}
            externalTasks={tasks}
          />
        </div>
      </div>
    </div>
  )
}

export default App