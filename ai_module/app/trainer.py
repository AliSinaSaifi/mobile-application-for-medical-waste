from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.linear_model import LinearRegression

from .schemas import HistoryPoint
from .utils import clamp_confidence


MODEL_VERSION = 2
MIN_TRAINING_POINTS = 6
MAX_TRAINING_POINTS = 30
RESET_DROP_PERCENT = 12.0
MIN_OBSERVED_HOURS = 2.0
MIN_FULLNESS_RANGE = 3.0


@dataclass
class TrainedModel:
    model: LinearRegression
    confidence: float
    slope_per_hour: float
    slope_per_step: float
    latest_fullness: float
    latest_timestamp_iso: str
    model_version: int
    active_points: int
    observed_hours: float
    r2: float
    rmse: float
    trend_strength: float
    cadence_quality: float
    fit_note: str | None = None


def _dedupe_history(history: list[HistoryPoint]) -> list[HistoryPoint]:
    ordered = sorted(history, key=lambda point: point.timestamp)
    unique: dict[float, HistoryPoint] = {}

    for point in ordered:
        unique[point.timestamp.timestamp()] = point

    return [unique[key] for key in sorted(unique)]


def _active_fill_cycle(history: list[HistoryPoint]) -> list[HistoryPoint]:
    if not history:
        return []

    start_index = 0
    for index in range(1, len(history)):
        previous = float(history[index - 1].fullness)
        current = float(history[index].fullness)
        if previous - current >= RESET_DROP_PERCENT:
            start_index = index

    return history[start_index:][-MAX_TRAINING_POINTS:]


def _elapsed_hours(points: list[HistoryPoint]) -> np.ndarray:
    first = points[0].timestamp
    return np.array(
        [(point.timestamp - first).total_seconds() / 3600.0 for point in points],
        dtype=float,
    )


def _cadence_quality(x_hours: np.ndarray) -> float:
    deltas = np.diff(x_hours)
    positive = deltas[deltas > 0]
    if len(positive) < 2:
        return 0.75

    mean_delta = float(np.mean(positive))
    if mean_delta <= 0:
        return 0.0

    coefficient_of_variation = float(np.std(positive) / mean_delta)
    return max(0.0, min(1.0, 1.0 / (1.0 + coefficient_of_variation)))


def _fit_model(x_hours: np.ndarray, y: np.ndarray) -> tuple[LinearRegression, np.ndarray, float, float]:
    x = x_hours.reshape(-1, 1)
    model = LinearRegression()
    model.fit(x, y)
    predicted = model.predict(x)

    residuals = y - predicted
    ss_res = float(np.sum(residuals ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
    rmse = float(np.sqrt(np.mean(residuals ** 2)))

    return model, residuals, r2, rmse


def _remove_residual_outliers(x_hours: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if len(y) < MIN_TRAINING_POINTS + 3:
        return x_hours, y

    _, residuals, _, _ = _fit_model(x_hours, y)
    center = float(np.median(residuals))
    absolute_deviation = np.abs(residuals - center)
    mad = float(np.median(absolute_deviation))
    robust_sigma = 1.4826 * mad
    threshold = max(6.0, 3.0 * robust_sigma)
    mask = absolute_deviation <= threshold

    if int(np.sum(mask)) < MIN_TRAINING_POINTS:
        return x_hours, y

    return x_hours[mask], y[mask]


def _sample_quality(point_count: int) -> float:
    return max(0.0, min(1.0, np.sqrt(point_count / 12.0)))


def _trend_strength(slope_per_hour: float, observed_hours: float, rmse: float, point_count: int) -> float:
    fitted_change = abs(slope_per_hour) * observed_hours
    noise_scale = max(0.0, rmse) * np.sqrt(max(point_count, 1))

    if fitted_change <= 0 and noise_scale <= 0:
        return 0.0

    return max(0.0, min(1.0, fitted_change / (fitted_change + noise_scale)))


def train_linear_regression(history: list[HistoryPoint]) -> tuple[TrainedModel | None, str | None]:
    deduped = _dedupe_history(history)
    if len(deduped) < MIN_TRAINING_POINTS:
        return None, f"Need at least {MIN_TRAINING_POINTS} unique telemetry points"

    cycle = _active_fill_cycle(deduped)
    if len(cycle) < MIN_TRAINING_POINTS:
        return None, f"Latest fill cycle has only {len(cycle)} telemetry points after collection reset"

    x_hours = _elapsed_hours(cycle)
    y = np.array([float(point.fullness) for point in cycle], dtype=float)
    observed_hours = float(x_hours[-1] - x_hours[0])

    if observed_hours < MIN_OBSERVED_HOURS:
        return None, "Telemetry window is too short to estimate a stable fill rate"

    if float(np.max(y) - np.min(y)) < MIN_FULLNESS_RANGE:
        return None, "Fullness variation is too small to estimate a reliable trend"

    x_hours, y = _remove_residual_outliers(x_hours, y)
    x_hours = x_hours - float(x_hours[0])
    observed_hours = float(x_hours[-1] - x_hours[0])

    if len(y) < MIN_TRAINING_POINTS or observed_hours < MIN_OBSERVED_HOURS:
        return None, "Not enough usable telemetry after outlier filtering"

    model, _, r2, rmse = _fit_model(x_hours, y)
    slope_per_hour = float(model.coef_[0])
    if slope_per_hour <= 0:
        return None, "Fullness trend is flat or decreasing"

    intervals = np.diff(x_hours)
    positive_intervals = intervals[intervals > 0]
    avg_step_hours = float(np.mean(positive_intervals)) if len(positive_intervals) else 1.0
    slope_per_step = slope_per_hour * avg_step_hours

    fit_quality = max(0.0, min(1.0, r2))
    sample_quality = _sample_quality(len(y))
    cadence_quality = _cadence_quality(x_hours)
    trend_strength = _trend_strength(slope_per_hour, observed_hours, rmse, len(y))
    confidence = clamp_confidence(100.0 * fit_quality * sample_quality * cadence_quality * trend_strength)

    note = None
    if fit_quality < 0.35:
        note = "Low confidence: telemetry is noisy for a linear trend"
    elif trend_strength < 0.35:
        note = "Low confidence: fill-rate signal is weak relative to telemetry noise"
    elif cadence_quality < 0.5:
        note = "Low confidence: telemetry timestamps are irregular"

    return TrainedModel(
        model=model,
        confidence=confidence,
        slope_per_hour=slope_per_hour,
        slope_per_step=slope_per_step,
        latest_fullness=float(y[-1]),
        latest_timestamp_iso=cycle[-1].timestamp.isoformat(),
        model_version=MODEL_VERSION,
        active_points=len(y),
        observed_hours=observed_hours,
        r2=max(0.0, min(1.0, float(r2))),
        rmse=rmse,
        trend_strength=trend_strength,
        cadence_quality=cadence_quality,
        fit_note=note,
    ), None
