from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class HistoryPoint(BaseModel):
    timestamp: datetime
    fullness: float = Field(..., ge=0, le=100)


class PredictionRequest(BaseModel):
    binId: str = Field(default="unknown", min_length=1)
    history: list[HistoryPoint] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_history(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        raw_history = data.get("history", [])
        normalized = []
        for item in raw_history:
            if isinstance(item, dict):
                normalized.append(item)
                continue

            if isinstance(item, (list, tuple)) and len(item) >= 2:
                fullness, timestamp = item[0], item[1]
                normalized.append(
                    {
                        "fullness": fullness,
                        "timestamp": datetime.fromtimestamp(float(timestamp), tz=timezone.utc).isoformat(),
                    }
                )

        return {
            **data,
            "binId": data.get("binId") or data.get("bin_id") or "unknown",
            "history": normalized,
        }

    @field_validator("history")
    @classmethod
    def require_chronological_payload(cls, value: list[HistoryPoint]) -> list[HistoryPoint]:
        return sorted(value, key=lambda point: point.timestamp)


class PredictionResponse(BaseModel):
    binId: str
    predictedHoursToFull: float | None
    confidence: float | None
    status: str
    estimatedFullTime: datetime | None
    hours_until_full: float | None = None
    target_timestamp: float | None = None
    is_critical: bool = False
    note: str | None = None
