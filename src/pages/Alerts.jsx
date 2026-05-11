import React, { useEffect, useState, useMemo } from "react";
import { useSocket } from "../hooks/useSocket";
import api from "../services/api";


const css = `
  

  .al-root {
    min-height: 100vh;
    background: #f0f4f8;
    font-family: 'Geist', 'DM Sans', sans-serif;
    color: #1a2035;
    padding: 32px;
  }
  .al-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 14px; }
  .al-header h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
  .al-header p  { color: #5e6a85; font-size: 0.9rem; }
  .al-header-btns { display: flex; gap: 10px; align-items: center; }

  .al-btn {
    padding: 8px 16px; border-radius: 8px; border: 1px solid #e4e9f0;
    background: #fff; font-family: inherit; font-size: 0.85rem; font-weight: 500;
    color: #1a2035; cursor: pointer; transition: all .2s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .al-btn:hover { background: #f0f4f8; }
  .al-btn-primary { background: #1A6EFF; color: #fff; border-color: #1A6EFF; }
  .al-btn-primary:hover { background: #0F4ECC; }
  .al-btn-danger  { background: #fff0f1; color: #E53E3E; border-color: #fed7d7; }
  .al-btn-danger:hover { background: #fed7d7; }

  .al-kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 20px; }
  .al-kpi-card {
    background: #fff; border-radius: 14px; border: 1px solid #e4e9f0;
    padding: 18px 20px; position: relative; overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,.04); transition: transform .2s;
  }
  .al-kpi-card:hover { transform: translateY(-2px); }
  .al-kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .al-kpi-card.red::before    { background: #EF4444; }
  .al-kpi-card.orange::before { background: #F59E0B; }
  .al-kpi-card.blue::before   { background: #1A6EFF; }
  .al-kpi-card.green::before  { background: #00D68F; }
  .al-kpi-icon  { font-size: 1.4rem; margin-bottom: 8px; }
  .al-kpi-label { font-size: 0.72rem; font-weight: 600; color: #5e6a85; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
  .al-kpi-val   { font-size: 1.8rem; font-weight: 800; color: #1a2035; line-height: 1; }

  .al-filters {
    background: #fff; border-radius: 14px; border: 1px solid #e4e9f0;
    padding: 14px 18px; margin-bottom: 16px;
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    box-shadow: 0 2px 8px rgba(0,0,0,.04);
  }
  .al-filter-label { font-size: 0.78rem; font-weight: 600; color: #5e6a85; white-space: nowrap; }
  .al-filter-btn {
    padding: 5px 12px; border-radius: 999px; border: 1px solid #e4e9f0;
    background: #f8fafc; font-family: inherit; font-size: 0.78rem; font-weight: 500;
    color: #5e6a85; cursor: pointer; transition: all .2s; white-space: nowrap;
  }
  .al-filter-btn:hover { border-color: #1A6EFF; color: #1A6EFF; }
  .al-filter-btn.active         { background: #1A6EFF; color: #fff; border-color: #1A6EFF; }
  .al-filter-btn.active-red     { background: #EF4444; color: #fff; border-color: #EF4444; }
  .al-filter-btn.active-orange  { background: #F59E0B; color: #fff; border-color: #F59E0B; }
  .al-filter-sep { width: 1px; height: 20px; background: #e4e9f0; flex-shrink: 0; }

  .al-card { background: #fff; border-radius: 14px; border: 1px solid #e4e9f0; box-shadow: 0 2px 8px rgba(0,0,0,.04); overflow: hidden; }
  .al-card-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f4f8; }
  .al-card-title { font-size: 0.95rem; font-weight: 700; }
  .al-card-count { font-size: 0.78rem; color: #5e6a85; }

  .al-item {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 14px 20px; border-bottom: 1px solid #f8f9fb;
    transition: background .15s; position: relative;
    animation: alSlideIn .3s ease both;
  }
  @keyframes alSlideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .al-item:last-child { border-bottom: none; }
  .al-item:hover { background: #fafbfc; }
  .al-item.resolved { opacity: .5; }
  .al-item-left-bar { position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0; }
  .al-item-icon { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
  .al-icon-red    { background: #fff0f1; }
  .al-icon-orange { background: #fff8ec; }
  .al-icon-blue   { background: #eff5ff; }
  .al-icon-green  { background: #e6faf3; }
  .al-item-body { flex: 1; min-width: 0; }
  .al-item-top  { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; flex-wrap: wrap; }
  .al-item-title { font-size: 0.88rem; font-weight: 700; color: #1a2035; }
  .al-severity { font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: .04em; }
  .al-sev-critical { background: #fff0f1; color: #E53E3E; }
  .al-sev-warning  { background: #fff8ec; color: #D97706; }
  .al-sev-info     { background: #eff5ff; color: #1A6EFF; }
  .al-sev-resolved { background: #e6faf3; color: #00A870; }
  .al-item-desc { font-size: 0.8rem; color: #5e6a85; margin-bottom: 6px; line-height: 1.5; }
  .al-item-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .al-meta-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #5e6a85; background: #f0f4f8; padding: 2px 8px; border-radius: 6px; }
  .al-item-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: flex-start; margin-top: 2px; }
  .al-action-btn { padding: 5px 10px; border-radius: 7px; border: 1px solid #e4e9f0; background: transparent; font-family: inherit; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all .18s; white-space: nowrap; }
  .al-action-btn:hover { background: #f0f4f8; }
  .al-action-btn.resolve { border-color: #00D68F; color: #00A870; }
  .al-action-btn.resolve:hover { background: #e6faf3; }
  .al-action-btn.dismiss { color: #5e6a85; }

  .al-loading { text-align: center; padding: 60px 20px; color: #5e6a85; font-size: 0.9rem; }
  .al-error   { text-align: center; padding: 40px 20px; color: #E53E3E; font-size: 0.85rem;
    background: #fff0f1; border-radius: 10px; margin: 16px; }

  .al-empty { text-align: center; padding: 60px 20px; color: #a0aec0; }
  .al-empty-icon { font-size: 3rem; margin-bottom: 12px; }
  .al-empty h3 { font-size: 1rem; font-weight: 700; color: #5e6a85; margin-bottom: 6px; }
  .al-empty p  { font-size: 0.85rem; line-height: 1.6; }

  @media (max-width: 860px) {
    .al-root { padding: 16px; }
    .al-kpi-grid { grid-template-columns: repeat(2,1fr); }
  }
`;

const SEV = {
  critical: { label: "Critical", barColor: "#EF4444", iconBg: "al-icon-red",    icon: "🚨" },
  warning:  { label: "Warning",  barColor: "#F59E0B", iconBg: "al-icon-orange", icon: "⚠️" },
  info:     { label: "Info",     barColor: "#1A6EFF", iconBg: "al-icon-blue",   icon: "ℹ️" },
  resolved: { label: "Resolved", barColor: "#00D68F", iconBg: "al-icon-green",  icon: "✅" },
};

// Normalize raw alert from backend → UI shape
function normalize(a) {
  // Support both {severity, message} and {containerId, message} shapes
  const severity = a.severity || (a.fullness >= 80 ? "critical" : a.fullness >= 60 ? "warning" : "info");
  return {
    id:       a._id || a.id,
    severity: a.resolved ? "resolved" : severity,
    type:     a.type || "fullness",
    title:    a.title || `Container ${a.containerId || a.binId} Alert`,
    desc:     a.message || a.desc || "No description",
    bin:      a.containerId || a.binId || "—",
    location: a.location || "—",
    time:     a.timestamp ? new Date(a.timestamp).toLocaleString() : "—",
    resolved: !!a.resolved,
  };
}

export default function Alerts() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [sevFilter, setSevFilter]   = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  // ── Fetch from backend ──────────────────────────────────────
  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/alerts');
      setAlerts(res.data.map(normalize));
    } catch (e) {
      console.error("Alerts fetch error", e);
      setError("Could not load alerts. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();                                    // ← начальный fetch
    const timer = setInterval(fetchAlerts, 30000);
    return () => clearInterval(timer);
  }, []);

  useSocket({
  'alert:new': (alert) => {
    setAlerts(prev => [{ ...alert, id: alert._id }, ...prev]);
  },
});

  // ── Actions ─────────────────────────────────────────────────
  const resolve = async (id) => {
    try {
      await api.patch(`/api/alerts/resolve`);
      setAlerts(a => a.map(x => x.id === id ? { ...x, resolved: true, severity: "resolved" } : x));
    } catch {
      // Optimistic update even if backend fails
      setAlerts(a => a.map(x => x.id === id ? { ...x, resolved: true, severity: "resolved" } : x));
    }
  };

  const dismiss = async (id) => {
    try {
      await api.delete(`/api/alerts/${id}`);
    } catch { /* silent */ }
    setAlerts(a => a.filter(x => x.id !== id));
  };

  // ── Filter ──────────────────────────────────────────────────
  const filtered = useMemo(() => alerts.filter(a => {
    if (!showResolved && a.resolved) return false;
    if (sevFilter !== "all" && a.severity !== sevFilter) return false;
    return true;
  }), [alerts, sevFilter, showResolved]);

  const counts = {
    critical: alerts.filter(a => a.severity === "critical").length,
    warning:  alerts.filter(a => a.severity === "warning").length,
    info:     alerts.filter(a => a.severity === "info").length,
    resolved: alerts.filter(a => a.resolved).length,
  };

  return (
    <>
      <style>{css}</style>
      <div className="al-root">

        {/* HEADER */}
        <div className="al-header">
          <div>
            <h1>Alerts</h1>
            <p>Monitor and manage system notifications and warnings</p>
          </div>
          <div className="al-header-btns">
            <button className="al-btn" onClick={() => setShowResolved(s => !s)}>
              {showResolved ? "🙈 Hide resolved" : "👁 Show resolved"}
            </button>
            <button className="al-btn al-btn-primary" onClick={fetchAlerts}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="al-kpi-grid">
          <div className="al-kpi-card red">
            <div className="al-kpi-icon">🚨</div>
            <div className="al-kpi-label">Critical</div>
            <div className="al-kpi-val">{counts.critical}</div>
          </div>
          <div className="al-kpi-card orange">
            <div className="al-kpi-icon">⚠️</div>
            <div className="al-kpi-label">Warnings</div>
            <div className="al-kpi-val">{counts.warning}</div>
          </div>
          <div className="al-kpi-card blue">
            <div className="al-kpi-icon">ℹ️</div>
            <div className="al-kpi-label">Info</div>
            <div className="al-kpi-val">{counts.info}</div>
          </div>
          <div className="al-kpi-card green">
            <div className="al-kpi-icon">✅</div>
            <div className="al-kpi-label">Resolved</div>
            <div className="al-kpi-val">{counts.resolved}</div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="al-filters">
          <span className="al-filter-label">Severity:</span>
          {[
            { key: "all",      label: "All" },
            { key: "critical", label: "Critical", activeClass: "active-red" },
            { key: "warning",  label: "Warning",  activeClass: "active-orange" },
            { key: "info",     label: "Info",     activeClass: "active" },
          ].map(f => (
            <button
              key={f.key}
              className={`al-filter-btn ${sevFilter === f.key ? (f.activeClass || "active") : ""}`}
              onClick={() => setSevFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* LIST */}
        <div className="al-card">
          <div className="al-card-head">
            <span className="al-card-title">Active Alerts</span>
            <span className="al-card-count">{filtered.length} alert{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {loading && (
            <div className="al-loading">⏳ Loading alerts...</div>
          )}

          {!loading && error && (
            <div className="al-error">
              ❌ {error}
              <br /><br />
              <button className="al-btn" onClick={fetchAlerts}>Try again</button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="al-empty">
              <div className="al-empty-icon">🎉</div>
              <h3>No alerts</h3>
              <p>All systems are operating normally.<br />New alerts will appear here automatically.</p>
            </div>
          )}

          {!loading && !error && filtered.map((alert, i) => {
            const cfg = SEV[alert.severity] || SEV.info;
            return (
              <div
                key={alert.id}
                className={`al-item ${alert.resolved ? "resolved" : ""}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="al-item-left-bar" style={{ background: cfg.barColor }} />
                <div className={`al-item-icon ${cfg.iconBg}`}>{cfg.icon}</div>
                <div className="al-item-body">
                  <div className="al-item-top">
                    <span className="al-item-title">{alert.title}</span>
                    <span className={`al-severity al-sev-${alert.severity}`}>{cfg.label}</span>
                  </div>
                  <div className="al-item-desc">{alert.desc}</div>
                  <div className="al-item-meta">
                    <span className="al-meta-chip">🗑 {alert.bin}</span>
                    <span className="al-meta-chip">📍 {alert.location}</span>
                    <span className="al-meta-chip">🕐 {alert.time}</span>
                  </div>
                </div>
                {!alert.resolved && (
                  <div className="al-item-actions">
                    <button className="al-action-btn resolve" onClick={() => resolve(alert.id)}>✓ Resolve</button>
                    <button className="al-action-btn dismiss" onClick={() => dismiss(alert.id)}>✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}