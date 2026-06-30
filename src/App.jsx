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
  const [pomsDone,       setPomsDone]       = useState(0)
  const [focusMinutes,   setFocusMinutes]   = useState(0)
  const [goalTarget,     setGoalTarget]     = useState(6)
  const [tasksDoneCount, setTasksDoneCount] = useState(0)
  const [tasks,          setTasks]          = useState([])  // ← compartido
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  useEffect(() => {
    const key = todayKey()
    setPomsDone(parseInt(localStorage.getItem('ff_poms_' + key) || '0'))
    setFocusMinutes(parseFloat(localStorage.getItem('ff_focus_' + key) || '0'))
    setGoalTarget(parseInt(localStorage.getItem('ff_goal') || '6'))
    try { setTasks(JSON.parse(localStorage.getItem('ff_tasks') || '[]')) } catch(e) {}
  }, [])

  const handlePomComplete = useCallback((completed) => {
    if (!completed) return
    const key = todayKey()
    setPomsDone(prev => {
      const next = prev + 1
      localStorage.setItem('ff_poms_' + key, next)
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

  // Cuando el Timer confirma que una tarea se completó
  const handleTaskComplete = useCallback((taskId, dateK, completed) => {
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id !== taskId) return t
        const done = t.done || []
        if (completed === true || completed === 'partial') {
          return done.includes(dateK) ? t : { ...t, done: [...done, dateK] }
        }
        return t  // no completó, no marcar
      })
      localStorage.setItem('ff_tasks', JSON.stringify(next))
      // Actualizar contador
      const today = todayKey()
      const count = next.filter(t => t.date === today && t.done?.includes(today)).length
      setTasksDoneCount(count)
      return next
    })
  }, [])

  // Sincronizar tasks cuando TaskList las actualiza
  const handleTasksChange = useCallback((updatedTasks) => {
    setTasks(updatedTasks)
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

  // Tareas de hoy para el contador
  const today      = todayKey()
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
          <div className="streak-badge">🔥 1 día</div>
          <div className="date-badge">{dateStr}</div>
        </div>
      </header>

      <div className="main-grid">
        {/* IZQUIERDA */}
        <div className="left-col">
          <Timer
            onPomComplete={handlePomComplete}
            onFocusTick={handleFocusTick}
            onTaskComplete={handleTaskComplete}
            pomsDone={pomsDone}
            quote={quote}
            tasks={tasks}
          />

          {/* OBJETIVO */}
          <div className="card">
            <div className="card-title">Objetivo del día</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.3rem' }}>
              <span style={{ fontSize:'.82rem', color:'var(--text2)' }}>
                Actividades completadas hoy
              </span>
              <span style={{ fontSize:'.82rem', color:'var(--text2)', fontWeight:700 }}>
                {todayDone}/{todayTasks.length || goalTarget}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{
                width: todayTasks.length > 0
                  ? Math.round(todayDone/todayTasks.length*100)+'%'
                  : '0%'
              }}/>
            </div>
            {todayTasks.length > 0 && (
              <div style={{ marginTop:'.6rem', display:'flex', flexDirection:'column', gap:'.3rem' }}>
                {todayTasks.map(t => {
                  const isDone = t.done?.includes(today)
                  return (
                    <div key={t.id} style={{
                      display:'flex', alignItems:'center', gap:'.5rem',
                      fontSize:'.75rem', color: isDone ? 'var(--green)' : 'var(--text3)',
                    }}>
                      <span>{isDone ? '✅' : '⬜'}</span>
                      <span style={{ flex:1, textDecoration: isDone?'line-through':'none' }}>
                        {t.text}
                      </span>
                      <span style={{ color:'var(--text3)', fontSize:'.68rem' }}>
                        {t.time}
                      </span>
                    </div>
                  )
                })}
              </div>
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

        {/* DERECHA */}
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