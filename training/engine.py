import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from training.metrics import compute_accuracy, compute_eer


def train_one_epoch(
    model: nn.Module,
    extractor: nn.Module,
    loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    scaler,
    loss_fn: nn.Module,
    device: torch.device,
    use_amp: bool,
    grad_clip: float,
):
    model.train()
    extractor.train()

    total_loss = 0.0
    y_true_all = []
    y_pred_all = []

    pbar = tqdm(loader, desc="train", leave=False)

    for x, y in pbar:
        x = x.to(device, non_blocking=True)
        y = y.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)

        # AMP
        if device.type == "cuda":
            with torch.amp.autocast("cuda", enabled=use_amp):
                feats = extractor(x)
                logits = model(feats)
                loss = loss_fn(logits, y)

            scaler.scale(loss).backward()

            if grad_clip and grad_clip > 0:
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), grad_clip)

            scaler.step(optimizer)
            scaler.update()

        else:
            feats = extractor(x)
            logits = model(feats)
            loss = loss_fn(logits, y)

            loss.backward()

            if grad_clip and grad_clip > 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), grad_clip)

            optimizer.step()

        total_loss += float(loss.item())

        preds = torch.argmax(logits, dim=1)

        y_true_all.append(y.detach().cpu().numpy())
        y_pred_all.append(preds.detach().cpu().numpy())

        pbar.set_postfix(loss=float(loss.item()))

    y_true = np.concatenate(y_true_all)
    y_pred = np.concatenate(y_pred_all)

    acc = compute_accuracy(y_true, y_pred)

    return {
        "loss": total_loss / max(1, len(loader)),
        "acc": acc,
    }


@torch.no_grad()
def evaluate(
    model: nn.Module,
    extractor: nn.Module,
    loader: DataLoader,
    loss_fn: nn.Module,
    device: torch.device,
    use_amp: bool,
):
    model.eval()
    extractor.eval()

    total_loss = 0.0

    y_true_all = []
    y_pred_all = []
    y_score_all = []

    pbar = tqdm(loader, desc="dev", leave=False)

    for x, y in pbar:
        x = x.to(device, non_blocking=True)
        y = y.to(device, non_blocking=True)

        if device.type == "cuda":
            with torch.amp.autocast("cuda", enabled=use_amp):
                feats = extractor(x)
                logits = model(feats)
                loss = loss_fn(logits, y)
        else:
            feats = extractor(x)
            logits = model(feats)
            loss = loss_fn(logits, y)

        total_loss += float(loss.item())

        probs = torch.softmax(logits, dim=1)

        # class 1 = bonafide
        # class 0 = spoof
        score_bonafide = probs[:, 1] 

        preds = torch.argmax(logits, dim=1)

        y_true_all.append(y.detach().cpu().numpy())
        y_pred_all.append(preds.detach().cpu().numpy())
        y_score_all.append(score_bonafide.detach().cpu().numpy())


    y_true = np.concatenate(y_true_all)
    y_pred = np.concatenate(y_pred_all)
    y_score = np.concatenate(y_score_all)

    acc = compute_accuracy(y_true, y_pred)

    # EER computed using spoof as positive class
    eer = compute_eer(y_true, y_score, pos_label=1)


    return {
        "loss": total_loss / max(1, len(loader)),
        "acc": acc,
        "eer": eer,
    }
