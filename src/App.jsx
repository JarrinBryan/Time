import "./styles/App.css";
import Timer from "./components/Timer";

function App() {
  return (
    <main className="app">
      <div className="dashboard">

        <header className="header">
          <h1>FocusFlow</h1>
          <p>Organiza tu tiempo y tareas</p>
        </header>

        <section className="content">

          <div className="left-panel">
            <Timer />
          </div>

          <div className="right-panel">
            <h2>Tareas de Hoy</h2>
          </div>

        </section>

      </div>
    </main>
  );
}

export default App;