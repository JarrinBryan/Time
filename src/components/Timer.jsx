import { useState, useEffect } from "react";
import "../styles/Timer.css";

function Timer() {
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval;

    if (isRunning && time > 0) {
      interval = setInterval(() => {
        setTime((prev) => prev - 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, time]);

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;

    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(25 * 60);
  };

  return (
    <div className="timer">
      <h2 className="timer-mode">
        {isRunning ? "Enfoque" : "Listo para comenzar"}
      </h2>

      <div className="timer-display">
        {formatTime(time)}
      </div>

      <div className="controls">
        <button onClick={() => setIsRunning(true)}>
          Iniciar
        </button>

        <button onClick={() => setIsRunning(false)}>
          Pausar
        </button>

        <button onClick={handleReset}>
          Reiniciar
        </button>
      </div>
    </div>
  );
}

export default Timer;