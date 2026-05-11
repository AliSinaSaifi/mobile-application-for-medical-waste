import React, { useState, useMemo, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useSocket } from "../hooks/useSocket";
import { getBins } from "../services/api";


const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  .ct-root {
    min-height: 100vh;
    background: #f0f4f8;
    font-family: 'DM Sans', sans-serif;
    color: #1a2035;
    padding: 32px;
  }

  /* PAGE HEADER */
  .ct-page-header { margin-bottom: 28px; }
  .ct-page-header h1 {
    font-size: 1.9rem; font-weight: 800;
    letter-spacing: -0.03em; color: #1a2035;
    margin-bottom: 4px;
  }
  .ct-page-header p { color: #5e6a85; font-size: 0.9rem; }

  /* TOOLBAR */
  .ct-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
  }
  .ct-toolbar-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  .ct-btn {
    padding: 8px 16px; border-radius: 8px; border: 1px solid #e4e9f0;
    background: #fff; font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem; font-weight: 500; color: #1a2035;
    cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; gap: 6px;
  }
  .ct-btn:hover { background: #f0f4f8; }
  .ct-btn-primary { background: #1A6EFF; color: #fff; border-color: #1A6EFF; }
  .ct-btn-primary:hover { background: #0F4ECC; }

  .ct-sort-select {
    padding: 8px 12px; border-radius: 8px; border: 1px solid #e4e9f0;
    background: #fff; font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem; color: #1a2035; cursor: pointer;
    outline: none; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235e6a85' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
    padding-right: 30px;
  }

  .ct-count {
    font-size: 0.82rem; color: #5e6a85;
    background: #f0f4f8; padding: 6px 12px; border-radius: 8px;
  }

  /* GRID */
  .ct-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  /* BIN CARD */
  .ct-card {
    background: #fff; border-radius: 14px;
    border: 1px solid #e4e9f0;
    padding: 20px; position: relative; overflow: hidden;
    transition: transform .25s, box-shadow .25s;
  }
  .ct-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,.09); }

  /* Accent bar on top */
  .ct-card-accent {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
  }

  /* CARD HEADER */
  .ct-card-head {
    display: flex; justify-content: space-between;
    align-items: flex-start; margin-bottom: 4px;
  }
  .ct-card-id {
    font-size: 1.05rem; font-weight: 800; color: #1a2035;
  }
  .ct-status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 0.72rem; font-weight: 600; padding: 3px 9px;
    border-radius: 999px;
  }
  .ct-status-active   { background: #e6faf3; color: #00A870; }
  .ct-status-warning  { background: #fff7e6; color: #D97706; }
  .ct-status-critical { background: #fff0f1; color: #E53E3E; }

  .ct-card-sub {
    font-size: 0.75rem; color: #5e6a85; margin-bottom: 16px;
  }

  /* FULLNESS */
  .ct-fullness-header {
    display: flex; justify-content: space-between;
    font-size: 0.78rem; font-weight: 500; margin-bottom: 6px;
    color: #5e6a85;
  }
  .ct-fullness-val { font-weight: 700; }
  .ct-bar-track {
    height: 8px; background: #e8edf5; border-radius: 99px;
    overflow: hidden; margin-bottom: 18px;
  }
  .ct-bar-fill {
    height: 100%; border-radius: 99px;
    transition: width .6s cubic-bezier(.22,1,.36,1);
  }

  /* STATS ROW */
  .ct-stats-row {
    display: grid; grid-template-columns: repeat(3,1fr);
    gap: 8px; margin-bottom: 16px;
  }
  .ct-stat {
    background: #f8fafc; border-radius: 8px; padding: 10px;
    text-align: center;
  }
  .ct-stat-icon { font-size: 0.9rem; margin-bottom: 2px; }
  .ct-stat-val {
    font-size: 0.9rem; font-weight: 700; color: #1a2035;
  }
  .ct-stat-label { font-size: 0.68rem; color: #5e6a85; margin-top: 1px; }

  /* FOOTER ROW */
  .ct-card-footer {
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid #f0f4f8; padding-top: 12px;
  }
  .ct-type-badge {
    font-size: 0.72rem; font-weight: 600;
    background: #eff5ff; color: #1A6EFF;
    padding: 3px 9px; border-radius: 999px;
  }
  .ct-date { font-size: 0.72rem; color: #5e6a85; }

  /* PREDICTIONS */
  .db-predictions-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 12px; }
  .db-pred-card {
    background: #fff; border-radius: 12px; border: 1px solid #e4e9f0;
    padding: 16px; transition: transform .2s, box-shadow .2s;
  }
  .db-pred-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.07); }
  .db-pred-id { font-family:  sans-serif; font-weight: 700; font-size: 0.95rem; color: #1a2035; margin-bottom: 2px; }
  .db-pred-meta { font-size: 0.75rem; color: #5e6a85; margin-bottom: 10px; }
  .db-pred-row { display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px; }
  .db-pred-row-label { color: #5e6a85; }
  .db-pred-row-val { font-weight: 500; color: #1a2035; }
  .db-pred-confidence { margin-top: 10px; }
  .db-pred-conf-bar { height: 4px; background: #e4e9f0; border-radius: 99px; margin-top: 4px; }
  .db-pred-conf-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #1A6EFF, #00D68F); }
  .db-pred-btn {
    width: 100%; margin-top: 12px; padding: 8px; border-radius: 8px;
    border: 1px solid #1A6EFF; color: #1A6EFF; background: transparent;
    font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all .2s;
  }
  .db-pred-btn:hover { background: #1A6EFF; color: #fff; }
  .db-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
  .db-badge-green { background: #e6faf3; color: #00A870; }
  .db-badge-blue  { background: #eff5ff; color: #1A6EFF; }

  @media (max-width: 700px) {
    .ct-root { padding: 16px; }
    .ct-grid { grid-template-columns: 1fr; }
  }
`;

 function Containers() {
  const [bins, setBins] = useState([]);
  const [sortType, setSortType] = useState("fullness_desc");
  const [loading, setLoading] = useState(true);

  const fetchBins = async () => {
    try {
      const res = await getBins();
      const items = Array.isArray(res.data) ? res.data : (res.data?.bins || []);
      setBins(items);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching bins:", err);
      setBins([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
    const id = setInterval(fetchBins, 5000);
    return () => clearInterval(id);
  }, []);

  useSocket({
  'telemetry:update': ({ binId, fullness, timestamp }) => {
    setBins(prev => {
      const exists = prev.find(b => b._id === binId);
      if (exists) return prev.map(b => b._id === binId ? { ...b, fullness, timestamp } : b);
      return [...prev, { _id: binId, fullness, timestamp }];
    });
  },
});
 

  // 2. Логика сортировки
  const sortedBins = useMemo(() => {
    let result = [...bins];
    if (sortType === "fullness_desc") result.sort((a, b) => b.fullness - a.fullness);
    if (sortType === "fullness_asc")  result.sort((a, b) => a.fullness - b.fullness);
    if (sortType === "id_asc")        result.sort((a, b) => a._id.localeCompare(b._id));
    return result;
  }, [bins, sortType]);

  // Хелперы для стилей
  const getStatusInfo = (val) => {
    if (val >= 80) return { class: "ct-status-critical", label: "⚠ Critical", color: "#EF4444" };
    if (val >= 60) return { class: "ct-status-warning", label: "! Warning", color: "#F59E0B" };
    return { class: "ct-status-active", label: "● Active", color: "#1A6EFF" };
  };



 return (
    <>
      <style>{css}</style>
      <div className="ct-root">
        <div className="ct-page-header">
          <h1>Bins Monitoring</h1>
          <p>Real-time status of all medical waste containers</p>
        </div>

        <div className="ct-toolbar">
          <div className="ct-toolbar-left">
            <select 
              className="ct-sort-select" 
              value={sortType} 
              onChange={(e) => setSortType(e.target.value)}
            >
              <option value="fullness_desc">Sort by Fullness (High)</option>
              <option value="fullness_asc">Sort by Fullness (Low)</option>
              <option value="id_asc">Sort by ID</option>
            </select>
            <span className="ct-count">Total Bins: {bins.length}</span>
          </div>
          <button className="ct-btn ct-btn-primary" onClick={fetchBins}>
            Update Data
          </button>
        </div>

        {loading ? (
          <p>Loading containers...</p>
        ) : (
          <div className="ct-grid">
            {sortedBins.map((bin) => {
              const status = getStatusInfo(bin.fullness);
              return (
                <div key={bin._id} className="ct-card">
                  <div className="ct-card-accent" style={{ background: status.color }} />
                  
                  <div className="ct-card-head">
                    <span className="ct-card-id">{bin._id}</span>
                    <span className={`ct-status-badge ${status.class}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="ct-card-sub">Sharp Medical Waste • ID: {bin._id}</div>

                  <div className="ct-fullness-header">
                    <span>Current Fullness</span>
                    <span className="ct-fullness-val">{bin.fullness.toFixed(1)}%</span>
                  </div>
                  <div className="ct-bar-track">
                    <div
                      className="ct-bar-fill"
                      style={{ 
                        width: `${bin.fullness}%`, 
                        background: status.color 
                      }}
                    />
                  </div>

                  <div className="ct-stats-row">
                    <div className="ct-stat">
                      <div className="ct-stat-val">24°C</div>
                      <div className="ct-stat-label">Temperature</div>
                    </div>
                    <div className="ct-stat">
                      <div className="ct-stat-val">{(bin.fullness * 0.4).toFixed(1)} kg</div>
                      <div className="ct-stat-label">Est. Weight</div>
                    </div>
                  </div>

                  <div className="ct-card-footer">
                    <span className="ct-type-badge">Type A</span>
                    <span className="ct-date">
                      Last: {new Date(bin.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default Containers;