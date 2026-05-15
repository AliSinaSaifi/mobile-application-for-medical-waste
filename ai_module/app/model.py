from __future__ import annotations

from datetime import timedelta
from typing import Any

import joblib

from .schemas import HistoryPoint
from .trainer import MODEL_VERSION, TrainedModel, train_linear_regression
from .utils import MODEL_DIR, MODEL_PATH, clamp_confidence, history_signature, logger, status_from_fullness


class BinModelStore:
    def __init__(self) -> None:
        self.registry: dict[str, Any] = {"version": MODEL_VERSION, "bins": {}}

    def load(self) -> None:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        if not MODEL_PATH.exists():
            logger.info("No persisted model registry found at %s", MODEL_PATH)
            return

        try:
            self.registry = joblib.load(MODEL_PATH)
            if self.registry.get("version") != MODEL_VERSION:
                logger.info("Ignoring stale model registry version=%s", self.registry.get("version"))
                self.registry = {"version": MODEL_VERSION, "bins": {}}
                return

            self.registry.setdefault("version", MODEL_VERSION)
            self.registry.setdefault("bins", {})
            logger.info("Loaded model registry from %s", MODEL_PATH)
        except Exception:
            logger.exception("Failed to load model registry; starting with empty registry")
            self.registry = {"version": MODEL_VERSION, "bins": {}}

    def save(self) -> None:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.registry, MODEL_PATH)

    def get_or_train(self, bin_id: str, history: list[HistoryPoint]) -> tuple[TrainedModel | None, str | None]:
        if len(history) < 2:
            return None, "Insufficient history for prediction"

        signature = history_signature(history)
        cached = self.registry["bins"].get(bin_id)
        if cached and cached.get("signature") == signature:
            trained = cached.get("trained")
            if getattr(trained, "model_version", None) == MODEL_VERSION:
                return trained, None

        trained, train_note = train_linear_regression(history)
        if trained is None:
            return None, train_note or "Trend is flat or insufficiently variable"

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

    slope_per_hour = float(getattr(trained, "slope_per_hour", 0.0))
    if slope_per_hour <= 0:
        return {
            "predictedHoursToFull": None,
            "confidence": trained.confidence,
            "status": status,
            "estimatedFullTime": None,
            "note": "Fullness trend is flat or decreasing",
        }

    remaining = max(0.0, 100.0 - latest_fullness)
    hours_to_full = remaining / slope_per_hour
    seconds_to_full = max(0.0, hours_to_full * 3600.0)
    estimated_full_time = latest.timestamp + timedelta(seconds=seconds_to_full)
    observed_hours = max(float(getattr(trained, "observed_hours", 0.0)), 0.0)
    horizon_quality = 1.0 if hours_to_full == 0 else (observed_hours * 2.0) / ((observed_hours * 2.0) + hours_to_full)
    confidence = clamp_confidence(float(trained.confidence) * max(0.0, min(1.0, horizon_quality)))

    note = getattr(trained, "fit_note", None)
    if note is None and horizon_quality < 0.35:
        note = "Low confidence: forecast horizon is much longer than the observed fill trend"

    return {
        "predictedHoursToFull": round(seconds_to_full / 3600.0, 2),
        "confidence": confidence,
        "status": status_from_fullness(100 if seconds_to_full == 0 else latest_fullness),
        "estimatedFullTime": estimated_full_time,
        "note": note,
    }


store = BinModelStore()
