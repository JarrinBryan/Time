import "./styles/App.css";
import Timer from "./components/Timer";
import Controls from "./components/Controls";

function App() {
  return (
    <main className="app">
      <section className="pomodoro-card">
        <h1>FocusFlow</h1>

        <Timer />

        <Controls />
      </section>
    </main>
  );
}

export default App;