from dataclasses import dataclass


@dataclass
class TrainConfig:
    # ----- dataset -----
    part: str  # "LA" or "PA"
    dataset_root: str  # e.g. C:\Dataset\LA\LA

    train_audio_dir: str
    dev_audio_dir: str
    protocol_dir: str

    train_protocol: str
    dev_protocol: str

    # ----- audio/feature -----
    sample_rate: int = 16000
    fixed_length: int = 64000  # ~4 seconds at 16k; good balance

    n_fft: int = 1024
    hop_length: int = 320
    win_length: int = 1024

    n_mels: int = 80
    f_min: int = 0
    f_max: int = 8000

    # ----- training -----
    seed: int = 42

    epochs: int = 30
    batch_size: int = 32
    num_workers: int = 4

    lr: float = 1e-4
    weight_decay: float = 1e-4

    # mixed precision
    use_amp: bool = True

    # gradient clipping
    grad_clip: float = 5.0

    # early stopping
    patience: int = 8

    # ----- checkpointing -----
    run_name: str = ""
    out_dir: str = "models"  # saved under project root

    # resume
    resume_ckpt: str = ""  # optional
    
    # LFCC params (for PA replay)
    n_lfcc: int = 40
    n_filters: int = 40
