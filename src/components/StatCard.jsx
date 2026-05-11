import React from "react";

function StatCard({ title, value, subtitle, trend }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 w-full">
      <h3 className="text-gray-500 text-sm">{title}</h3>
      <div className="flex items-end justify-between mt-2">
        <span className="text-3xl font-bold">{value}</span>
        {trend && (
          <span className="text-sm text-green-500 font-medium">
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export default StatCard;