import torch


def pad_or_repeat_1d(x: torch.Tensor, target_len: int) -> torch.Tensor:
    """Pad/Repeat to fixed length. Avoids silence padding that can harm spoof cues."""
    if x.dim() != 1:
        x = x.view(-1)

    n = x.numel()
    if n == 0:
        # defensive: rare corrupted file
        return torch.zeros(target_len, dtype=torch.float32)

    if n >= target_len:
        return x[:target_len]

    # repeat
    rep = (target_len // n) + 1
    y = x.repeat(rep)[:target_len]
    return y

