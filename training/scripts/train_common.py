import os
from typing import Tuple
from dataclasses import asdict

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from training.config import TrainConfig
from training.utils import seed_everything, ensure_dir, now_ts, get_device, save_json
from training.data_utils.asvspoof_dataset import ASVspoof2019CMDataset

from training.feature_extractor import LogMelExtractor
from training.feature_extractor_lfcc import LFCCExtractor

from training.model import LCNN
from training.models.resnet18 import ResNet18

from training.engine import train_one_epoch, evaluate
from training.checkpoint import save_checkpoint, load_checkpoint
from training.logger import CSVLogger


def build_paths(cfg: TrainConfig) -> Tuple[str, str, str, str]:
    train_audio = os.path.join(cfg.dataset_root, cfg.train_audio_dir)
    dev_audio = os.path.join(cfg.dataset_root, cfg.dev_audio_dir)
    proto_dir = os.path.join(cfg.dataset_root, cfg.protocol_dir)

    train_proto = os.path.join(proto_dir, cfg.train_protocol)
    dev_proto = os.path.join(proto_dir, cfg.dev_protocol)

    return train_audio, dev_audio, train_proto, dev_proto


def build_extractor(cfg: TrainConfig, feature_name: str, device: torch.device) -> nn.Module:
    feature_name = feature_name.lower().strip()

    if feature_name == "logmel":
        return LogMelExtractor(
            sample_rate=cfg.sample_rate,
            n_fft=cfg.n_fft,
            hop_length=cfg.hop_length,
            win_length=cfg.win_length,
            n_mels=cfg.n_mels,
            f_min=cfg.f_min,
            f_max=cfg.f_max,
        ).to(device)

    if feature_name == "lfcc":
        # For replay detection LFCC is much stronger than mel
        return LFCCExtractor(
            sample_rate=cfg.sample_rate,
            n_fft=cfg.n_fft,
            hop_length=cfg.hop_length,
            win_length=cfg.win_length,
            n_filters=40,
            n_lfcc=40,
            f_min=0,
            f_max=cfg.sample_rate // 2,
        ).to(device)

    raise ValueError(f"Unknown feature_name: {feature_name}")


def build_model(model_name: str, device: torch.device) -> nn.Module:
    model_name = model_name.lower().strip()

    if model_name == "lcnn":
        return LCNN(num_classes=2).to(device)

    if model_name == "resnet18":
        return ResNet18(num_classes=2).to(device)

    raise ValueError(f"Unknown model_name: {model_name}")


def train_pipeline(cfg: TrainConfig, model_name: str = "lcnn", feature_name: str = "logmel"):
    device = get_device()
    seed_everything(cfg.seed)

    # Run naming
    run_name = cfg.run_name.strip() or f"{cfg.part}_{model_name.upper()}_{feature_name.upper()}_{now_ts()}"

    # Output dirs
    out_root = os.path.join(os.getcwd(), cfg.out_dir)
    run_dir = os.path.join(out_root, run_name)
    ensure_dir(run_dir)

    ckpt_dir = os.path.join(run_dir, "checkpoints")
    ensure_dir(ckpt_dir)

    # Save config for reproducibility + inference
    save_json(os.path.join(run_dir, "train_config.json"), asdict(cfg))

    # Build dataset paths
    train_audio, dev_audio, train_proto, dev_proto = build_paths(cfg)

    # Datasets
    train_ds = ASVspoof2019CMDataset(
        audio_dir=train_audio,
        protocol_path=train_proto,
        fixed_length=cfg.fixed_length,
    )

    dev_ds = ASVspoof2019CMDataset(
        audio_dir=dev_audio,
        protocol_path=dev_proto,
        fixed_length=cfg.fixed_length,
    )

    # DataLoaders
    train_dl = DataLoader(
        train_ds,
        batch_size=cfg.batch_size,
        shuffle=True,
        num_workers=cfg.num_workers,
        pin_memory=(device.type == "cuda"),
        drop_last=True,
    )

    dev_dl = DataLoader(
        dev_ds,
        batch_size=cfg.batch_size,
        shuffle=False,
        num_workers=cfg.num_workers,
        pin_memory=(device.type == "cuda"),
        drop_last=False,
    )

    # Model + extractor
    extractor = build_extractor(cfg, feature_name=feature_name, device=device)
    model = build_model(model_name=model_name, device=device)

    # Loss
    loss_fn = nn.CrossEntropyLoss()

    # Optimizer
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=cfg.lr,
        weight_decay=cfg.weight_decay,
    )

    # Scheduler
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode="min",
        factor=0.5,
        patience=2,
        min_lr=1e-6,
    )

    # AMP scaler (proper + safe)
    if device.type == "cuda":
        scaler = torch.amp.GradScaler("cuda", enabled=cfg.use_amp)
    else:
        scaler = None  # CPU: do not use scaler

    # Resume
    start_epoch = 1
    best_dev_eer = 1e9
    best_dev_acc = 0.0
    no_improve = 0

    if cfg.resume_ckpt:
        ckpt = load_checkpoint(cfg.resume_ckpt, map_location=device)

        model.load_state_dict(ckpt["model"])
        extractor.load_state_dict(ckpt["extractor"])
        optimizer.load_state_dict(ckpt["optimizer"])
        scheduler.load_state_dict(ckpt["scheduler"])

        if scaler is not None and "scaler" in ckpt:
            scaler.load_state_dict(ckpt["scaler"])

        start_epoch = int(ckpt["epoch"]) + 1
        best_dev_eer = float(ckpt.get("best_dev_eer", best_dev_eer))
        best_dev_acc = float(ckpt.get("best_dev_acc", best_dev_acc))
        no_improve = int(ckpt.get("no_improve", 0))

        print(f"\n✅ Resumed from checkpoint: {cfg.resume_ckpt}")
        print(f"   -> Starting epoch: {start_epoch}")
        print(f"   -> Best Dev EER so far: {best_dev_eer:.2f}%")

    # Logger
    log_path = os.path.join(run_dir, "metrics.csv")
    logger = CSVLogger(
        log_path,
        fieldnames=[
            "epoch",
            "lr",
            "train_loss",
            "train_acc",
            "dev_loss",
            "dev_acc",
            "dev_eer",
            "best_dev_eer",
        ],
    )

    # Train header
    print("\n============================")
    print(f"🔥 Training {cfg.part} ({model_name.upper()} + {feature_name.upper()})")
    print("============================")
    print(f"Device: {device}")
    print(f"Run dir: {run_dir}")
    print(f"Train samples: {len(train_ds)}")
    print(f"Dev samples:   {len(dev_ds)}")

    # -----------------------------
    # MAIN TRAIN LOOP
    # -----------------------------
    for epoch in range(start_epoch, cfg.epochs + 1):
        lr_now = optimizer.param_groups[0]["lr"]

        # 1) TRAIN
        train_stats = train_one_epoch(
            model,
            extractor,
            train_dl,
            optimizer,
            scaler,
            loss_fn,
            device,
            cfg.use_amp,
            cfg.grad_clip,
        )

        # 2) VALIDATE
        dev_stats = evaluate(
            model,
            extractor,
            dev_dl,
            loss_fn,
            device,
            cfg.use_amp,
        )

        # 3) Scheduler update (based on dev loss)
        scheduler.step(dev_stats["loss"])

        # 4) Print
        print(
            f"\nEpoch {epoch}/{cfg.epochs} | LR {lr_now:.2e}\n"
            f"  Train: loss={train_stats['loss']:.4f} acc={train_stats['acc']:.2f}%\n"
            f"  Dev:   loss={dev_stats['loss']:.4f} acc={dev_stats['acc']:.2f}% eer={dev_stats['eer']:.2f}%"
        )

        # 5) CSV Log
        row = {
            "epoch": epoch,
            "lr": lr_now,
            "train_loss": train_stats["loss"],
            "train_acc": train_stats["acc"],
            "dev_loss": dev_stats["loss"],
            "dev_acc": dev_stats["acc"],
            "dev_eer": dev_stats["eer"],
            "best_dev_eer": best_dev_eer,
        }
        logger.log(row)

        # 6) Save last checkpoint every epoch (resume support)
        last_ckpt_path = os.path.join(ckpt_dir, "last.pth")
        save_checkpoint(
            last_ckpt_path,
            {
                "epoch": epoch,
                "model": model.state_dict(),
                "extractor": extractor.state_dict(),
                "optimizer": optimizer.state_dict(),
                "scheduler": scheduler.state_dict(),
                "scaler": scaler.state_dict() if scaler is not None else None,
                "best_dev_eer": best_dev_eer,
                "best_dev_acc": best_dev_acc,
                "no_improve": no_improve,
                "cfg": asdict(cfg),
                "model_name": model_name,
                "feature_name": feature_name,
            },
        )

        # 7) Best model selection (min EER)
        improved = dev_stats["eer"] < best_dev_eer

        if improved:
            best_dev_eer = dev_stats["eer"]
            best_dev_acc = dev_stats["acc"]
            no_improve = 0

            # Save best inside run dir
            best_path = os.path.join(run_dir, f"best_{cfg.part}.pth")
            save_checkpoint(
                best_path,
                {
                    "epoch": epoch,
                    "model": model.state_dict(),
                    "extractor": extractor.state_dict(),
                    "best_dev_eer": best_dev_eer,
                    "best_dev_acc": best_dev_acc,
                    "cfg": asdict(cfg),
                    "model_name": model_name,
                    "feature_name": feature_name,
                },
            )

            # Export to /models root for backend later
            export_path = os.path.join(out_root, f"best_{cfg.part}_model.pth")
            save_checkpoint(
                export_path,
                {
                    "epoch": epoch,
                    "model": model.state_dict(),
                    "extractor": extractor.state_dict(),
                    "best_dev_eer": best_dev_eer,
                    "best_dev_acc": best_dev_acc,
                    "cfg": asdict(cfg),
                    "model_name": model_name,
                    "feature_name": feature_name,
                },
            )

            print(f"✅ New BEST {cfg.part} model saved!  (EER={best_dev_eer:.2f}%)")

        else:
            no_improve += 1
            print(f"⏳ No improvement. Patience: {no_improve}/{cfg.patience}")

        # 8) Early stopping
        if no_improve >= cfg.patience:
            print("\n🛑 Early stopping triggered.")
            break

    print("\n🎉 Training finished!")
    print(f"Best Dev EER: {best_dev_eer:.2f}%")
    print(f"Best Dev ACC: {best_dev_acc:.2f}%")
    print(f"Artifacts saved in: {run_dir}")
