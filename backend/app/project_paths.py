import sys
from pathlib import Path


def _candidate_roots(file_path: Path):
    seen = set()

    for parent in file_path.resolve().parents:
        for candidate in (parent, parent / "src"):
            key = str(candidate)
            if key in seen:
                continue
            seen.add(key)
            yield candidate


def detect_project_root(file_path: Path) -> Path:
    for candidate in _candidate_roots(file_path):
        if (candidate / "training").exists() and (candidate / "models").exists():
            return candidate

    for candidate in _candidate_roots(file_path):
        if (candidate / "training").exists():
            return candidate

    return file_path.resolve().parents[2]


PROJECT_ROOT = detect_project_root(Path(__file__))

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
