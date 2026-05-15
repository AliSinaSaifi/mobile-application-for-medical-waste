from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.linear_model import LinearRegression

from .schemas import HistoryPoint
from .utils import clamp_confidence


@dataclass
class TrainedModel:
    model: LinearRegression
    confidence: float
    slope_per_step: float
    latest_fullness: float
    latest_timestamp_iso: str


def train_linear_regression(history: list[HistoryPoint]) -> TrainedModel | None:
    if len(history) < 2:
        return None

    ordered = sorted(history, key=lambda point: point.timestamp)
    y = np.array([float(point.fullness) for point in ordered], dtype=float)
    if len(set(np.round(y, 6))) < 2:
        return None

    x = np.arange(len(ordered), dtype=float).reshape(-1, 1)
    model = LinearRegression()
    model.fit(x, y)

    return TrainedModel(
        model=model,
        confidence=clamp_confidence(float(model.score(x, y))),
        slope_per_step=float(model.coef_[0]),
        latest_fullness=float(y[-1]),
        latest_timestamp_iso=ordered[-1].timestamp.isoformat(),
    )
