import { useEffect, useMemo, useRef, useState } from "react";
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
  return `${(clampScore(value) * 100).toFixed(2)} %`;
}

function asDecimal(value) {
  return clampScore(value).toFixed(4);
}

function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) {
    return "N/A";
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function safeFileName(name) {
  return String(name || "audio-report").replace(/[^a-z0-9._-]/gi, "_");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isDeepfakePrediction(prediction) {
  return String(prediction || "").toUpperCase() !== "REAL";
}

function predictionTone(prediction) {
  return isDeepfakePrediction(prediction) ? "fake" : "real";
}

function displayPrediction(prediction) {
  return isDeepfakePrediction(prediction) ? "Spoofed" : "Genuine";
}

function displayFinalPrediction(prediction) {
  return isDeepfakePrediction(prediction) ? "SPOOFED AUDIO" : "GENUINE AUDIO";
}

function confidenceLabel(value) {
  const confidence = clampScore(value);
  if (confidence >= 0.85) {
    return "High Confidence";
  }
  if (confidence >= 0.65) {
    return "Moderate Confidence";
  }
  return "Low Confidence";
}

function modelRows(result) {
  if (!result) {
    return [];
  }

  return [
    {
      name: "LCNN",
      prediction: result.la?.prediction ?? result.prediction,
      spoofProbability: result.la?.fake_score ?? result.la_score,
    },
    {
      name: "ResNet18",
      prediction: result.pa?.prediction ?? result.prediction,
      spoofProbability: result.pa?.fake_score ?? result.pa_score,
    },
    {
      name: "Ensemble (Average)",
      prediction: result.prediction,
      spoofProbability: result.ensemble_fake_score,
      ensemble: true,
    },
  ];
}

function normalizeHistoryItem(item) {
  if (!item) {
    return null;
  }

  const result = item.result ?? item;
  const fileName =
    item.fileName ||
    item.filename ||
    result.fileName ||
    result.file_name ||
    "audio-sample.wav";
  const uploadedOn =
    item.uploadedOn ||
    item.timestamp ||
    item.date ||
    result.uploadedOn ||
    result.analyzedAt ||
    new Date().toLocaleString();

  return {
    id: item.id ?? `${Date.now()}-${fileName}`,
    fileName,
    fileSize: item.fileSize ?? result.fileSize ?? null,
    fileSizeLabel:
      item.fileSizeLabel || result.fileSizeLabel || formatFileSize(item.fileSize ?? result.fileSize),
    uploadedOn,
    prediction: item.prediction || result.prediction || "DEEPFAKE",
    confidence: clampScore(item.confidence ?? result.confidence),
    realScore: clampScore(item.realScore ?? result.ensemble_real_score),
    fakeScore: clampScore(item.fakeScore ?? result.ensemble_fake_score),
    result: {
      ...result,
      fileName,
      uploadedOn,
      fileSizeLabel:
        result.fileSizeLabel || item.fileSizeLabel || formatFileSize(item.fileSize ?? result.fileSize),
    },
  };
}

function createReportHtml(entry) {
  const normalized = normalizeHistoryItem(entry);
  const result = normalized?.result ?? {};
  const finalLabel = displayFinalPrediction(normalized?.prediction);
  const tone = predictionTone(normalized?.prediction);
  const accent = tone === "fake" ? "#ef2626" : "#10a044";
  const realScore = clampScore(normalized?.realScore);
  const fakeScore = clampScore(normalized?.fakeScore);
  const rows = modelRows(result);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Audio Deepfake Detection Report</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #f4f8ff; color: #0b1834; }
    .page { max-width: 1040px; margin: 0 auto; padding: 34px 24px; }
    .hero, .card { background: #fff; border: 1px solid #d9e3f2; border-radius: 16px; box-shadow: 0 16px 40px rgba(13, 40, 92, .10); }
    .hero { padding: 30px; border-top: 4px solid ${accent}; }
    h1, h2, p { margin-top: 0; }
    .badge { display: inline-block; padding: 9px 16px; border-radius: 999px; background: ${accent}; color: #fff; font-weight: 700; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 22px; }
    .metric { background: #f7faff; border: 1px solid #dfe8f6; border-radius: 14px; padding: 16px; }
    .metric span { color: #53627c; font-size: 13px; }
    .metric strong { display: block; margin-top: 8px; font-size: 26px; }
    .grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 18px; margin-top: 18px; }
    .card { padding: 22px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 13px 8px; border-bottom: 1px solid #edf1f7; text-align: left; }
    .bar { height: 10px; width: 170px; background: #e7edf6; border-radius: 99px; overflow: hidden; }
    .fill { height: 100%; background: ${accent}; border-radius: 99px; }
    .chart { display: flex; align-items: end; gap: 34px; height: 220px; padding: 20px 28px 0; border-left: 1px solid #9fb0c9; border-bottom: 1px solid #9fb0c9; }
    .chart div { flex: 1; min-width: 70px; border-radius: 8px 8px 0 0; background: linear-gradient(#ff4a4a, #e81818); text-align: center; color: #0b1834; font-weight: 700; }
    .chart .real { height: ${Math.max(realScore * 100, 3)}%; background: linear-gradient(#3e8cff, #0757dc); }
    .chart .fake { height: ${Math.max(fakeScore * 100, 3)}%; }
    .note { color: #40516f; line-height: 1.7; }
    @media (max-width: 760px) { .metrics, .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <p>Audio Deepfake Detection System</p>
      <h1>${escapeHtml(normalized?.fileName)}</h1>
      <span class="badge">${escapeHtml(finalLabel)}</span>
      <div class="metrics">
        <div class="metric"><span>Confidence Score</span><strong>${asPercent(normalized?.confidence)}</strong></div>
        <div class="metric"><span>Uploaded On</span><strong>${escapeHtml(normalized?.uploadedOn)}</strong></div>
        <div class="metric"><span>File Size</span><strong>${escapeHtml(normalized?.fileSizeLabel)}</strong></div>
      </div>
    </section>
    <section class="grid">
      <div class="card">
        <h2>Model Prediction Scores</h2>
        <table>
          <thead><tr><th>Model</th><th>Prediction</th><th>Probability (Spoof)</th><th>Score Bar</th></tr></thead>
          <tbody>
            ${rows
              .map(
                (row) => `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(
                  displayPrediction(row.prediction)
                )}</td><td>${asDecimal(row.spoofProbability)}</td><td><div class="bar"><div class="fill" style="width:${clampScore(
                  row.spoofProbability
                ) * 100}%"></div></div></td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="card">
        <h2>Probability Distribution</h2>
        <div class="chart"><div class="real">Real<br>${asPercent(realScore)}</div><div class="fake">Spoofed<br>${asPercent(fakeScore)}</div></div>
      </div>
    </section>
    <section class="card" style="margin-top:18px">
      <h2>Evaluation Note</h2>
      <p class="note">The final prediction is calculated from the ensemble average of LCNN and ResNet18 model evidence. The class with the stronger ensemble probability becomes the final label, and its score is reported as confidence.</p>
    </section>
  </main>
</body>
</html>`;
}

function downloadReport(entry) {
  const normalized = normalizeHistoryItem(entry);
  const html = createReportHtml(normalized);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `audio-deepfake-report-${safeFileName(normalized?.fileName)}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function AppLogo() {
  return (
    <div className="brand-logo" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function ScoreBar({ value }) {
  return (
    <div className="score-bar" aria-label={`Score ${asPercent(value)}`}>
      <span style={{ width: `${clampScore(value) * 100}%` }} />
    </div>
  );
}

function PredictionBanner({ result }) {
  if (!result) {
    return (
      <div className="prediction-card waiting">
        <div className="status-icon neutral">A</div>
        <div>
          <span className="eyebrow">Prediction Result</span>
          <h2>Awaiting Audio</h2>
          <p>Upload a file to see the model result and confidence score.</p>
        </div>
      </div>
    );
  }

  const tone = predictionTone(result.prediction);

  return (
    <div className={`prediction-card ${tone}`}>
      <div className={`status-icon ${tone}`}>{tone === "fake" ? "X" : "OK"}</div>
      <div className="prediction-copy">
        <span className="eyebrow">Prediction Result</span>
        <h2>{displayFinalPrediction(result.prediction)}</h2>
        <p>
          The uploaded audio is classified as{" "}
          {isDeepfakePrediction(result.prediction) ? "Fake / Deepfake." : "Real / Genuine."}
        </p>
      </div>
      <div className="confidence-block">
        <span>Confidence Score</span>
        <strong>{asPercent(result.confidence)}</strong>
        <em>{confidenceLabel(result.confidence)}</em>
      </div>
    </div>
  );
}

function ModelScores({ result }) {
  if (!result) {
    return (
      <section className="panel table-panel">
        <div className="panel-title">
          <span className="tiny-icon">M</span>
          <h3>Model Prediction Scores</h3>
        </div>
        <div className="empty-line">Scores will appear after a successful prediction.</div>
      </section>
    );
  }

  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <span className="tiny-icon">M</span>
        <h3>Model Prediction Scores</h3>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Prediction</th>
              <th>Probability (Spoof)</th>
              <th>Score Bar</th>
            </tr>
          </thead>
          <tbody>
            {modelRows(result).map((row) => (
              <tr key={row.name} className={row.ensemble ? "ensemble-row" : ""}>
                <td>{row.name}</td>
                <td className={predictionTone(row.prediction)}>{displayPrediction(row.prediction)}</td>
                <td>{asDecimal(row.spoofProbability)}</td>
                <td>
                  <div className="score-cell">
                    <ScoreBar value={row.spoofProbability} />
                    <span>{asPercent(row.spoofProbability)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="success-note">Final prediction is obtained using ensemble of LCNN and ResNet18 models.</div>
    </section>
  );
}

function ConfidenceGauge({ result }) {
  const confidence = clampScore(result?.confidence);
  const angle = -90 + confidence * 180;

  return (
    <section className="panel gauge-panel">
      <div className="panel-title">
        <span className="tiny-icon">G</span>
        <h3>Confidence Gauge</h3>
      </div>
      <div className="gauge" style={{ "--needle-angle": `${angle}deg` }}>
        <div className="gauge-arc">
          <span className="gauge-mark left">0</span>
          <span className="gauge-mark middle">50</span>
          <span className="gauge-mark right">100</span>
          <div className="gauge-needle" />
        </div>
        <strong>{asPercent(confidence)}</strong>
        <p>{confidenceLabel(confidence)}</p>
      </div>
    </section>
  );
}

function AudioDetails({ result, selectedFile }) {
  const fileName = result?.fileName || result?.file_name || selectedFile?.name || "No file selected";
  const fileSize = result?.fileSizeLabel || formatFileSize(selectedFile?.size);
  const uploadedOn = result?.uploadedOn || "Waiting for upload";

  return (
    <section className="panel details-panel">
      <div className="panel-title">
        <span className="tiny-icon">A</span>
        <h3>Audio Details</h3>
      </div>
      <dl className="details-list">
        <div>
          <dt>File Name</dt>
          <dd>{fileName}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{result ? "Available in audio preview" : "N/A"}</dd>
        </div>
        <div>
          <dt>Sample Rate</dt>
          <dd>Model processed</dd>
        </div>
        <div>
          <dt>File Size</dt>
          <dd>{fileSize}</dd>
        </div>
        <div>
          <dt>Uploaded On</dt>
          <dd>{uploadedOn}</dd>
        </div>
      </dl>
    </section>
  );
}

function FeatureVisuals({ result }) {
  const fakeScore = clampScore(result?.ensemble_fake_score);
  const realScore = clampScore(result?.ensemble_real_score);

  return (
    <section className="panel feature-panel">
      <div className="panel-title centered">
        <h3>Feature Visualization</h3>
      </div>
      <div className="feature-grid">
        <div>
          <h4>Log-Mel Spectrogram</h4>
          <div className="spectrogram" aria-label="Decorative spectrogram visualization" />
        </div>
        <div>
          <h4>LFCC Features</h4>
          <div className="lfcc-map" aria-label="Decorative LFCC feature visualization" />
        </div>
        <div>
          <h4>Probability Distribution</h4>
          <div className="prob-chart">
            <div className="axis" />
            <div className="prob-bar real" style={{ height: `${Math.max(realScore * 100, 3)}%` }}>
              <span>{asDecimal(realScore)}</span>
            </div>
            <div className="prob-bar fake" style={{ height: `${Math.max(fakeScore * 100, 3)}%` }}>
              <span>{asDecimal(fakeScore)}</span>
            </div>
          </div>
          <div className="prob-labels">
            <span>Genuine</span>
            <span>Spoofed</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function UploadBox({ inputRef, inputKey, onFileSelected, onDropFile, isAnalyzing, progress, audioPreviewUrl }) {
  return (
    <section className="upload-section">
      <div className="section-heading">
        <h1>Upload Audio File</h1>
        <p>Upload a .wav, .flac, .mp3, .m4a, or .ogg audio file to check whether it is genuine or spoofed.</p>
      </div>

      <label
        className={`drop-zone ${isAnalyzing ? "analyzing" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) {
            onDropFile(file);
          }
        }}
      >
        <input
          key={inputKey}
          ref={inputRef}
          type="file"
          accept=".wav,.flac,.mp3,.m4a,.ogg,audio/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onFileSelected(file);
            }
          }}
        />
        <div className="upload-cloud">UP</div>
        <strong>Drag and drop your audio file here</strong>
        <span>or</span>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            inputRef.current?.click();
          }}
        >
          Choose File
        </button>
        <small>Supported formats: .wav, .flac, .mp3, .m4a, .ogg | Max size depends on backend limits</small>
      </label>

      {isAnalyzing && (
        <div className="upload-progress">
          <div>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>Analyzing audio and building prediction evidence...</p>
        </div>
      )}

      {audioPreviewUrl && (
        <audio className="audio-preview" controls src={audioPreviewUrl}>
          <track kind="captions" />
        </audio>
      )}
    </section>
  );
}

function UploadedFileCard({ result, selectedFile }) {
  return (
    <section className="panel upload-file-card">
      <h3>Uploaded File</h3>
      <div className="file-card-body">
        <div className="file-art">M</div>
        <dl className="details-list compact">
          <div>
            <dt>File Name</dt>
            <dd>{result?.fileName || selectedFile?.name || "No file selected"}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{result ? "Preview enabled" : "N/A"}</dd>
          </div>
          <div>
            <dt>Sample Rate</dt>
            <dd>Model processed</dd>
          </div>
          <div>
            <dt>File Size</dt>
            <dd>{result?.fileSizeLabel || formatFileSize(selectedFile?.size)}</dd>
          </div>
          <div>
            <dt>Uploaded On</dt>
            <dd>{result?.uploadedOn || "Waiting for upload"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function RecentPredictions({ history, onOpenHistory }) {
  const recent = history.slice(0, 5);

  return (
    <section className="panel recent-panel">
      <div className="panel-title">
        <span className="tiny-icon">R</span>
        <h3>Recent Predictions</h3>
      </div>
      {recent.length === 0 ? (
        <div className="empty-line">Previous predictions will be stored here automatically.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Prediction</th>
                <th>Confidence</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((item) => (
                <tr key={item.id}>
                  <td>{item.fileName}</td>
                  <td className={predictionTone(item.prediction)}>{displayPrediction(item.prediction)}</td>
                  <td>{asPercent(item.confidence)}</td>
                  <td>{item.uploadedOn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" className="outline-btn" onClick={onOpenHistory}>
        View All History
      </button>
    </section>
  );
}

export default function App() {
  const fileInputRef = useRef(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFilter, setResultFilter] = useState("all");

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "upload", label: "Upload Audio" },
    { id: "prediction", label: "Prediction" },
    { id: "history", label: "History" },
    { id: "help", label: "Help" },
  ];

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      setHistory(saved.map(normalizeHistoryItem).filter(Boolean));
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setAudioPreviewUrl("");
      return undefined;
    }

    const nextUrl = URL.createObjectURL(selectedFile);
    setAudioPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [selectedFile]);

  useEffect(() => {
    if (!isAnalyzing) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setProgress((previous) => (previous >= 92 ? 92 : previous + 7));
    }, 260);

    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  const filteredHistory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return history.filter((item) => {
      const matchesSearch = !term || item.fileName.toLowerCase().includes(term);
      const matchesFilter =
        resultFilter === "all" ||
        (resultFilter === "real" && !isDeepfakePrediction(item.prediction)) ||
        (resultFilter === "fake" && isDeepfakePrediction(item.prediction));

      return matchesSearch && matchesFilter;
    });
  }, [history, resultFilter, searchTerm]);

  const persistHistory = (updater) => {
    setHistory((previous) => {
      const next = typeof updater === "function" ? updater(previous) : updater;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetForNewUpload = () => {
    setSelectedFile(null);
    setResult(null);
    setError("");
    setProgress(0);
    setInputKey((previous) => previous + 1);
    setActiveView("dashboard");
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const runPrediction = async (file) => {
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setError("");
    setProgress(14);
    setIsAnalyzing(true);
    setActiveView("dashboard");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/predict`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || `Prediction failed with status ${response.status}.`);
      }

      if (!data?.prediction) {
        throw new Error("The prediction API returned an invalid response.");
      }

      const uploadedOn = new Date().toLocaleString();
      const enrichedResult = {
        ...data,
        fileName: data.file_name || file.name,
        fileSize: file.size,
        fileSizeLabel: formatFileSize(file.size),
        uploadedOn,
      };
      const historyItem = normalizeHistoryItem({
        id: `${Date.now()}-${safeFileName(file.name)}`,
        fileName: file.name,
        fileSize: file.size,
        uploadedOn,
        prediction: enrichedResult.prediction,
        confidence: enrichedResult.confidence,
        realScore: enrichedResult.ensemble_real_score,
        fakeScore: enrichedResult.ensemble_fake_score,
        result: enrichedResult,
      });

      setProgress(100);
      setResult(enrichedResult);
      persistHistory((previous) => [historyItem, ...previous].slice(0, 100));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to analyze this file.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteHistoryItem = (id) => {
    persistHistory((previous) => previous.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    persistHistory([]);
  };

  return (
    <div className="app-shell">
      <header className="top-header">
        <div className="brand">
          <AppLogo />
          <h1>Audio Deepfake Detection System</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="icon-btn" aria-label="Theme toggle">
            Dark
          </button>
          <button type="button" className="primary-btn" onClick={() => setActiveView("help")}>
            About System
          </button>
        </div>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <nav aria-label="Main navigation">
            {navItems.map((item, index) => (
              <button
                key={`${item.label}-${index}`}
                type="button"
                className={activeView === item.id ? "active" : ""}
                onClick={() => setActiveView(item.id)}
              >
                <span className="nav-dot">{item.label.slice(0, 1)}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="about-card">
            <strong>About</strong>
            <p>
              This system uses deep learning models to detect genuine and spoofed audio using Log-Mel
              and LFCC features with LCNN and ResNet18 models.
            </p>
          </div>
        </aside>

        <main className="content">
          <div className="content-toolbar">
            <div>
              <span className="eyebrow">Forensic Dashboard</span>
              <h2>
                {activeView === "history"
                  ? "Prediction History"
                  : activeView === "prediction"
                    ? "Prediction Results"
                    : activeView === "help"
                      ? "About System"
                      : activeView === "upload"
                        ? "Upload Audio"
                        : "Dashboard"}
              </h2>
            </div>
            <button type="button" className="primary-btn upload-new" onClick={resetForNewUpload}>
              Upload New File
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {(activeView === "dashboard" || activeView === "upload") && (
            <>
              <UploadBox
                inputRef={fileInputRef}
                inputKey={inputKey}
                onFileSelected={(file) => void runPrediction(file)}
                onDropFile={(file) => void runPrediction(file)}
                isAnalyzing={isAnalyzing}
                progress={progress}
                audioPreviewUrl={audioPreviewUrl}
              />

              <section className="dashboard-grid">
                <div className="left-stack">
                  <PredictionBanner result={result} />
                  <ModelScores result={result} />
                </div>
                <div className="right-stack">
                  <UploadedFileCard result={result} selectedFile={selectedFile} />
                  <RecentPredictions history={history} onOpenHistory={() => setActiveView("history")} />
                </div>
              </section>
            </>
          )}

          {activeView === "prediction" && (
            <section className="prediction-page">
              <PredictionBanner result={result} />
              <div className="result-grid">
                <ModelScores result={result} />
                <ConfidenceGauge result={result} />
              </div>
              <div className="result-grid lower">
                <AudioDetails result={result} selectedFile={selectedFile} />
                <FeatureVisuals result={result} />
              </div>
              {result && (
                <div className="note-row">
                  <span>i</span>
                  <p>Lower EER indicates better performance. The system is working as expected.</p>
                  <button type="button" className="outline-btn" onClick={() => downloadReport(result)}>
                    Download Report
                  </button>
                </div>
              )}
            </section>
          )}

          {activeView === "history" && (
            <section className="history-page panel">
              <div className="history-controls">
                <input
                  type="search"
                  placeholder="Search by filename"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}>
                  <option value="all">All Results</option>
                  <option value="real">Genuine Only</option>
                  <option value="fake">Spoofed Only</option>
                </select>
                <button type="button" className="danger-btn" onClick={clearHistory} disabled={history.length === 0}>
                  Clear All History
                </button>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="empty-history">
                  <h3>No saved predictions yet</h3>
                  <p>Every successful upload is saved automatically in your browser localStorage.</p>
                </div>
              ) : (
                <div className="history-list">
                  {filteredHistory.map((item) => (
                    <article className="history-card-row" key={item.id}>
                      <div>
                        <strong>{item.fileName}</strong>
                        <p>{item.uploadedOn}</p>
                      </div>
                      <span className={`result-badge ${predictionTone(item.prediction)}`}>
                        {displayPrediction(item.prediction)}
                      </span>
                      <div className="history-metrics">
                        <span>Confidence: {asPercent(item.confidence)}</span>
                        <span>Real: {asPercent(item.realScore)}</span>
                        <span>Fake: {asPercent(item.fakeScore)}</span>
                      </div>
                      <div className="row-actions">
                        <button type="button" className="outline-btn" onClick={() => downloadReport(item)}>
                          Report
                        </button>
                        <button type="button" className="danger-btn ghost" onClick={() => deleteHistoryItem(item.id)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeView === "help" && (
            <section className="help-page panel">
              <h3>Audio Deepfake Detection System</h3>
              <p>
                Upload an audio file and the existing FastAPI backend evaluates it with the trained LCNN
                and ResNet18 models. The frontend stores previous successful predictions locally in your
                browser so you can review results later without changing backend inference logic.
              </p>
              <div className="help-grid">
                <div>
                  <strong>Frontend</strong>
                  <span>Modern dashboard, result cards, report download, and local history.</span>
                </div>
                <div>
                  <strong>Backend</strong>
                  <span>Unchanged `/predict` endpoint and existing model loading logic.</span>
                </div>
                <div>
                  <strong>Models</strong>
                  <span>LCNN Log-Mel and ResNet18 LFCC ensemble decision support.</span>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
