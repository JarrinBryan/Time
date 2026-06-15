import { useState, useEffect, useCallback } from 'react'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

export default function TaskList({ onDoneCountChange }) {
  const [tasks, setTasks]   = useState([])
  const [input, setInput]   = useState('')

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ff_tasks') || '[]')
      setTasks(saved)
    } catch(e) {}
  }, [])

  const saveTasks = useCallback((next) => {
    localStorage.setItem('ff_tasks', JSON.stringify(next))
    const todayDone = next.filter(t => t.date === todayKey() && t.done).length
    onDoneCountChange(todayDone)
  }, [onDoneCountChange])

  const addTask = () => {
    const text = input.trim()
    if (!text) return
    const next = [...tasks, { id: Date.now(), text, done: false, date: todayKey() }]
    setTasks(next)
    saveTasks(next)
    setInput('')
  }

  const toggleTask = (id) => {
    const next = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
    setTasks(next)
    saveTasks(next)
  }

  const deleteTask = (id) => {
    const next = tasks.filter(t => t.id !== id)
    setTasks(next)
    saveTasks(next)
  }

  const todayTasks = tasks.filter(t => t.date === todayKey())
  const doneCount  = todayTasks.filter(t => t.done).length

  return (
    <div className="card" style={{ flex: 1 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.75rem' }}>
        <div className="card-title" style={{ margin: 0 }}>Tareas de hoy</div>
        <div style={{ fontSize:'.72rem', color:'var(--text3)' }}>
          {doneCount} de {todayTasks.length} completadas
        </div>
      </div>

      {/* INPUT */}
      <div style={{ display:'flex', gap:'.5rem', marginBottom:'.85rem' }}>
        <input
          style={{
            flex: 1,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            color: 'var(--text)',
            padding: '.55rem .85rem',
            fontSize: '.82rem',
            outline: 'none',
          }}
          placeholder="Añade una tarea..."
          maxLength={80}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          onFocus={e => e.target.style.borderColor='var(--accent)'}
          onBlur={e  => e.target.style.borderColor='var(--border)'}
        />
        <button
          onClick={addTask}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all .15s',
          }}
        >+</button>
      </div>

      {/* LIST */}
      <div style={{ display:'flex', flexDirection:'column', gap:'.4rem', maxHeight:'320px', overflowY:'auto', paddingRight:'2px' }}>
        {todayTasks.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text3)', fontSize:'.8rem' }}>
            <div style={{ fontSize:'2rem', marginBottom:'.5rem', opacity:.4 }}>📝</div>
            <div>Sin tareas todavía</div>
            <div style={{ marginTop:'.25rem', fontSize:'.72rem' }}>Escribe algo arriba para empezar</div>
          </div>
        ) : todayTasks.map(task => (
          <div
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.6rem',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '.55rem .75rem',
              transition: 'all .2s',
              opacity: task.done ? 0.65 : 1,
            }}
          >
            {/* CHECK */}
            <div
              onClick={() => toggleTask(task.id)}
              style={{
                width: '20px', height: '20px',
                borderRadius: '6px',
                border: task.done ? 'none' : '2px solid var(--border)',
                background: task.done ? 'var(--green)' : 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all .2s',
              }}
            >
              {task.done && (
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2"
                    fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>

            {/* TEXT */}
            <div style={{
              flex: 1,
              fontSize: '.82rem',
              lineHeight: 1.3,
              textDecoration: task.done ? 'line-through' : 'none',
              color: task.done ? 'var(--text3)' : 'var(--text)',
            }}>
              {task.text}
            </div>

            {/* DELETE */}
            <button
              onClick={() => deleteTask(task.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text3)',
                cursor: 'pointer',
                padding: '.2rem',
                borderRadius: '5px',
                display: 'flex',
                transition: 'color .2s',
              }}
              title="Eliminar"
            >
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}