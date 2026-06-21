# Helper functions
import os
import json
import random
import time
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional

import numpy as np
import torch


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def seed_everything(seed: int = 42) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

    # Reproducibility (slightly slower)
    torch.backends.cudnn.deterministic = False
    torch.backends.cudnn.benchmark = True


def now_ts() -> str:
    return time.strftime("%Y-%m-%d_%H-%M-%S")


def save_json(path: str, obj: Dict[str, Any]) -> None:
    ensure_dir(os.path.dirname(path))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)


def load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def human_bytes(n: int) -> str:
    # simple helper for logs
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if n < 1024:
            return f"{n:.2f}{unit}"
        n /= 1024
    return f"{n:.2f}PB"


def get_device() -> torch.device:
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")

