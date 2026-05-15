from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .model import predict_time_to_full, store
from .schemas import PredictionRequest, PredictionResponse
from .utils import configure_logging, logger, status_from_fullness


configure_logging()

app = FastAPI(
    title="MedWaste ML Prediction Service",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("BACKEND_CORS_ORIGINS", os.getenv("BACKEND_ORIGIN", "")).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    store.load()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
async def predict(payload: PredictionRequest) -> PredictionResponse:
    logger.info("Prediction request binId=%s points=%s", payload.binId, len(payload.history))

    latest_fullness = payload.history[-1].fullness if payload.history else None
    trained, note = store.get_or_train(payload.binId, payload.history)

    if trained is None:
        status = status_from_fullness(float(latest_fullness) if latest_fullness is not None else None)
        logger.info("Prediction skipped binId=%s reason=%s", payload.binId, note)
        return PredictionResponse(
            binId=payload.binId,
            predictedHoursToFull=None,
            confidence=None,
            status=status,
            estimatedFullTime=None,
            hours_until_full=None,
            target_timestamp=None,
            is_critical=status == "CRITICAL",
            note=note,
        )

    result = predict_time_to_full(trained, payload.history)
    estimated = result["estimatedFullTime"]
    logger.info(
        "Prediction completed binId=%s hours=%s confidence=%s status=%s",
        payload.binId,
        result["predictedHoursToFull"],
        result["confidence"],
        result["status"],
    )

    return PredictionResponse(
        binId=payload.binId,
        predictedHoursToFull=result["predictedHoursToFull"],
        confidence=result["confidence"],
        status=result["status"],
        estimatedFullTime=estimated,
        hours_until_full=result["predictedHoursToFull"],
        target_timestamp=estimated.timestamp() if estimated else None,
        is_critical=result["status"] == "CRITICAL",
        note=result["note"],
    )
