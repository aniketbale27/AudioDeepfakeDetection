import torch
import torch.nn as nn
import torchaudio
import math


def _linear_filterbank(sr, n_fft, n_filters, f_min, f_max, device):
    """
    Create LFCC linear filterbank matrix.
    Output shape: (n_filters, n_fft//2 + 1)
    """
    n_freqs = n_fft // 2 + 1

    # Linear spaced frequencies
    freqs = torch.linspace(0, sr / 2, n_freqs, device=device)
    f_min = float(f_min)
    f_max = float(f_max)

    # Linear spaced filter edges
    edges = torch.linspace(f_min, f_max, n_filters + 2, device=device)

    fb = torch.zeros(n_filters, n_freqs, device=device)

    for i in range(n_filters):
        left = edges[i]
        center = edges[i + 1]
        right = edges[i + 2]

        # triangular
        up = (freqs - left) / (center - left + 1e-9)
        down = (right - freqs) / (right - center + 1e-9)

        fb[i] = torch.clamp(torch.min(up, down), min=0.0)

    return fb


class LFCCExtractor(nn.Module):
    """
    Waveform -> LFCC features

    Output: (B,  виж: 1, n_lfcc, time)

    Production notes:
    - Uses STFT power spectrum
    - Linear triangular filterbank
    - log
    - DCT to LFCC
    - per-sample normalization
    """

    def __init__(
        self,
        sample_rate=16000,
        n_fft=512,
        hop_length=160,
        win_length=400,
        n_filters=40,
        n_lfcc=40,
        f_min=0,
        f_max=8000,
        dct_type=2,
        norm="ortho",
    ):
        super().__init__()

        self.sample_rate = sample_rate
        self.n_fft = n_fft
        self.hop_length = hop_length
        self.win_length = win_length

        self.n_filters = n_filters
        self.n_lfcc = n_lfcc
        self.f_min = f_min
        self.f_max = f_max

        self.window = torch.hann_window(win_length)

        # DCT matrix (n_lfcc x n_filters)
        dct_mat = torchaudio.functional.create_dct(
            n_mfcc=n_lfcc,
            n_mels=n_filters,
            norm=norm,
        )
        self.register_buffer("dct_mat", dct_mat)

        self.dct_type = dct_type

        # Filterbank created lazily on first forward (needs device)
        self._fb = None

    def _get_fb(self, device):
        if self._fb is None or self._fb.device != device:
            self._fb = _linear_filterbank(
                sr=self.sample_rate,
                n_fft=self.n_fft,
                n_filters=self.n_filters,
                f_min=self.f_min,
                f_max=self.f_max,
                device=device,
            )
        return self._fb

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: (B, T)
        return: (B, 1, n_lfcc, time)
        """
        if x.dim() == 1:
            x = x.unsqueeze(0)

        device = x.device

        # window must be on device
        window = self.window.to(device)

        # STFT -> power spectrum
        stft = torch.stft(
            x,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
            win_length=self.win_length,
            window=window,
            center=True,
            return_complex=True,
        )
        # (B, freq, time)
        power = (stft.real ** 2 + stft.imag ** 2)

        # Apply linear filterbank
        fb = self._get_fb(device)  # (n_filters, freq)
        # (B, n_filters, time)
        feat = torch.matmul(fb, power)

        # log
        feat = torch.clamp(feat, min=1e-10)
        log_feat = torch.log(feat)

        log_feat = torch.nan_to_num(log_feat, neginf=-20.0, posinf=0.0)

        # DCT -> LFCC
        # (B, n_lfcc, time)
        lfcc = torch.matmul(self.dct_mat.to(device), log_feat)

        # Per-sample normalization
        mean = lfcc.mean(dim=(1, 2), keepdim=True)
        std = lfcc.std(dim=(1, 2), keepdim=True).clamp_min(1e-3)
        z = (lfcc - mean) / std

        return z.unsqueeze(1)
