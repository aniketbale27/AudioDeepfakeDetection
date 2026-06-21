# Evaluation metrics (EER, Accuracy)
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

        # dataset mapping:
        # 1 = bonafide
        # 0 = spoof
        score_bonafide = probs[:, 1]

        preds = torch.argmax(logits, dim=1)

        y_true_all.append(y.detach().cpu().numpy())
        y_pred_all.append(preds.detach().cpu().numpy())
        y_score_all.append(score_bonafide.detach().cpu().numpy())

    y_true = np.concatenate(y_true_all)
    y_pred = np.concatenate(y_pred_all)
    y_score = np.concatenate(y_score_all)

    acc = compute_accuracy(y_true, y_pred)

    # EER computed using bonafide as positive class
    eer = compute_eer(y_true, y_score, pos_label=1)

    return {
        "loss": total_loss / max(1, len(loader)),
        "acc": acc,
        "eer": eer,
    }
