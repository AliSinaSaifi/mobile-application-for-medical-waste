import React from "react";

function PredictionCard({ id }) {
  return (
    <div className="bg-white shadow rounded-xl p-4 border">
      <h4 className="font-bold text-lg">{id}</h4>
      <p className="text-sm text-gray-500">
        Auto Registered • Острые Медицинские Отходы
      </p>

      <div className="mt-3 space-y-1 text-sm">
        <p>Заполнение 100%</p>
        <p>Рекомендуемый сбор: Сегодня</p>
        <p className="text-green-600 font-medium">
          Уверенность модели: 87%
        </p>
      </div>

      <button className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
        Запланировать сбор
      </button>
    </div>
  );
}

export default PredictionCard;