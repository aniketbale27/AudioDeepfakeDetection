import os
import csv
from typing import Dict

from training.utils import ensure_dir

class CSVLogger:
    """Very simple production-friendly logger.

    No heavy dependencies (like wandb). Works offline.
    """

    def __init__(self, path: str, fieldnames):
        self.path = path
        self.fieldnames = fieldnames

        ensure_dir(os.path.dirname(path))

        self._init_file()

    def _init_file(self):
        if os.path.isfile(self.path):
            return
        with open(self.path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=self.fieldnames)
            writer.writeheader()

    def log(self, row: Dict):
        with open(self.path, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=self.fieldnames)
            writer.writerow(row)
