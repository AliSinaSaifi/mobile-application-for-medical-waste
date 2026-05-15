import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { getBins } from "../services/api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const redBinIcon = new L.Icon({
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const css = `
  .mp-root { min-height: 100vh; background: #f0f4f8; font-family: 'Geist', 'DM Sans', sans-serif; color: #1a2035; padding: 32px; }
  .mp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .mp-header h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
  .mp-header p { color: #5e6a85; font-size: 0.9rem; }
  .mp-header-btns { display: flex; gap: 10px; }
  .mp-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #e4e9f0; background: #fff; font-size: 0.85rem; font-weight: 500; color: #1a2035; cursor: pointer; transition: all .2s; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
  .mp-btn:hover { background: #f0f4f8; }
  .mp-btn-green { background: #00D68F; color: #0B1A14; border-color: #00D68F; }
  .mp-btn-green:hover { background: #00A870; }
  .mp-layout { display: grid; grid-template-columns: 1fr 340px; gap: 16px; }
  .mp-map-card { background: #fff; border-radius: 16px; border: 1px solid #e4e9f0; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.05); }
  .mp-map-label { padding: 14px 18px; font-weight: 700; font-size: 0.9rem; border-bottom: 1px solid #f0f4f8; display: flex; align-items: center; gap: 8px; }
  .mp-sidebar { background: #fff; border-radius: 16px; border: 1px solid #e4e9f0; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.05); display: flex; flex-direction: column; height: 632px; }
  .mp-sidebar-head { padding: 14px 16px 0; border-bottom: 1px solid #f0f4f8; }
  .mp-sidebar-title { font-weight: 800; font-size: 1rem; margin-bottom: 10px; }
  .mp-tabs { display: flex; gap: 0; }
  .mp-tab { padding: 8px 14px; border: none; background: transparent; font-family: inherit; font-size: 0.82rem; font-weight: 600; color: #5e6a85; cursor: pointer; border-bottom: 2px solid transparent; transition: all .2s; }
  .mp-tab.active { color: #1A6EFF; border-bottom-color: #1A6EFF; }
  .mp-sort { padding: 8px 16px; border-bottom: 1px solid #f0f4f8; display: flex; gap: 6px; flex-wrap: wrap; }
  .mp-sort-btn { padding: 4px 10px; border-radius: 999px; border: 1px solid #e4e9f0; background: #f8fafc; font-family: inherit; font-size: 0.72rem; font-weight: 500; color: #5e6a85; cursor: pointer; transition: all .2s; }
  .mp-sort-btn.active { background: #1A6EFF; color: #fff; border-color: #1A6EFF; }
  .mp-list { overflow-y: auto; flex: 1; padding: 10px 10px; display: flex; flex-direction: column; gap: 8px; }
  .mp-bin-item { border: 1px solid #e4e9f0; border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: all .2s; position: relative; overflow: hidden; }
  .mp-bin-item:hover { border-color: #1A6EFF; background: #f8fbff; }
  .mp-bin-item.selected { border-color: #1A6EFF; background: #eff5ff; }
  .mp-bin-item-accent { position: absolute; top: 0; left: 0; bottom: 0; width: 3px; border-radius: 3px 0 0 3px; }
  .mp-bin-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; padding-left: 8px; }
  .mp-bin-id { font-weight: 700; font-size: 0.9rem; }
  .mp-bin-status { font-size: 0.7rem; font-weight: 600; padding: 2px 7px; border-radius: 999px; }
  .mp-status-active { background: #e6faf3; color: #00A870; }
  .mp-bin-sub { font-size: 0.72rem; color: #5e6a85; margin-bottom: 8px; padding-left: 8px; }
  .mp-bin-bar-row { display: flex; align-items: center; gap: 8px; padding-left: 8px; margin-bottom: 4px; }
  .mp-bin-bar-track { flex: 1; height: 5px; background: #e8edf5; border-radius: 99px; overflow: hidden; }
  .mp-bin-bar-fill { height: 100%; border-radius: 99px; transition: width .5s; }
  .mp-bin-pct { font-size: 0.78rem; font-weight: 700; min-width: 32px; text-align: right; }
  .mp-bin-coords { font-size: 0.68rem; color: #a0aec0; padding-left: 8px; }
  .mp-stats-content { padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; }
  .mp-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 10px; }
  .mp-stat-label { font-size: 0.82rem; color: #5e6a85; }
  .mp-stat-val { font-weight: 700; font-size: 0.9rem; color: #1a2035; }
  .mp-popup h3 { font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; }
  .mp-popup p { font-size: 0.78rem; color: #5e6a85; margin: 2px 0; }
  .mp-popup-bar { height: 5px; background: #e8edf5; border-radius: 99px; margin: 6px 0; overflow: hidden; }
  @media (max-width: 900px) { .mp-layout { grid-template-columns: 1fr; } .mp-sidebar { height: auto; } }
`;

function barColor(fullness) {
  const pct = Number(fullness) || 0;
  return pct >= 80 ? "#EF4444" : pct >= 60 ? "#F59E0B" : "#00D68F";
}

function normalizeBin(bin) {
  const lat = Number(bin.lat);
  const lon = Number(bin.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    id: bin.id,
    qrCode: bin.qrCode,
    locationName: bin.locationName,
    lat,
    lon,
    wasteType: bin.wasteType,
    latestFullness: Number.isFinite(Number(bin.latestFullness)) ? Number(bin.latestFullness) : 0,
    lastUpdated: bin.lastUpdated,
    status: bin.status || "unknown",
  };
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], 15, { duration: 1 });
  }, [map, target]);
  return null;
}

function MapPage() {
  const [tab, setTab] = useState("list");
  const [sort, setSort] = useState("fullness_desc");
  const [selected, setSelected] = useState(null);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBins = async () => {
    setError("");
    try {
      const { data } = await getBins();
      const nextBins = (Array.isArray(data) ? data : []).map(normalizeBin).filter(Boolean);
      setBins(nextBins);
      setSelected((current) => current && nextBins.find((bin) => bin.qrCode === current.qrCode) ? current : null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to load map bins");
      setBins([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBins();
  }, []);

  const sorted = useMemo(() => {
    return [...bins].sort((a, b) => {
      if (sort === "fullness_desc") return b.latestFullness - a.latestFullness;
      if (sort === "fullness_asc") return a.latestFullness - b.latestFullness;
      if (sort === "recent") return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
      return 0;
    });
  }, [bins, sort]);

  const avg = bins.length ? Math.round(bins.reduce((s, b) => s + b.latestFullness, 0) / bins.length) : 0;
  const maxBin = bins.reduce((max, bin) => (bin.latestFullness > max.latestFullness ? bin : max), bins[0] || null);
  const mapCenter = selected || bins[0];

  return (
    <>
      <style>{css}</style>
      <div className="mp-root">
        <div className="mp-header">
          <div>
            <h1>Container Map</h1>
            <p>Interactive map showing all container locations</p>
          </div>
          <div className="mp-header-btns">
            <button className="mp-btn">Filters ↓</button>
            <button className="mp-btn mp-btn-green" onClick={loadBins}> Refresh</button>
          </div>
        </div>

        <div className="mp-layout">
          <div className="mp-map-card">
            <div className="mp-map-label"> Container Map</div>
            {!mapCenter ? (
              <div style={{ height: "586px", display: "flex", alignItems: "center", justifyContent: "center", color: "#a0aec0", textAlign: "center", padding: 20 }}>
                {loading ? "Loading containers..." : error || "No geocoded containers available."}
              </div>
            ) : (
              <MapContainer center={[mapCenter.lat, mapCenter.lon]} zoom={12} style={{ height: "586px", width: "100%" }}>
                <TileLayer attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {selected && <FlyTo target={selected} />}
                {bins.map((bin) => (
                  <Marker key={bin.qrCode} position={[bin.lat, bin.lon]} icon={redBinIcon} eventHandlers={{ click: () => setSelected(bin) }}>
                    <Popup>
                      <div className="mp-popup">
                        <h3>{bin.qrCode}</h3>
                        <p>Status: <strong style={{ color: "#00A870" }}>{bin.status}</strong></p>
                        <p>Location: {bin.locationName || "—"}</p>
                        <div className="mp-popup-bar">
                          <div style={{ width: `${bin.latestFullness}%`, height: "100%", background: barColor(bin.latestFullness), borderRadius: 99 }} />
                        </div>
                        <p>Fullness: <strong>{bin.latestFullness}%</strong></p>
                        <p>Coords: {bin.lat}, {bin.lon}</p>
                        <p>Updated: {bin.lastUpdated ? new Date(bin.lastUpdated).toLocaleString() : "—"}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>

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
                  <button className={`mp-sort-btn ${sort === "fullness_asc" ? "active" : ""}`} onClick={() => setSort("fullness_asc")}>Fullness (↑)</button>
                  <button className={`mp-sort-btn ${sort === "recent" ? "active" : ""}`} onClick={() => setSort("recent")}>Recently updated</button>
                </div>
                <div className="mp-list">
                  {sorted.map((bin) => (
                    <div key={bin.qrCode} className={`mp-bin-item ${selected?.qrCode === bin.qrCode ? "selected" : ""}`} onClick={() => setSelected(bin)}>
                      <div className="mp-bin-item-accent" style={{ background: barColor(bin.latestFullness) }} />
                      <div className="mp-bin-head">
                        <span className="mp-bin-id">{bin.qrCode}</span>
                        <span className="mp-bin-status mp-status-active">● {bin.status}</span>
                      </div>
                      <div className="mp-bin-sub">{bin.wasteType || "—"} · {bin.locationName || "—"}</div>
                      <div className="mp-bin-bar-row">
                        <div className="mp-bin-bar-track">
                          <div className="mp-bin-bar-fill" style={{ width: `${bin.latestFullness}%`, background: barColor(bin.latestFullness) }} />
                        </div>
                        <span className="mp-bin-pct" style={{ color: barColor(bin.latestFullness) }}>{bin.latestFullness}%</span>
                      </div>
                      <div className="mp-bin-coords">{bin.lat}, {bin.lon}</div>
                    </div>
                  ))}
                  {!loading && sorted.length === 0 && (
                    <div style={{ padding: 20, color: "#a0aec0", textAlign: "center" }}>{error || "No geocoded containers available."}</div>
                  )}
                </div>
              </>
            )}

            {tab === "stats" && (
              <div className="mp-stats-content">
                {[
                  { label: "Total containers", val: bins.length },
                  { label: "Active", val: bins.filter((b) => b.status === "active").length },
                  { label: "Average fullness", val: `${avg}%` },
                  { label: "Most full", val: maxBin ? `${maxBin.qrCode} (${maxBin.latestFullness}%)` : "—" },
                  { label: "Need attention (≥80%)", val: bins.filter((b) => b.latestFullness >= 80).length },
                  { label: "Warning (60–79%)", val: bins.filter((b) => b.latestFullness >= 60 && b.latestFullness < 80).length },
                  { label: "Normal (<60%)", val: bins.filter((b) => b.latestFullness < 60).length },
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
