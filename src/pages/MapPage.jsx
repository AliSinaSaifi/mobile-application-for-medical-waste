import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// ── Leaflet icon fix for Vite ─────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Colored circle markers ────────────────────────────────────
function makeIcon(fullness) {
  const color =
    fullness >= 80 ? "#EF4444" :
    fullness >= 60 ? "#F59E0B" :
                     "#00D68F";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <ellipse cx="16" cy="40" rx="6" ry="2" fill="rgba(0,0,0,.2)"/>
      <path d="M16 0C9.4 0 4 5.4 4 12c0 9 12 28 12 28S28 21 28 12C28 5.4 22.6 0 16 0z"
            fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="12" r="6" fill="#fff"/>
      <text x="16" y="16" text-anchor="middle" font-size="7" font-weight="700"
            font-family="sans-serif" fill="${color}">${fullness}%</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -44],
  });
}

// ── Data ──────────────────────────────────────────────────────
// ── Реальные координаты мед. учреждений Астаны ────────────────
const bins = [
  { 
    id: "MED-AST-001", status: "active", fullness: 85, 
    lat: 51.1075, lng: 71.4082, 
    location: "Центр материнства и детства", updated: "Feb 24, 2026" 
  },
  { 
    id: "MED-AST-002", status: "active", fullness: 62, 
    lat: 51.1082, lng: 71.4115, 
    location: "Кардиохирургический центр", updated: "Feb 24, 2026" 
  },
  { 
    id: "MED-AST-003", status: "active", fullness: 45, 
    lat: 51.1110, lng: 71.4055, 
    location: "Диагностический центр", updated: "Feb 23, 2026" 
  },
  { 
    id: "MED-AST-004", status: "active", fullness: 20, 
    lat: 51.1578, lng: 71.4645, 
    location: "Городская больница №1", updated: "Feb 24, 2026" 
  },
  { 
    id: "MED-AST-005", status: "active", fullness: 92, 
    lat: 51.1642, lng: 71.4285, 
    location: "Медицинский университет Астана", updated: "Feb 24, 2026" 
  },
  { 
    id: "MED-AST-006", status: "active", fullness: 55, 
    lat: 51.1042, lng: 71.4150, 
    location: "Онкологический центр", updated: "Feb 24, 2026" 
  }
];

// ── Styles ────────────────────────────────────────────────────
const css = `
  

  .mp-root {
    min-height: 100vh;
    background: #f0f4f8;
    font-family: 'Geist', 'DM Sans', sans-serif;
    color: #1a2035;
    padding: 32px;
  }

  /* HEADER */
  .mp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .mp-header h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
  .mp-header p  { color: #5e6a85; font-size: 0.9rem; }
  .mp-header-btns { display: flex; gap: 10px; }

  .mp-btn {
    padding: 8px 16px; border-radius: 8px; border: 1px solid #e4e9f0;
    background: #fff; font-size: 0.85rem; font-weight: 500; color: #1a2035;
    cursor: pointer; transition: all .2s; font-family: inherit;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .mp-btn:hover { background: #f0f4f8; }
  .mp-btn-green { background: #00D68F; color: #0B1A14; border-color: #00D68F; }
  .mp-btn-green:hover { background: #00A870; }

  /* LAYOUT */
  .mp-layout { display: grid; grid-template-columns: 1fr 340px; gap: 16px; }

  /* MAP */
  .mp-map-card {
    background: #fff; border-radius: 16px;
    border: 1px solid #e4e9f0; overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,.05);
  }
  .mp-map-label {
    padding: 14px 18px; font-weight: 700; font-size: 0.9rem;
    border-bottom: 1px solid #f0f4f8; display: flex; align-items: center; gap: 8px;
  }

  /* SIDEBAR */
  .mp-sidebar {
    background: #fff; border-radius: 16px;
    border: 1px solid #e4e9f0; overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,.05);
    display: flex; flex-direction: column; height: 632px;
  }
  .mp-sidebar-head {
    padding: 14px 16px 0; border-bottom: 1px solid #f0f4f8;
  }
  .mp-sidebar-title { font-weight: 800; font-size: 1rem; margin-bottom: 10px; }

  /* TABS */
  .mp-tabs { display: flex; gap: 0; }
  .mp-tab {
    padding: 8px 14px; border: none; background: transparent;
    font-family: inherit; font-size: 0.82rem; font-weight: 600;
    color: #5e6a85; cursor: pointer; border-bottom: 2px solid transparent;
    transition: all .2s;
  }
  .mp-tab.active { color: #1A6EFF; border-bottom-color: #1A6EFF; }

  /* SORT */
  .mp-sort {
    padding: 8px 16px; border-bottom: 1px solid #f0f4f8;
    display: flex; gap: 6px; flex-wrap: wrap;
  }
  .mp-sort-btn {
    padding: 4px 10px; border-radius: 999px; border: 1px solid #e4e9f0;
    background: #f8fafc; font-family: inherit; font-size: 0.72rem;
    font-weight: 500; color: #5e6a85; cursor: pointer; transition: all .2s;
  }
  .mp-sort-btn.active { background: #1A6EFF; color: #fff; border-color: #1A6EFF; }

  /* BIN LIST */
  .mp-list { overflow-y: auto; flex: 1; padding: 10px 10px; display: flex; flex-direction: column; gap: 8px; }

  .mp-bin-item {
    border: 1px solid #e4e9f0; border-radius: 12px; padding: 12px 14px;
    cursor: pointer; transition: all .2s; position: relative; overflow: hidden;
  }
  .mp-bin-item:hover { border-color: #1A6EFF; background: #f8fbff; }
  .mp-bin-item.selected { border-color: #1A6EFF; background: #eff5ff; }
  .mp-bin-item-accent {
    position: absolute; top: 0; left: 0; bottom: 0; width: 3px; border-radius: 3px 0 0 3px;
  }
  .mp-bin-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; padding-left: 8px; }
  .mp-bin-id   { font-weight: 700; font-size: 0.9rem; }
  .mp-bin-status { font-size: 0.7rem; font-weight: 600; padding: 2px 7px; border-radius: 999px; }
  .mp-status-active { background: #e6faf3; color: #00A870; }
  .mp-bin-sub  { font-size: 0.72rem; color: #5e6a85; margin-bottom: 8px; padding-left: 8px; }
  .mp-bin-bar-row { display: flex; align-items: center; gap: 8px; padding-left: 8px; margin-bottom: 4px; }
  .mp-bin-bar-track { flex: 1; height: 5px; background: #e8edf5; border-radius: 99px; overflow: hidden; }
  .mp-bin-bar-fill  { height: 100%; border-radius: 99px; transition: width .5s; }
  .mp-bin-pct  { font-size: 0.78rem; font-weight: 700; min-width: 32px; text-align: right; }
  .mp-bin-coords { font-size: 0.68rem; color: #a0aec0; padding-left: 8px; }

  /* STATS TAB */
  .mp-stats-content { padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; }
  .mp-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 10px; }
  .mp-stat-label { font-size: 0.82rem; color: #5e6a85; }
  .mp-stat-val   { font-weight: 700; font-size: 0.9rem; color: #1a2035; }

  /* POPUP */
  .mp-popup h3 { font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; }
  .mp-popup p  { font-size: 0.78rem; color: #5e6a85; margin: 2px 0; }
  .mp-popup-bar { height: 5px; background: #e8edf5; border-radius: 99px; margin: 6px 0; overflow: hidden; }

  @media (max-width: 900px) {
    .mp-layout { grid-template-columns: 1fr; }
    .mp-sidebar { height: auto; }
  }
`;

function barColor(f) {
  return f >= 80 ? "#EF4444" : f >= 60 ? "#F59E0B" : "#00D68F";
}

// ── Fly-to helper ─────────────────────────────────────────────
function FlyTo({ target }) {
  const map = useMap();
  if (target) map.flyTo([target.lat, target.lng], 15, { duration: 1 });
  return null;
}

// ── Main ──────────────────────────────────────────────────────
function MapPage() {
  const [tab, setTab]       = useState("list");
  const [sort, setSort]     = useState("fullness_desc");
  const [selected, setSelected] = useState(null);

  const sorted = [...bins].sort((a, b) => {
    if (sort === "fullness_desc") return b.fullness - a.fullness;
    if (sort === "fullness_asc")  return a.fullness - b.fullness;
    return 0;
  });

  const avg    = Math.round(bins.reduce((s, b) => s + b.fullness, 0) / bins.length);
  const maxBin = bins.reduce((m, b) => b.fullness > m.fullness ? b : m, bins[0]);

  return (
    <>
      <style>{css}</style>
      <div className="mp-root">

        {/* HEADER */}
        <div className="mp-header">
          <div>
            <h1>Container Map</h1>
            <p>Interactive map showing all container locations</p>
          </div>
          <div className="mp-header-btns">
            <button className="mp-btn">Filters ↓</button>
            <button className="mp-btn mp-btn-green"> Refresh</button>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="mp-layout">

          {/* MAP */}
          <div className="mp-map-card">
            <div className="mp-map-label"> Container Map</div>
            <MapContainer
               center={[51.1283, 71.4305]} // Центр Астаны
               zoom={12}
               style={{ height: "586px", width: "100%" }}
             >
              <TileLayer
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {selected && <FlyTo target={selected} />}
              {bins.map((bin) => (
                <Marker
                  key={bin.id}
                  position={[bin.lat, bin.lng]}
                  icon={makeIcon(bin.fullness)}
                  eventHandlers={{ click: () => setSelected(bin) }}
                >
                  <Popup>
                    <div className="mp-popup">
                      <h3>{bin.id}</h3>
                      <p>Status: <strong style={{ color: "#00A870" }}>{bin.status}</strong></p>
                      <p>Location: {bin.location}</p>
                      <div className="mp-popup-bar">
                        <div style={{ width: `${bin.fullness}%`, height: "100%", background: barColor(bin.fullness), borderRadius: 99 }} />
                      </div>
                      <p>Fullness: <strong>{bin.fullness}%</strong></p>
                      <p>Coords: {bin.lat}, {bin.lng}</p>
                      <p>Updated: {bin.updated}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* SIDEBAR */}
          <div className="mp-sidebar">
            <div className="mp-sidebar-head">
              <div className="mp-sidebar-title">Containers</div>
              <div className="mp-tabs">
                <button className={`mp-tab ${tab === "list" ? "active" : ""}`} onClick={() => setTab("list")}>List</button>
                <button className={`mp-tab ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>Statistics</button>
              </div>
            </div>

            {tab === "list" && (
              <>
                <div className="mp-sort">
                  <button className={`mp-sort-btn ${sort === "fullness_desc" ? "active" : ""}`} onClick={() => setSort("fullness_desc")}>Fullness (↓)</button>
                  <button className={`mp-sort-btn ${sort === "fullness_asc"  ? "active" : ""}`} onClick={() => setSort("fullness_asc")}>Fullness (↑)</button>
                  <button className={`mp-sort-btn ${sort === "recent" ? "active" : ""}`}        onClick={() => setSort("recent")}>Recently updated</button>
                </div>
                <div className="mp-list">
                  {sorted.map((bin) => (
                    <div
                      key={bin.id}
                      className={`mp-bin-item ${selected?.id === bin.id ? "selected" : ""}`}
                      onClick={() => setSelected(bin)}
                    >
                      <div className="mp-bin-item-accent" style={{ background: barColor(bin.fullness) }} />
                      <div className="mp-bin-head">
                        <span className="mp-bin-id">{bin.id}</span>
                        <span className="mp-bin-status mp-status-active">● {bin.status}</span>
                      </div>
                      <div className="mp-bin-sub">Auto Registered · {bin.location}</div>
                      <div className="mp-bin-bar-row">
                        <div className="mp-bin-bar-track">
                          <div className="mp-bin-bar-fill" style={{ width: `${bin.fullness}%`, background: barColor(bin.fullness) }} />
                        </div>
                        <span className="mp-bin-pct" style={{ color: barColor(bin.fullness) }}>{bin.fullness}%</span>
                      </div>
                      <div className="mp-bin-coords">{bin.lat}, {bin.lng}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === "stats" && (
              <div className="mp-stats-content">
                {[
                  { label: "Total containers",     val: bins.length },
                  { label: "Active",               val: bins.filter(b => b.status === "active").length },
                  { label: "Average fullness",     val: `${avg}%` },
                  { label: "Most full",            val: `${maxBin.id} (${maxBin.fullness}%)` },
                  { label: "Need attention (≥80%)", val: bins.filter(b => b.fullness >= 80).length },
                  { label: "Warning (60–79%)",     val: bins.filter(b => b.fullness >= 60 && b.fullness < 80).length },
                  { label: "Normal (<60%)",         val: bins.filter(b => b.fullness < 60).length },
                ].map((r) => (
                  <div className="mp-stat-row" key={r.label}>
                    <span className="mp-stat-label">{r.label}</span>
                    <span className="mp-stat-val">{r.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

export default MapPage;