# 🎙️ Audio Deepfake Detection using Deep Learning

A Deep Learning based Audio Deepfake Detection system capable of identifying whether an audio sample is **REAL (Bonafide)** or **DEEPFAKE (Spoofed)** using the ASVspoof 2019 dataset.

The project uses advanced speech processing techniques such as **LFCC** and **Log-Mel Spectrograms** along with **ResNet18** and **LCNN** models for accurate audio spoof detection.

---

## 📌 Features

- Upload audio files through a modern web interface.
- Detect REAL and DEEPFAKE speech samples.
- Support for:
  - WAV
  - FLAC
  - MP3
  - OGG
  - M4A
- LFCC feature extraction.
- Log-Mel Spectrogram feature extraction.
- ResNet18 based spoof detector.
- LCNN based spoof detector.
- Confidence score generation.
- Browser-based history storage.
- FastAPI backend API.
- React frontend dashboard.
- Real-time prediction.

---

## 🏗️ Project Architecture

```text
Audio File
     │
     ▼
Preprocessing
     │
     ▼
Feature Extraction
 ┌─────────────┐
 │ Log-Mel     │
 │ LFCC        │
 └─────────────┘
     │
     ▼
Deep Learning Models
 ┌─────────────┐
 │ LCNN        │
 │ ResNet18    │
 └─────────────┘
     │
     ▼
Prediction
(REAL / DEEPFAKE)
```

---

## 📂 Project Structure

```text
AudioSpoofDetection/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── inference.py
│   │   └── model_loader.py
│
├── frontend/
│   ├── src/
│   └── public/
│
├── training/
│   ├── models/
│   ├── data_utils/
│   ├── feature_extractor.py
│   └── engine.py
│
├── models/
│   ├── best_LA_model.pth
│   └── best_PA_model.pth
│
└── uploads/
```

---

# 📚 Dataset

The project uses the **ASVspoof 2019 dataset**.

### Logical Access (LA)

Synthetic speech attacks.

### Physical Access (PA)

Replay attacks.

Dataset Structure:

```text
ASVspoof2019/
│
├── LA/
│   ├── train
│   ├── dev
│   └── eval
│
└── PA/
    ├── train
    ├── dev
    └── eval
```

---

# 🔍 Feature Extraction

## 1. Log-Mel Spectrogram

Converts audio signals into Mel-scale frequency representations.

Used by:

- LCNN model
- LA system

Advantages:

- Mimics human hearing.
- Preserves spectral information.
- Effective for synthetic speech detection.

---

## 2. LFCC (Linear Frequency Cepstral Coefficients)

Represents speech information in the linear frequency domain.

Used by:

- ResNet18 model
- PA system

Advantages:

- Effective against replay attacks.
- Better frequency resolution.
- Robust spoof detection.

---

# 🧠 Deep Learning Models

## LCNN (Light CNN)

Used for:

- Logical Access attacks.

Advantages:

- Lightweight architecture.
- Lower computational cost.
- High performance.

---

## ResNet18

Used for:

- Physical Access attacks.

Advantages:

- Residual learning.
- Deep feature extraction.
- Better generalization.

---

# ⚙️ Technologies Used

| Technology | Purpose |
|-----------|----------|
| Python | Backend |
| PyTorch | Deep Learning |
| FastAPI | REST API |
| React | Frontend |
| Vite | React Build Tool |
| NumPy | Numerical Computing |
| SoundFile | Audio Processing |
| Librosa | Feature Extraction |
| Matplotlib | Visualization |

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/AudioDeepfakeDetection.git

cd AudioDeepfakeDetection
```

---

## Create Virtual Environment

```bash
python -m venv .venv
```

Activate:

### Windows

```bash
.venv\Scripts\activate
```

### Linux/Mac

```bash
source .venv/bin/activate
```

---

## Install Dependencies

```bash
pip install -r requirements.txt
```

---

# ▶️ Run Backend

```bash
uvicorn backend.app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

---

# ▶️ Run Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🎵 Supported Audio Formats

- WAV
- FLAC
- MP3
- M4A
- OGG

---

# 📊 Model Performance

| Model | Feature | Accuracy | EER |
|------|---------|----------|-----|
| ResNet18 | LFCC | 89.72% | 17.52% |
| LCNN | Log-Mel | Trained separately | - |

---

# 🖥️ API Endpoint

## POST /predict

Upload audio file.

### Request

```bash
curl -X POST \
-F "file=@audio.flac" \
http://127.0.0.1:8000/predict
```

### Response

```json
{
    "prediction": "REAL",
    "confidence": 0.89,
    "real_score": 0.89,
    "fake_score": 0.11
}
```

---

# 📈 Workflow

1. Upload audio file.
2. Audio preprocessing.
3. Feature extraction.
4. Deep learning inference.
5. Confidence calculation.
6. REAL/DEEPFAKE prediction.
7. Display result.

---

# 💡 Applications

- Banking Security
- Voice Authentication
- Deepfake Detection
- Call Center Security
- Digital Forensics
- Social Media Verification
- Audio Authentication

---

# 🎯 Future Improvements

- Explainable AI (XAI)
- Grad-CAM visualization
- Transformer models
- Multilingual detection
- Cloud deployment
- Mobile application
- Real-time microphone detection

---

# 👨‍💻 Authors

- Aniket Bale
- Sanjyot Dake
- Tejas Chaudhari

Department of Electronics and Telecommunication Engineering

---

# 📜 License

This project is developed for academic and research purposes.

---

# ⭐ If you found this project useful, please give it a star.