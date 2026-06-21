from training.config import TrainConfig
from training.scripts.train_common import train_pipeline


def main():
    cfg = TrainConfig(
        part="PA",
        run_name="PA_ResNet18_LFCC_final",
        dataset_root=r"C:\Dataset\PA\PA",

        # PA paths
        train_audio_dir=r"ASVspoof2019_PA_train\flac",
        dev_audio_dir=r"ASVspoof2019_PA_dev\flac",
        protocol_dir=r"ASVspoof2019_PA_cm_protocols",

        train_protocol=r"ASVspoof2019.PA.cm.train.trn.txt",
        dev_protocol=r"ASVspoof2019.PA.cm.dev.trl.txt",

        # Training
        epochs=40,
        batch_size=16,
        num_workers=2,
        lr=1e-4,
        weight_decay=1e-4,
        patience=10,

        # Audio
        sample_rate=16000,
        fixed_length=96000,  # longer for replay cues

        # STFT (only used for logmel, LFCC ignores this)
        n_fft=512,
        hop_length=160,
        win_length=400,

        # AMP
        use_amp=True,
    )

    train_pipeline(cfg, model_name="resnet18", feature_name="lfcc")


if __name__ == "__main__":
    main()
