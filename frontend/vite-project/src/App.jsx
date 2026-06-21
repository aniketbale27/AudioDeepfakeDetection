import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

function asPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }
  return `${(value * 100).toFixed(2)}%`;
}

function predictionTone(prediction) {
  if (prediction === "REAL") {
    return "good";
  }
  if (prediction === "DEEPFAKE") {
    return "risk";
  }
  return "neutral";
}

export default function App() {
  const [activePage, setActivePage] = useState("analysis");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null);
  const [inputKey, setInputKey] = useState(0);

  const [progress, setProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

const [result, setResult] = useState(null);
const [error, setError] = useState("");

const [history, setHistory] = useState([]);

  const navItems = ["analysis", "history", "settings"];

  const steps = useMemo(
    () => [
      "Uploading sample",
      "Loading trained LA/PA models",
      "Extracting audio features",
      "Running ensemble inference",
      "Preparing final report",
    ],
    []
  );

  useEffect(() => {
    if (!isAnalyzing) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + 8));
    }, 320);

    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  useEffect(() => {
  const saved = localStorage.getItem("predictionHistory");

  if (saved) {
    setHistory(JSON.parse(saved));
  }
}, []);

  const progressStepIndex = Math.min(
    steps.length - 1,
    Math.floor((progress / 100) * steps.length)
  );

  const resetAnalysis = () => {
    setSelectedFile(null);
    setInputKey((prev) => prev + 1);
    setProgress(0);
    setIsAnalyzing(false);
    setResult(null);
    setError("");
  };

  const startAnalysis = async (file) => {
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setError("");
    setResult(null);
    setProgress(12);
    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/predict`, {
        method: "POST",
        body: formData,
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          data?.detail || data?.error || `Request failed (${response.status}).`;
        throw new Error(message);
      }

    if (!data?.prediction) {
    throw new Error("Invalid response from prediction API.");
}

const historyItem = {
  id: Date.now(),
  filename: file.name,
  prediction: data.prediction,
  confidence: data.confidence,
  laScore: data.la_score,
  paScore: data.pa_score,
  date: new Date().toLocaleString(),
};

const updatedHistory = [historyItem, ...history];

setHistory(updatedHistory);

localStorage.setItem(
  "predictionHistory",
  JSON.stringify(updatedHistory)
);

setProgress(100);
setResult(data);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process file.";
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app">
      <aside className={`sidebar ${!sidebarOpen ? "collapsed" : ""}`}>
        <div className="brand-block">
          <p className="brand-kicker">Voice Integrity</p>
          <h1>Audio Forensics</h1>
          <p className="brand-subtitle">LA + PA model fusion for spoof analysis</p>
        </div>

        <nav className="nav" aria-label="Main Navigation">
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-item ${activePage === item ? "active" : ""}`}
              onClick={() => setActivePage(item)}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            type="button"
            className="menu-button"
          >
            Menu
          </button>

          <div>
            <h2 className="topbar-title">Forensic Audio Analysis Dashboard</h2>
            <p className="topbar-subtitle">Upload one sample to classify as REAL or DEEPFAKE</p>
          </div>
        </header>

        <section className="content">
          {activePage === "analysis" && (
            <div className="analysis-grid">
              <article className="panel upload-panel">
                <div className="panel-head">
                  <h3>Upload Sample</h3>
                  <p>Supported formats: WAV, FLAC, MP3, M4A, OGG</p>
                </div>

                <label className="file-picker">
                  <input
                    key={inputKey}
                    type="file"
                    accept=".wav,.flac,.mp3,.m4a,.ogg"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) {
                        return;
                      }
                      void startAnalysis(file);
                    }}
                  />
                  <span>Choose Audio File</span>
                </label>

                {selectedFile && (
                  <p className="file-meta">
                    Selected file: <strong>{selectedFile.name}</strong>
                  </p>
                )}

                {isAnalyzing && (
                  <div className="progress">
                    <div className="bar">
                      <div className="fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p>{steps[progressStepIndex]}</p>
                  </div>
                )}

                {error && (
                  <div className="error">
                    <p>{error}</p>
                  </div>
                )}
              </article>

              <article className="panel result-panel">
                {!result && (
                  <div className="empty-state">
                    <h3>Awaiting Analysis</h3>
                    <p>Your result card will appear here after you upload a file.</p>
                  </div>
                )}

                {result && (
                  <>
                    <div className="result-header">
                      <h3>Prediction Report</h3>
                      <span className={`prediction-pill ${predictionTone(result.prediction)}`}>
                        {result.prediction}
                      </span>
                    </div>

                    <div className="result-grid">
                      <div className="metric-card">
                        <p>Final Confidence</p>
                        <h4>{asPercent(result.confidence)}</h4>
                      </div>
                      <div className="metric-card">
                        <p>Ensemble Real Score</p>
                        <h4>{asPercent(result.ensemble_real_score)}</h4>
                      </div>
                      <div className="metric-card">
                        <p>Ensemble Fake Score</p>
                        <h4>{asPercent(result.ensemble_fake_score)}</h4>
                      </div>
                    </div>

                    <div className="model-cards">
                      <div className="model-card">
                        <h4>LA Model</h4>
                        <p>Prediction: {result.la?.prediction ?? "N/A"}</p>
                        <p>Confidence: {asPercent(result.la?.confidence)}</p>
                        <p>Fake Score: {asPercent(result.la_score)}</p>
                      </div>

                      <div className="model-card">
                        <h4>PA Model</h4>
                        <p>Prediction: {result.pa?.prediction ?? "N/A"}</p>
                        <p>Confidence: {asPercent(result.pa?.confidence)}</p>
                        <p>Fake Score: {asPercent(result.pa_score)}</p>
                      </div>
                    </div>

                    <button type="button" className="reset-btn" onClick={resetAnalysis}>
                      Analyze Another File
                    </button>
                  </>
                )}
              </article>
            </div>
          )}
{activePage === "history" && (
  <div className="placeholder-card">

    <h3>Prediction History</h3>

    {history.length === 0 ? (
      <p>No previous analyses available.</p>
    ) : (
      history.map((item) => (
        <div className="history-card" key={item.id}>

          <h4>{item.filename}</h4>

          <p>
            Prediction:
            <strong> {item.prediction}</strong>
          </p>

          <p>
            Confidence:
            {(item.confidence * 100).toFixed(2)}%
          </p>

          {item.laScore !== undefined && (
            <p>
              LA Score:
              {(item.laScore * 100).toFixed(2)}%
            </p>
          )}

          {item.paScore !== undefined && (
            <p>
              PA Score:
              {(item.paScore * 100).toFixed(2)}%
            </p>
          )}

          <p>{item.date}</p>

        </div>
      ))
    )}

    <button
      className="reset-btn"
      onClick={() => {
        localStorage.removeItem("predictionHistory");
        setHistory([]);
      }}
    >
      Clear History
    </button>

  </div>
)}
          {activePage === "settings" && (
            <div className="placeholder-card">
              <h3>Settings</h3>
              <p>Model and API preferences can be configured here.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
