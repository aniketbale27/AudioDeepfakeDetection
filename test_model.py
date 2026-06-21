import os
import torch
import torch.nn.functional as F
import soundfile as sf

from training.feature_extractor_lfcc import LFCCExtractor
from training.models.resnet18 import ResNet18
from training.data_utils.audio import pad_or_repeat_1d

# =========================================================
# CONFIG
# =========================================================

MODEL_PATH = r"models/PA_ResNet18_LFCC_final/best_PA.pth"

# PUT YOUR AUDIO FILE HERE
AUDIO_FILE = r"C:\Dataset\PA\PA\ASVspoof2019_PA_eval\flac\PA_E_A018599.flac"
FIXED_LENGTH = 96000

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# =========================================================
# LOAD AUDIO
# =========================================================

def load_audio(path, fixed_length):

    if not os.path.isfile(path):
        raise FileNotFoundError(f"Audio file not found: {path}")

    audio, sr = sf.read(path)

    x = torch.tensor(audio, dtype=torch.float32)

    # stereo -> mono
    if x.dim() == 2:
        x = x.mean(dim=1)

    # same preprocessing as training
    x = pad_or_repeat_1d(x, fixed_length)

    # add batch dimension
    x = x.unsqueeze(0)

    return x


# =========================================================
# MAIN
# =========================================================

def main():

    print("\n===================================")
    print(" AUDIO DEEPFAKE TEST ")
    print("===================================")

    # -----------------------------------------------------
    # LOAD CHECKPOINT
    # -----------------------------------------------------

    ckpt = torch.load(MODEL_PATH, map_location=device)

    cfg = ckpt["cfg"]

    print("\nLoaded Model Config:")
    print(cfg)

    # -----------------------------------------------------
    # FEATURE EXTRACTOR
    # -----------------------------------------------------

    extractor = LFCCExtractor(
        sample_rate=cfg["sample_rate"],
        n_fft=cfg["n_fft"],
        hop_length=cfg["hop_length"],
        win_length=cfg["win_length"],
        n_filters=40,
        n_lfcc=40,
        f_min=0,
        f_max=cfg["sample_rate"] // 2,
    ).to(device)

    # -----------------------------------------------------
    # MODEL
    # -----------------------------------------------------

    model = ResNet18(num_classes=2).to(device)

    model.load_state_dict(ckpt["model"])

    model.eval()
    extractor.eval()

    print("\n✅ Model Loaded Successfully")

    # -----------------------------------------------------
    # LOAD AUDIO
    # -----------------------------------------------------

    x = load_audio(
        AUDIO_FILE,
        fixed_length=cfg["fixed_length"]
    )

    x = x.to(device)

    print(f"\n🎵 Testing File: {AUDIO_FILE}")

    # -----------------------------------------------------
    # INFERENCE
    # -----------------------------------------------------

    with torch.no_grad():

        features = extractor(x)

        logits = model(features)

        probs = F.softmax(logits, dim=1)

        fake_prob = probs[0][0].item()
        real_prob = probs[0][1].item()

        prediction = torch.argmax(probs, dim=1).item()

    # -----------------------------------------------------
    # RESULT
    # -----------------------------------------------------

    print("\n========== RESULT ==========")

    if prediction == 1:
        print("Prediction : REAL / BONAFIDE")
    else:
        print("Prediction : FAKE / SPOOF")

    print(f"\nReal Confidence : {real_prob:.4f}")
    print(f"Fake Confidence : {fake_prob:.4f}")

    print("============================\n")


# =========================================================

if __name__ == "__main__":
    main()