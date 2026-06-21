import numpy as np


def compute_accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float((y_true == y_pred).mean() * 100.0)


def compute_eer(y_true: np.ndarray, y_score: np.ndarray, pos_label: int = 1) -> float:
    """
    Stable EER computation.

    y_true: labels (0/1)
    y_score: score for pos_label (higher => more likely pos_label)
    pos_label: which class is positive
    """

    y_true = y_true.astype(np.int32)
    y_score = y_score.astype(np.float64)

    # Convert to binary {0,1} where 1 is positive
    y = (y_true == pos_label).astype(np.int32)

    P = y.sum()
    N = len(y) - P

    if P == 0 or N == 0:
        return 100.0

    # Sort scores ascending
    idx = np.argsort(y_score)
    y = y[idx]

    # FN = positives rejected (below threshold)
    fn = np.cumsum(y)

    # FP = negatives below threshold
    fp = np.cumsum(1 - y)

    # FRR = FN / P
    frr = fn / P

    # FAR = false accepts = negatives above threshold
    far = (N - fp) / N

    # Find closest FAR and FRR
    i = np.argmin(np.abs(far - frr))
    eer = (far[i] + frr[i]) / 2.0

    return float(eer * 100.0)
