from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import logging
import os
from pathlib import Path

from .schemas import HistoryPoint


logger = logging.getLogger("medwaste-ml")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = PROJECT_ROOT / "models"
MODEL_PATH = MODEL_DIR / "bin_model.pkl"


def configure_logging() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def history_signature(history: list[HistoryPoint]) -> str:
    payload = "|".join(
        f"{point.timestamp.isoformat()}:{round(float(point.fullness), 4)}"
        for point in history
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def status_from_fullness(fullness: float | None) -> str:
    if fullness is None:
        return "NORMAL"
    if fullness >= 85:
        return "CRITICAL"
    if fullness >= 70:
        return "WARNING"
    return "NORMAL"


def clamp_confidence(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 100:
        return 100.0
    return round(float(value), 2)
