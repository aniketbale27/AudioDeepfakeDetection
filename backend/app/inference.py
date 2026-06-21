import os
from pathlib import Path

import soundfile as sf
import torch
import torch.nn.functional as F

from backend.app.model_loader import device, load_la_model, load_pa_model
from training.data_utils.audio import pad_or_repeat_1d


PROJECT_ROOT = Path(__file__).resolve().parents[2]

LA_MODEL_PATH = os.getenv(
    "LA_MODEL_PATH",
    str(PROJECT_ROOT / "models" / "LA_LCNN_logmel" / "best_LA.pth"),
)
PA_MODEL_PATH = os.getenv(
    "PA_MODEL_PATH",
    str(PROJECT_ROOT / "models" / "PA_ResNet18_LFCC_final" / "best_PA.pth"),
)

_LA_PIPELINE = load_la_model(LA_MODEL_PATH)
_PA_PIPELINE = load_pa_model(PA_MODEL_PATH)


def load_audio(path: str, fixed_length: int) -> torch.Tensor:
    audio, _ = sf.read(path)

    x = torch.tensor(audio, dtype=torch.float32)

    if x.dim() == 2:
        x = x.mean(dim=1)

    x = pad_or_repeat_1d(x, fixed_length)

    return x.unsqueeze(0).to(device)


def _run_model(waveform: torch.Tensor, pipeline: dict) -> dict:
    feat = pipeline["extractor"](waveform)
    logits = pipeline["model"](feat)
    probs = F.softmax(logits, dim=1)

    fake_prob = float(probs[0][0].item())
    real_prob = float(probs[0][1].item())

    prediction_id = int(torch.argmax(probs, dim=1).item())
    prediction = "REAL" if prediction_id == 1 else "DEEPFAKE"
    confidence = real_prob if prediction_id == 1 else fake_prob

    return {
        "prediction_id": prediction_id,
        "prediction": prediction,
        "confidence": confidence,
        "real_score": real_prob,
        "fake_score": fake_prob,
    }


def predict(audio_path: str) -> dict:
    la_waveform = load_audio(audio_path, _LA_PIPELINE["fixed_length"])
    pa_waveform = load_audio(audio_path, _PA_PIPELINE["fixed_length"])

    with torch.no_grad():
        la_result = _run_model(la_waveform, _LA_PIPELINE)
        pa_result = _run_model(pa_waveform, _PA_PIPELINE)

    ensemble_real_score = (la_result["real_score"] + pa_result["real_score"]) / 2.0
    ensemble_fake_score = (la_result["fake_score"] + pa_result["fake_score"]) / 2.0

    prediction = "REAL" if ensemble_real_score >= ensemble_fake_score else "DEEPFAKE"
    confidence = ensemble_real_score if prediction == "REAL" else ensemble_fake_score

    return {
        "prediction": prediction,
        "confidence": float(confidence),
        "ensemble_real_score": float(ensemble_real_score),
        "ensemble_fake_score": float(ensemble_fake_score),
        "la_score": float(la_result["fake_score"]),
        "pa_score": float(pa_result["fake_score"]),
        "la": {
            "prediction": la_result["prediction"],
            "confidence": float(la_result["confidence"]),
            "real_score": float(la_result["real_score"]),
            "fake_score": float(la_result["fake_score"]),
        },
        "pa": {
            "prediction": pa_result["prediction"],
            "confidence": float(pa_result["confidence"]),
            "real_score": float(pa_result["real_score"]),
            "fake_score": float(pa_result["fake_score"]),
        },
    }
