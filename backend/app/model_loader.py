import os

import torch

from training.feature_extractor import LogMelExtractor
from training.feature_extractor_lfcc import LFCCExtractor
from training.model import LCNN
from training.models.resnet18 import ResNet18


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _load_checkpoint(path: str):
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Model checkpoint not found: {path}")
    return torch.load(path, map_location=device)


def _load_optional_extractor_state(extractor, ckpt):
    state = ckpt.get("extractor")
    if state is None:
        return

    try:
        extractor.load_state_dict(state, strict=False)
    except RuntimeError:
        # Some historical checkpoints may store extractor state in a different format.
        # In that case, cfg-based construction still provides a valid extractor.
        pass


def load_la_model(path: str):
    ckpt = _load_checkpoint(path)
    cfg = ckpt["cfg"]

    extractor = LogMelExtractor(
        sample_rate=cfg["sample_rate"],
        n_fft=cfg["n_fft"],
        hop_length=cfg["hop_length"],
        win_length=cfg["win_length"],
        n_mels=cfg["n_mels"],
        f_min=cfg["f_min"],
        f_max=cfg["f_max"],
    ).to(device)

    model = LCNN(num_classes=2).to(device)
    model.load_state_dict(ckpt["model"])

    _load_optional_extractor_state(extractor, ckpt)

    model.eval()
    extractor.eval()

    return {
        "model": model,
        "extractor": extractor,
        "cfg": cfg,
        "fixed_length": int(cfg.get("fixed_length", 64000)),
    }


def load_pa_model(path: str):
    ckpt = _load_checkpoint(path)
    cfg = ckpt["cfg"]

    extractor = LFCCExtractor(
        sample_rate=cfg["sample_rate"],
        n_fft=cfg["n_fft"],
        hop_length=cfg["hop_length"],
        win_length=cfg["win_length"],
        n_filters=cfg.get("n_filters", 40),
        n_lfcc=cfg.get("n_lfcc", 40),
        f_min=cfg.get("f_min", 0),
        f_max=cfg.get("f_max", cfg["sample_rate"] // 2),
    ).to(device)

    model = ResNet18(num_classes=2).to(device)
    model.load_state_dict(ckpt["model"])

    _load_optional_extractor_state(extractor, ckpt)

    model.eval()
    extractor.eval()

    return {
        "model": model,
        "extractor": extractor,
        "cfg": cfg,
        "fixed_length": int(cfg.get("fixed_length", 96000)),
    }


