import os
from typing import Dict, Any

import torch

from training.utils import ensure_dir


def save_checkpoint(path: str, payload: Dict[str, Any]) -> None:
    ensure_dir(os.path.dirname(path))
    torch.save(payload, path)


def load_checkpoint(path: str, map_location="cpu") -> Dict[str, Any]:
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Checkpoint not found: {path}")
    return torch.load(path, map_location=map_location)
