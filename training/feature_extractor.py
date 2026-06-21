# Feature extraction (STFT/log-mel)
import torch
import torch.nn as nn
import torchaudio



class LFCCExtractor(nn.Module):
    def __init__(
        self,
        sample_rate=16000,
        n_fft=512,
        hop_length=160,
        win_length=400,
        n_lfcc=60,
    ):
        super().__init__()

        self.lfcc = torchaudio.transforms.LFCC(
            sample_rate=sample_rate,
            n_lfcc=n_lfcc,
            speckwargs={
                "n_fft": n_fft,
                "hop_length": hop_length,
                "win_length": win_length,
                "power": 2.0,
            },
        )

    def forward(self, x):

        # x: (B, T)

        feat = self.lfcc(x)

        # ensure CNN format (B, 1, F, T)
        feat = feat.unsqueeze(1)

        return feat
class LogMelExtractor(nn.Module):
    """Waveform -> log-mel spectrogram.

    Output shape: (B, 1, n_mels, time)

    Notes:
    - We do per-sample normalization.
    - We use power=2.0 mel, then log.
    """

    def __init__(
        self,
        sample_rate: int,
        n_fft: int,
        hop_length: int,
        win_length: int,
        n_mels: int,
        f_min: int,
        f_max: int,
    ):
        super().__init__()

        self.mel = torchaudio.transforms.MelSpectrogram(
            sample_rate=sample_rate,
            n_fft=n_fft,
            hop_length=hop_length,
            win_length=win_length,
            n_mels=n_mels,
            f_min=f_min,
            f_max=f_max,
            power=2.0,
            center=True,
            pad_mode="reflect",
            norm=None,
            mel_scale="htk",
        )

        self.amp_to_db = torchaudio.transforms.AmplitudeToDB(stype="power", top_db=80)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, T)
        if x.dim() == 1:
            x = x.unsqueeze(0)

        mel = self.mel(x)  # (B, n_mels, time)
        logmel = self.amp_to_db(mel)
        logmel = torch.nan_to_num(logmel, neginf=-80.0, posinf=0.0)

        # Per-sample standardization (helps generalization)
        mean = logmel.mean(dim=(1, 2), keepdim=True)
        std = logmel.std(dim=(1, 2), keepdim=True).clamp_min(1e-3)

        z = (logmel - mean) / std

        return z.unsqueeze(1)  # (B, 1, n_mels, time)
