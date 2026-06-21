# Model architecture
import torch
import torch.nn as nn
import torch.nn.functional as F
class MaxFeatureMap(nn.Module):
    """Max-Feature-Map activation used in LCNN."""

    def forward(self, x):
        # Split channels into 2 and take max
        c = x.size(1)
        assert c % 2 == 0, "MFM requires even number of channels"
        x1, x2 = torch.split(x, c // 2, dim=1)
        return torch.max(x1, x2)
    
class MFMConv(nn.Module):
    def __init__(self, in_ch, out_ch, kernel_size, stride=1, padding=0):
        super().__init__()
        # out_ch*2 because MFM halves channels
        self.conv = nn.Conv2d(in_ch, out_ch * 2, kernel_size, stride=stride, padding=padding, bias=False)
        self.bn = nn.BatchNorm2d(out_ch * 2)
        self.mfm = MaxFeatureMap()

    def forward(self, x):
        x = self.conv(x)
        x = self.bn(x)
        x = self.mfm(x)
        return x
    
class MFMLinear(nn.Module):
    def __init__(self, in_dim, out_dim):
        super().__init__()
        self.fc = nn.Linear(in_dim, out_dim * 2)
        self.mfm = MaxFeatureMap()

    def forward(self, x):
        x = self.fc(x)
        # fake 2d to use MFM split along dim=1
        x = x.unsqueeze(-1).unsqueeze(-1)
        x = self.mfm(x)
        return x.squeeze(-1).squeeze(-1)
    
class LCNN(nn.Module):
    """LCNN for spoof detection.

    Input: (B, 1, n_mels, time)
    Output: logits (B, 2)

    This is a compact but strong model.
    """

    def __init__(self, num_classes: int = 2):
        super().__init__()

        self.block1 = nn.Sequential(
            MFMConv(1, 32, kernel_size=5, stride=1, padding=2),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )

        self.block2 = nn.Sequential(
            MFMConv(32, 48, kernel_size=3, stride=1, padding=1),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )

        self.block3 = nn.Sequential(
            MFMConv(48, 64, kernel_size=3, stride=1, padding=1),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )

        self.block4 = nn.Sequential(
            MFMConv(64, 64, kernel_size=3, stride=1, padding=1),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )

        self.dropout = nn.Dropout(0.4)

        # LazyLinear so we don't care about exact time dim
        self.fc1 = nn.LazyLinear(256)
        self.fc2 = nn.Linear(256, num_classes)

    def forward(self, x):
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        x = self.block4(x)

        x = torch.flatten(x, 1)
        x = self.dropout(x)
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        return x
