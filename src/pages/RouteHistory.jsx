import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import { getRouteHistory, getRouteHistoryDetail } from "../services/api";
import { getSharedSocket, useSocket } from "../hooks/useSocket";

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const mockRoutes = []; // no routes yet
const defaultKpis = {
  totalRoutes: 0,
  completed: 0,
  totalDistance: 0,
  containersCollected: 0,
};
const MAX_POLYLINE_POINTS = 1000;
const MAX_MARKERS = 100;

function samplePoints(points, maxPoints) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points || [];
  if (maxPoints <= 2) return [points[0], points[points.length - 1]];

  const sampled = [points[0]];
  const step = (points.length - 2) / (maxPoints - 2);
  for (let i = 1; i < maxPoints - 1; i += 1) {
    sampled.push(points[Math.round(i * step)]);
  }
  sampled.push(points[points.length - 1]);
  return sampled;
}

const css = `
  

  .rh-root {
    min-height: 100vh;
    background: #f0f4f8;
    font-family: 'Geist', 'DM Sans', sans-serif;
    color: #1a2035;
    padding: 32px;
  }

  /* HEADER */
  .rh-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 14px; }
  .rh-header h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
  .rh-header p  { color: #5e6a85; font-size: 0.9rem; }

  .rh-btn {
    padding: 9px 18px; border-radius: 8px; border: 1px solid #e4e9f0;
    background: #fff; font-family: inherit; font-size: 0.85rem; font-weight: 500;
    color: #1a2035; cursor: pointer; transition: all .2s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .rh-btn:hover { background: #f0f4f8; }
  .rh-btn-green { background: #00D68F; color: #0B1A14; border-color: #00D68F; }
  .rh-btn-green:hover { background: #00A870; }

  /* KPI */
  .rh-kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 16px; }
  .rh-kpi-card {
    background: #fff; border-radius: 14px; border: 1px solid #e4e9f0;
    padding: 20px; position: relative; overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,.04); transition: transform .2s;
  }
  .rh-kpi-card:hover { transform: translateY(-2px); }
  .rh-kpi-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #1A6EFF, #00D68F);
  }
  .rh-kpi-label { font-size: 0.75rem; font-weight: 600; color: #5e6a85; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
  .rh-kpi-val   { font-size: 2rem; font-weight: 800; color: #1a2035; line-height: 1; }

  /* FILTERS */
  .rh-filters {
    background: #fff; border-radius: 14px; border: 1px solid #e4e9f0;
    padding: 18px 22px; margin-bottom: 16px;
    display: grid; grid-template-columns: 1fr 1fr auto; gap: 14px; align-items: end;
    box-shadow: 0 2px 8px rgba(0,0,0,.04);
  }
  .rh-field label { font-size: 0.75rem; font-weight: 600; color: #5e6a85; text-transform: uppercase; letter-spacing: .04em; display: block; margin-bottom: 6px; }
  .rh-field select, .rh-field input {
    width: 100%; padding: 9px 12px; border: 1.5px solid #e4e9f0; border-radius: 8px;
    font-family: inherit; font-size: 0.88rem; color: #1a2035; background: #f8fafc;
    outline: none; transition: border-color .2s;
  }
  .rh-field select:focus, .rh-field input:focus { border-color: #1A6EFF; background: #fff; }

  /* MAIN GRID */
  .rh-main { display: grid; grid-template-columns: 300px 1fr; gap: 16px; }

  /* SIDEBAR */
  .rh-sidebar {
    background: #fff; border-radius: 14px; border: 1px solid #e4e9f0;
    box-shadow: 0 2px 8px rgba(0,0,0,.04); overflow: hidden;
    display: flex; flex-direction: column; height: 580px;
  }
  .rh-sidebar-head {
    padding: 16px 18px; border-bottom: 1px solid #f0f4f8;
    font-size: 0.95rem; font-weight: 700;
  }
  .rh-sidebar-list { flex: 1; overflow-y: auto; padding: 10px; }

  .rh-empty {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 100%; gap: 10px; color: #a0aec0; text-align: center;
    padding: 20px;
  }
  .rh-empty-icon { font-size: 2.5rem; }
  .rh-empty h3   { font-size: 0.95rem; font-weight: 700; color: #5e6a85; }
  .rh-empty p    { font-size: 0.82rem; line-height: 1.6; }

  .rh-route-item {
    border: 1px solid #e4e9f0; border-radius: 10px; padding: 12px 14px;
    margin-bottom: 8px; cursor: pointer; transition: all .2s; position: relative; overflow: hidden;
  }
  .rh-route-item:hover   { border-color: #1A6EFF; background: #f8fbff; }
  .rh-route-item.active  { border-color: #1A6EFF; background: #eff5ff; }
  .rh-route-item-accent  { position: absolute; top: 0; left: 0; bottom: 0; width: 3px; background: #1A6EFF; border-radius: 3px 0 0 3px; }
  .rh-route-name         { font-weight: 700; font-size: 0.88rem; margin-bottom: 3px; padding-left: 6px; }
  .rh-route-meta         { font-size: 0.75rem; color: #5e6a85; padding-left: 6px; }
  .rh-route-status {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 0.7rem; font-weight: 600; padding: 2px 7px; border-radius: 999px; margin-top: 6px; margin-left: 6px;
  }
  .rh-status-done     { background: #e6faf3; color: #00A870; }
  .rh-status-cancelled{ background: #fff0f1; color: #E53E3E; }
  .rh-status-active   { background: #eff5ff; color: #1A6EFF; }

  /* MAP CARD */
  .rh-map-card {
    background: #fff; border-radius: 14px; border: 1px solid #e4e9f0;
    box-shadow: 0 2px 8px rgba(0,0,0,.04); overflow: hidden;
    height: 580px; display: flex; flex-direction: column;
  }
  .rh-map-header {
    padding: 14px 18px; border-bottom: 1px solid #f0f4f8;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 0.9rem; font-weight: 700; flex-shrink: 0;
  }
  .rh-map-body { flex: 1; position: relative; }
  .rh-map-placeholder {
    height: 100%; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 10px;
    color: #a0aec0; text-align: center; padding: 20px;
  }
  .rh-map-placeholder-icon { font-size: 3rem; }
  .rh-map-placeholder h2   { font-size: 1rem; font-weight: 700; color: #5e6a85; }
  .rh-map-placeholder p    { font-size: 0.82rem; line-height: 1.6; }

  @media (max-width: 860px) {
    .rh-main { grid-template-columns: 1fr; }
    .rh-kpi-grid { grid-template-columns: repeat(2,1fr); }
    .rh-filters  { grid-template-columns: 1fr 1fr; }
    .rh-map-card, .rh-sidebar { height: 400px; }
  }
`;

function RouteHistory() {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [period, setPeriod]   = useState("all");
  const [status, setStatus]   = useState("all");
  const [routes, setRoutes]   = useState(mockRoutes);
  const [kpis, setKpis]       = useState(defaultKpis);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const mountedRef = useRef(false);

  const params = useMemo(() => ({ period, status }), [period, status]);

  const loadRoutes = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getRouteHistory(params);
      if (!mountedRef.current) return;
      const nextRoutes = data.routes || [];
      setRoutes(nextRoutes);
      setKpis(data.kpis || defaultKpis);
      setSelectedRoute((current) => {
        if (!current) return nextRoutes[0] || null;
        return nextRoutes.find((route) => route.id === current.id) || nextRoutes[0] || null;
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.response?.data?.error || err.message || "Unable to load route history");
      setRoutes([]);
      setKpis(defaultKpis);
      setSelectedRoute(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const selectRoute = async (route) => {
    setSelectedRoute(route);
    setError("");
    try {
      const { data } = await getRouteHistoryDetail(route.id);
      if (!mountedRef.current) return;
      setSelectedRoute(data);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.response?.data?.error || err.message || "Unable to load route details");
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    loadRoutes();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const selectedCoordinates = selectedRoute?.coordinates || [];
  const polylineCoordinates = useMemo(
    () => samplePoints(selectedCoordinates, MAX_POLYLINE_POINTS),
    [selectedCoordinates]
  );
  const markerCoordinates = useMemo(
    () => samplePoints(selectedCoordinates, MAX_MARKERS),
    [selectedCoordinates]
  );
  const mapCenter = selectedCoordinates[0] || [51.1283, 71.4305];

  useSocket({
    "route:point": (update) => {
      if (!update?.routeId) return;
      setRoutes((prev) => prev.map((route) => (
        route.id === update.routeId
          ? {
              ...route,
              coordinates: update.coordinates || route.coordinates || [],
              distance: update.distance ?? route.distance,
              status: update.status || route.status,
              hasRealGpsPoints: true,
              coordinateSource: "route_points",
            }
          : route
      )));
      setSelectedRoute((current) => (
        current?.id === update.routeId
          ? {
              ...current,
              coordinates: update.coordinates || current.coordinates || [],
              distance: update.distance ?? current.distance,
              status: update.status || current.status,
              hasRealGpsPoints: true,
              coordinateSource: "route_points",
            }
          : current
      ));
    },
    "route:status": (update) => {
      if (!update?.routeId) return;
      setRoutes((prev) => prev.map((route) => (
        route.id === update.routeId
          ? { ...route, status: update.status || route.status, rawStatus: update.rawStatus || route.rawStatus }
          : route
      )));
      setSelectedRoute((current) => (
        current?.id === update.routeId
          ? { ...current, status: update.status || current.status, rawStatus: update.rawStatus || current.rawStatus }
          : current
      ));
    },
  });

  useEffect(() => {
    const socket = getSharedSocket();
    if (!socket || !selectedRoute?.id) return undefined;

    const subscribe = () => socket.emit("route:subscribe", selectedRoute.id);
    subscribe();
    socket.on("connect", subscribe);

    return () => {
      socket.off("connect", subscribe);
      socket.emit("route:unsubscribe", selectedRoute.id);
    };
  }, [selectedRoute?.id]);

  return (
    <>
      <style>{css}</style>
      <div className="rh-root">

        {/* HEADER */}
        <div className="rh-header">
          <div>
            <h1>Route History</h1>
            <p>View and analyse completed collection routes</p>
          </div>
          <button className="rh-btn rh-btn-blue" onClick={loadRoutes} disabled={loading}>
            {loading ? " Loading..." : " Refresh"}
          </button>
        </div>

        {/* KPI */}
        <div className="rh-kpi-grid">
          {[
            { label: "Total Routes",         val: kpis.totalRoutes || 0 },
            { label: "Completed",            val: kpis.completed || 0 },
            { label: "Total Distance",       val: `${kpis.totalDistance || 0} km` },
            { label: "Containers Collected", val: kpis.containersCollected || 0 },
          ].map((k) => (
            <div className="rh-kpi-card" key={k.label}>
              <div className="rh-kpi-label">{k.label}</div>
              <div className="rh-kpi-val">{k.val}</div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="rh-filters">
          <div className="rh-field">
            <label>Period</label>
            <select value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">Last week</option>
              <option value="month">Last month</option>
            </select>
          </div>
          <div className="rh-field">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button className="rh-btn" onClick={loadRoutes} disabled={loading}>Apply Filters</button>
        </div>
        {error && <div style={{ marginBottom: 12, color: "#B91C1C", fontSize: "0.82rem" }}>{error}</div>}

        {/* MAIN */}
        <div className="rh-main">

          {/* SIDEBAR */}
          <div className="rh-sidebar">
            <div className="rh-sidebar-head">Routes ({routes.length})</div>
            <div className="rh-sidebar-list">
              {routes.length === 0 ? (
                <div className="rh-empty">
                  <div className="rh-empty-icon">🛣️</div>
                  <h3>{loading ? "Loading routes" : "No routes found"}</h3>
                  <p>{loading ? "Fetching route history from the system." : "Routes will appear here once collection trips are recorded in the system."}</p>
                </div>
              ) : (
                routes.map((route) => (
                  <div
                    key={route.id}
                    className={`rh-route-item ${selectedRoute?.id === route.id ? "active" : ""}`}
                    onClick={() => selectRoute(route)}
                  >
                    <div className="rh-route-item-accent" />
                    <div className="rh-route-name">{route.name}</div>
                    <div className="rh-route-meta">{route.distance} km · {route.bins} bins</div>
                    <span className={`rh-route-status ${
                      route.status === "completed" ? "rh-status-done" :
                      route.status === "cancelled" ? "rh-status-cancelled" : "rh-status-active"
                    }`}>
                      {route.status === "completed" ? "✓ Completed" :
                       route.status === "cancelled" ? "✕ Cancelled" : "● LIVE"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MAP */}
          <div className="rh-map-card">
            <div className="rh-map-header">
              <span> Route Map</span>
              {selectedRoute && <span style={{ fontSize: "0.8rem", color: "#5e6a85" }}>{selectedRoute.name}</span>}
            </div>
            <div className="rh-map-body">
              {!selectedRoute || selectedCoordinates.length === 0 ? (
                <div className="rh-map-placeholder">
                  <div className="rh-map-placeholder-icon"></div>
                  <h2>{selectedRoute ? "No GPS points available" : "No route selected"}</h2>
                  <p>{selectedRoute ? "This route has no usable coordinates yet." : <>Select a route from the list on the left<br />to view it on the map.</>}</p>
                </div>
              ) : (
                <MapContainer
                  key={selectedRoute.id}
                  center={mapCenter}
                  zoom={12}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Polyline
                    positions={polylineCoordinates}
                    color="#1A6EFF"
                    weight={4}
                    opacity={0.8}
                  />
                  {markerCoordinates.map((point, i) => (
                    <Marker key={i} position={point}>
                      <Popup>Stop {i + 1}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default RouteHistory;
