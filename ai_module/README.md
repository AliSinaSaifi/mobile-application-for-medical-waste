# MedWaste ML Service

Railway deploy target for the FastAPI prediction microservice.

## Runtime

- App entry point: `app.main:app`
- Start command is provided by `Dockerfile`
- Public endpoints:
  - `GET /health`
  - `POST /predict`

## Railway

Create this as a separate Railway service with the service root set to `ai_module`.
Railway provides `PORT` automatically. The container binds to `0.0.0.0:$PORT`.

## Environment

ML service:

```text
PORT=<set by Railway>
BACKEND_ORIGIN=https://your-backend-service-url
```

Backend:

```text
ML_SERVICE_URL=https://your-railway-ml-service-url
ML_SERVICE_TIMEOUT_MS=5000
```

The ML service does not require a database. Runtime model state is persisted to
`models/bin_model.pkl` inside the service filesystem.

## Flow

```text
Frontend -> Node backend -> ML service
                         -> safe null prediction if ML is unavailable
```

The frontend should never call this service directly.
