import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const HISTORY_KEY = "predictionHistory";

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(1, number));
}

function asPercent(value) {
  return `${(clampScore(value) * 100).toFixed(2)}%`;
}

function fileSizeLabel(file) {
  if (!file) {
    return "No file selected";
  }
  if (file.size < 1024 * 1024) {
    return `${(file.size / 1024).toFixed(1)} KB`;
  }
  return `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
}

function predictionTone(prediction) {
  return prediction === "REAL" ? "real" : "fake";
}

function modelAgreement(result) {
  if (!result?.la?.prediction || !result?.pa?.prediction) {
    return "Model agreement unavailable";
  }
  return result.la.prediction === result.pa.prediction
    ? "LA and PA models agree"
    : "LA and PA models disagree";
}

function createReportHtml({ result, fileName, analyzedAt }) {
  const prediction = result.prediction || "N/A";
  const realScore = clampScore(result.ensemble_real_score);
  const fakeScore = clampScore(result.ensemble_fake_score);
  const laScore = clampScore(result.la_score);
  const paScore = clampScore(result.pa_score);
  const confidence = clampScore(result.confidence);
  const tone = prediction === "REAL" ? "#12715b" : "#a64212";
  const decisionBasis =
    fakeScore > realScore
      ? "The ensemble fake score is higher than the real score, so the file is classified as DEEPFAKE."
      : "The ensemble real score is higher than or equal to the fake score, so the file is classified as REAL.";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Audio Forensics Report - ${fileName}</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #f3f7f4; color: #13211d; }
    .report { max-width: 980px; margin: 0 auto; padding: 36px 24px; }
    .hero { border: 1px solid #c9d9d1; background: #ffffff; padding: 26px; border-radius: 8px; }
    .kicker { margin: 0 0 8px; color: #55746b; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; }
    h1 { margin: 0; font-size: 30px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
    .metric { border: 1px solid #d6e2dc; background: #f8fbf9; padding: 14px; border-radius: 8px; }
    .metric span { display: block; color: #587168; font-size: 13px; }
    .metric strong { display: block; margin-top: 6px; font-size: 22px; }
    .badge { display: inline-block; margin-top: 16px; padding: 8px 12px; border-radius: 999px; color: #ffffff; background: ${tone}; font-weight: 700; }
    .section { margin-top: 18px; border: 1px solid #d6e2dc; background: #ffffff; padding: 20px; border-radius: 8px; }
    .bar-row { margin: 14px 0; }
    .bar-label { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
    .bar { height: 14px; background: #e7eee9; border-radius: 999px; overflow: hidden; }
    .fill { height: 100%; border-radius: inherit; }
    .fill.real { width: ${realScore * 100}%; background: #12715b; }
    .fill.fake { width: ${fakeScore * 100}%; background: #c75a20; }
    .fill.la { width: ${laScore * 100}%; background: #2f6ca3; }
    .fill.pa { width: ${paScore * 100}%; background: #6b7a2e; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .note { line-height: 1.6; color: #384d45; }
    @media (max-width: 760px) { .summary, .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main class="report">
    <section class="hero">
      <p class="kicker">Audio Deepfake Detection Report</p>
      <h1>${fileName}</h1>
      <span class="badge">${prediction}</span>
      <div class="summary">
        <div class="metric"><span>Final Confidence</span><strong>${asPercent(confidence)}</strong></div>
        <div class="metric"><span>Analyzed At</span><strong>${analyzedAt}</strong></div>
        <div class="metric"><span>Model Agreement</span><strong>${modelAgreement(result)}</strong></div>
      </div>
    </section>

    <section class="section">
      <h2>Decision Scores</h2>
      <div class="bar-row"><div class="bar-label"><span>Real Score</span><strong>${asPercent(realScore)}</strong></div><div class="bar"><div class="fill real"></div></div></div>
      <div class="bar-row"><div class="bar-label"><span>Fake Score</span><strong>${asPercent(fakeScore)}</strong></div><div class="bar"><div class="fill fake"></div></div></div>
    </section>

    <section class="section">
      <h2>Model Evidence</h2>
      <div class="grid">
        <div>
          <h3>LA Model</h3>
          <p>${result.la?.prediction || "N/A"} at ${asPercent(result.la?.confidence)}</p>
          <div class="bar-row"><div class="bar-label"><span>LA Fake Score</span><strong>${asPercent(laScore)}</strong></div><div class="bar"><div class="fill la"></div></div></div>
        </div>
        <div>
          <h3>PA Model</h3>
          <p>${result.pa?.prediction || "N/A"} at ${asPercent(result.pa?.confidence)}</p>
          <div class="bar-row"><div class="bar-label"><span>PA Fake Score</span><strong>${asPercent(paScore)}</strong></div><div class="bar"><div class="fill pa"></div></div></div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Why This Decision Was Made</h2>
      <p class="note">${decisionBasis} Final confidence is the score attached to the winning class. LA focuses on logical-access style synthetic speech patterns, while PA contributes replay-oriented evidence.</p>
    </section>
  </main>
</body>
</html>`;
}

function downloadReport({ result, fileName, analyzedAt }) {
  const reportHtml = createReportHtml({ result, fileName, analyzedAt });
  const blob = new Blob([reportHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = fileName.replace(/[^a-z0-9._-]/gi, "_");

  link.href = url;
  link.download = `audio-forensics-report-${safeName}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ScoreBar({ label, value, tone }) {
  return (
    <div className="score-row">
      <div className="score-label">
        <span>{label}</span>
        <strong>{asPercent(value)}</strong>
      </div>
      <div className="score-track">
        <div className={`score-fill ${tone}`} style={{ width: asPercent(value) }} />
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("analysis");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  const navItems = ["analysis", "history", "settings"];

  const steps = useMemo(
    () => [
      "Uploading audio sample",
      "Preparing feature extraction",
      "Running LA and PA models",
      "Comparing forensic scores",
      "Building evaluation report",
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
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setAudioPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(selectedFile);
    setAudioPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const progressStepIndex = Math.min(
    steps.length - 1,
    Math.floor((progress / 100) * steps.length)
  );

  const analyzedAt = result?.analyzedAt || new Date().toLocaleString();
  const reportFileName = result?.file_name || selectedFile?.name || "audio-sample";

  const saveHistory = (nextHistory) => {
    setHistory(nextHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  };

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

      const enrichedResult = {
        ...data,
        analyzedAt: new Date().toLocaleString(),
      };

      const historyItem = {
        id: Date.now(),
        filename: file.name,
        date: enrichedResult.analyzedAt,
        result: enrichedResult,
      };

      saveHistory([historyItem, ...history]);
      setProgress(100);
      setResult(enrichedResult);
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
          <p className="brand-kicker">Voice Integrity Lab</p>
          <h1>Audio Forensics</h1>
          <p className="brand-subtitle">Real-time deepfake evidence dashboard</p>
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
            <h2 className="topbar-title">Forensic Audio Analysis</h2>
            <p className="topbar-subtitle">Upload audio, review evidence, and export a report.</p>
          </div>
        </header>

        <section className="content">
          {activePage === "analysis" && (
            <div className="analysis-grid">
              <section className="upload-panel">
                <div className="section-head">
                  <span>Input</span>
                  <h3>Audio sample</h3>
                </div>

                <label className="file-picker">
                  <input
                    key={inputKey}
                    type="file"
                    accept=".wav,.flac,.mp3,.m4a,.ogg"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (file) {
                        void startAnalysis(file);
                      }
                    }}
                  />
                  <span>Choose audio file</span>
                </label>

                <div className="file-summary">
                  <strong>{selectedFile?.name || "No file selected"}</strong>
                  <span>{fileSizeLabel(selectedFile)}</span>
                </div>

                {audioPreviewUrl && (
                  <audio className="audio-preview" controls src={audioPreviewUrl}>
                    <track kind="captions" />
                  </audio>
                )}

                {isAnalyzing && (
                  <div className="progress">
                    <div className="bar">
                      <div className="fill" style={{ width: `${progress}%` }} />
                    </div>
                    <p>{steps[progressStepIndex]}</p>
                  </div>
                )}

                {error && (
                  <div className="error">
                    <p>{error}</p>
                  </div>
                )}
              </section>

              <section className="report-panel">
                {!result && (
                  <div className="empty-state">
                    <span>Report</span>
                    <h3>Awaiting evaluation</h3>
                    <p>The evidence graph and downloadable report will appear after analysis.</p>
                  </div>
                )}

                {result && (
                  <>
                    <div className="report-header">
                      <div>
                        <span>Final decision</span>
                        <h3>{result.prediction}</h3>
                      </div>
                      <span className={`prediction-pill ${predictionTone(result.prediction)}`}>
                        {asPercent(result.confidence)}
                      </span>
                    </div>

                    <div className="decision-grid">
                      <div className="decision-card">
                        <span>Real Evidence</span>
                        <strong>{asPercent(result.ensemble_real_score)}</strong>
                      </div>
                      <div className="decision-card">
                        <span>Fake Evidence</span>
                        <strong>{asPercent(result.ensemble_fake_score)}</strong>
                      </div>
                      <div className="decision-card">
                        <span>Agreement</span>
                        <strong>{modelAgreement(result)}</strong>
                      </div>
                    </div>

                    <div className="score-board">
                      <ScoreBar label="Ensemble Real Score" value={result.ensemble_real_score} tone="real" />
                      <ScoreBar label="Ensemble Fake Score" value={result.ensemble_fake_score} tone="fake" />
                      <ScoreBar label="LA Fake Score" value={result.la_score} tone="la" />
                      <ScoreBar label="PA Fake Score" value={result.pa_score} tone="pa" />
                    </div>

                    <div className="model-grid">
                      <div>
                        <span>LA Model</span>
                        <strong>{result.la?.prediction ?? "N/A"}</strong>
                        <p>{asPercent(result.la?.confidence)} confidence</p>
                      </div>
                      <div>
                        <span>PA Model</span>
                        <strong>{result.pa?.prediction ?? "N/A"}</strong>
                        <p>{asPercent(result.pa?.confidence)} confidence</p>
                      </div>
                    </div>

                    <div className="actions">
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() =>
                          downloadReport({
                            result,
                            fileName: reportFileName,
                            analyzedAt,
                          })
                        }
                      >
                        Download Report
                      </button>
                      <button type="button" className="secondary-btn" onClick={resetAnalysis}>
                        Analyze Another
                      </button>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}

          {activePage === "history" && (
            <section className="history-view">
              <div className="section-head">
                <span>Archive</span>
                <h3>Prediction history</h3>
              </div>

              {history.length === 0 ? (
                <p className="muted">No previous analyses available.</p>
              ) : (
                <div className="history-list">
                  {history.map((item) => (
                    <article className="history-card" key={item.id}>
                      <div>
                        <h4>{item.filename}</h4>
                        <p>{item.date}</p>
                      </div>
                      <span className={`mini-pill ${predictionTone(item.result.prediction)}`}>
                        {item.result.prediction}
                      </span>
                      <strong>{asPercent(item.result.confidence)}</strong>
                      <button
                        type="button"
                        onClick={() =>
                          downloadReport({
                            result: item.result,
                            fileName: item.filename,
                            analyzedAt: item.date,
                          })
                        }
                      >
                        Report
                      </button>
                    </article>
                  ))}
                </div>
              )}

              {history.length > 0 && (
                <button
                  className="secondary-btn clear-btn"
                  type="button"
                  onClick={() => saveHistory([])}
                >
                  Clear History
                </button>
              )}
            </section>
          )}

          {activePage === "settings" && (
            <section className="settings-view">
              <div className="section-head">
                <span>Runtime</span>
                <h3>API settings</h3>
              </div>
              <p className="muted">Prediction API: {API_BASE_URL}</p>
              <p className="muted">Reports are generated in the browser as standalone HTML files.</p>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
