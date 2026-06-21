# Train LA model here
import os
from training.config import TrainConfig
from training.scripts.train_common import train_pipeline


def main():
    # YOUR EXACT DATASET PATH (from screenshots)
    LA_ROOT = r"C:\Dataset\LA\LA"

    cfg = TrainConfig(
        part="LA",
        dataset_root=LA_ROOT,
        train_audio_dir="ASVspoof2019_LA_train",
        dev_audio_dir="ASVspoof2019_LA_dev",
        protocol_dir="ASVspoof2019_LA_cm_protocols",
        train_protocol="ASVspoof2019.LA.cm.train.trn.txt",
        dev_protocol="ASVspoof2019.LA.cm.dev.trl.txt",

        # RTX 3050 6GB: safe defaults
        batch_size=32,
        num_workers=4,
        epochs=30,

        fixed_length=64000,
        n_mels=80,

        lr=1e-4,
        weight_decay=1e-4,
        use_amp=False,
        grad_clip=5.0,
        patience=8,

        run_name="LA_LCNN_logmel",
        out_dir="models",
        resume_ckpt="",  # set later if resuming
    )

    train_pipeline(cfg)


if __name__ == "__main__":
    main()