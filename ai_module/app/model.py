from __future__ import annotations

from datetime import timedelta
from typing import Any

import joblib

from .schemas import HistoryPoint
from .trainer import TrainedModel, train_linear_regression
from .utils import MODEL_DIR, MODEL_PATH, history_signature, logger, status_from_fullness


class BinModelStore:
    def __init__(self) -> None:
        self.registry: dict[str, Any] = {"version": 1, "bins": {}}

    def load(self) -> None:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        if not MODEL_PATH.exists():
            logger.info("No persisted model registry found at %s", MODEL_PATH)
            return

        try:
            self.registry = joblib.load(MODEL_PATH)
            self.registry.setdefault("version", 1)
            self.registry.setdefault("bins", {})
            logger.info("Loaded model registry from %s", MODEL_PATH)
        except Exception:
            logger.exception("Failed to load model registry; starting with empty registry")
            self.registry = {"version": 1, "bins": {}}

    def save(self) -> None:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.registry, MODEL_PATH)

    def get_or_train(self, bin_id: str, history: list[HistoryPoint]) -> tuple[TrainedModel | None, str | None]:
        if len(history) < 2:
            return None, "Insufficient history for prediction"

        signature = history_signature(history)
        cached = self.registry["bins"].get(bin_id)
        if cached and cached.get("signature") == signature:
            return cached["trained"], None

        trained = train_linear_regression(history)
        if trained is None:
            return None, "Trend is flat or insufficiently variable"

        self.registry["bins"][bin_id] = {
            "signature": signature,
            "trained": trained,
        }
        self.save()
        logger.info("Trained and persisted model for binId=%s", bin_id)
        return trained, None


def predict_time_to_full(trained: TrainedModel, history: list[HistoryPoint]) -> dict[str, Any]:
    ordered = sorted(history, key=lambda point: point.timestamp)
    latest = ordered[-1]
    latest_fullness = float(latest.fullness)
    status = status_from_fullness(latest_fullness)

    if trained.slope_per_step <= 0:
        return {
            "predictedHoursToFull": None,
            "confidence": trained.confidence,
            "status": status,
            "estimatedFullTime": None,
            "note": "Fullness trend is flat or decreasing",
        }

    remaining = max(0.0, 100.0 - latest_fullness)
    steps_to_full = remaining / trained.slope_per_step

    if len(ordered) >= 2:
        deltas = [
            (ordered[index].timestamp - ordered[index - 1].timestamp).total_seconds()
            for index in range(1, len(ordered))
        ]
        positive_deltas = [delta for delta in deltas if delta > 0]
        seconds_per_step = sum(positive_deltas) / len(positive_deltas) if positive_deltas else 3600.0
    else:
        seconds_per_step = 3600.0

    seconds_to_full = max(0.0, steps_to_full * seconds_per_step)
    estimated_full_time = latest.timestamp + timedelta(seconds=seconds_to_full)

    return {
        "predictedHoursToFull": round(seconds_to_full / 3600.0, 2),
        "confidence": trained.confidence,
        "status": status_from_fullness(100 if seconds_to_full == 0 else latest_fullness),
        "estimatedFullTime": estimated_full_time,
        "note": None,
    }


store = BinModelStore()
