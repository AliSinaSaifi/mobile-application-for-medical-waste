from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.linear_model import LinearRegression
import numpy as np
import datetime

app = FastAPI()

class HistoryData(BaseModel):
    # Принимаем массив данных: [заполненность, метка_времени_в_секундах]
    history: list[list[float]] 

@app.post("/predict")
async def predict_overflow(data: HistoryData):
    if len(data.history) < 2:
        return {"error": "Need at least 2 points for prediction", "days_left": "NaN"}

    # Превращаем данные в массивы NumPy
    points = np.array(data.history)
    X = points[:, 1].reshape(-1, 1) # Время (timestamp)
    y = points[:, 0]               # Заполненность (%)

    # Обучаем модель на лету
    model = LinearRegression()
    model.fit(X, y)

    # Вычисляем время, когда y станет 100%
    # 100 = slope * target_time + intercept  =>  target_time = (100 - intercept) / slope
    slope = model.coef_[0]
    intercept = model.intercept_

    if slope <= 0:
        return {"days_left": "Never (Emptying)", "confidence": 0.0}

    target_timestamp = (100 - intercept) / slope
    current_time = datetime.datetime.now().timestamp()
    seconds_left = target_timestamp - current_time
    hours_left = round(seconds_left / 3600, 1)

    # R^2 Score для "Уверенности модели" (важно для диплома!)
    confidence = model.score(X, y)

    return {
        "hours_until_full": float(max(0, hours_left)),
        "target_timestamp": float(target_timestamp),
        "confidence": float(round(confidence * 100, 2)),
        "is_critical": bool(hours_left < 24)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)