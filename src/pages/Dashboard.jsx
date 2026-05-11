import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getBins, getPredict, getAlerts, getNotifications, markRead } from "../services/api";
import { useSocket } from "../hooks/useSocket";

// ── CSS (unchanged) ───────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  .db-root { min-height:100vh; background:#f0f4f8; font-family:'DM Sans',sans-serif; color:#1a2035; }
  .db-topbar { background:#fff; border-bottom:1px solid #e4e9f0; padding:0 32px; height:60px;
    display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100;
    box-shadow:0 1px 8px rgba(0,0,0,.05); }
  .db-brand { font-weight:800; font-size:1.25rem; background:linear-gradient(120deg,#1A6EFF,#00D68F);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .db-nav-right { display:flex; align-items:center; gap:12px; }
  .db-user-pill { display:flex; align-items:center; gap:8px; background:#f0f4f8; border-radius:999px;
    padding:5px 12px 5px 6px; font-size:.85rem; font-weight:500; }
  .db-avatar { width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg,#1A6EFF,#00D68F);
    display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:.75rem; }
  .db-online-dot { width:8px; height:8px; border-radius:50%; background:#00D68F;
    box-shadow:0 0 0 2px #fff,0 0 0 4px rgba(0,214,143,.3); animation:pulse 2s infinite; }
  @keyframes pulse {
    0%,100%{box-shadow:0 0 0 2px #fff,0 0 0 4px rgba(0,214,143,.3);}
    50%{box-shadow:0 0 0 2px #fff,0 0 0 6px rgba(0,214,143,.15);}
  }
  .db-btn { padding:7px 16px; border-radius:8px; border:none; cursor:pointer;
    font-family:'DM Sans',sans-serif; font-size:.85rem; font-weight:500; transition:all .2s; }
  .db-btn-ghost { background:#f0f4f8; color:#5e6a85; }
  .db-btn-ghost:hover { background:#e4e9f0; }
  .db-btn-danger { background:#fff0f1; color:#e53e3e; border:1px solid #fed7d7; }
  .db-btn-danger:hover { background:#fed7d7; }
  .db-btn-green { background:#00D68F; color:#0B1A14; }
  .db-btn-green:hover { background:#00A870; }
  .db-period-tabs { display:flex; gap:4px; background:#e8edf5; border-radius:8px; padding:3px; }
  .db-period-tabs button { padding:5px 14px; border:none; border-radius:6px; background:transparent;
    font-size:.8rem; font-weight:500; color:#5e6a85; cursor:pointer; transition:all .2s; }
  .db-period-tabs button.active { background:#fff; color:#1a2035; box-shadow:0 1px 4px rgba(0,0,0,.1); }
  .db-main { padding:28px 32px; max-width:1400px; margin:0 auto; }
  .db-page-header { margin-bottom:24px; }
  .db-page-header h1 { font-size:1.9rem; font-weight:800; letter-spacing:-.03em; color:#1a2035; margin-bottom:2px; }
  .db-page-header p { color:#5e6a85; font-size:.9rem; }
  .db-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
  .db-toolbar-left { display:flex; align-items:center; gap:10px; }
  .db-status-badge { display:flex; align-items:center; gap:6px; background:#e6faf3; color:#00A870;
    border-radius:999px; padding:4px 12px; font-size:.8rem; font-weight:600; }
  .db-autorefresh { display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #e4e9f0;
    border-radius:8px; padding:5px 12px; font-size:.8rem; color:#5e6a85; }
  .db-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px; }
  .db-stat-card { background:#fff; border-radius:14px; padding:20px 22px; border:1px solid #e4e9f0;
    transition:transform .2s,box-shadow .2s; position:relative; overflow:hidden; }
  .db-stat-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.08); }
  .db-stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px;
    background:linear-gradient(90deg,#1A6EFF,#00D68F); }
  .db-stat-label { font-size:.78rem; font-weight:600; color:#5e6a85; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
  .db-stat-value { font-size:2rem; font-weight:800; color:#1a2035; line-height:1; margin-bottom:6px; }
  .db-stat-delta { display:inline-flex; align-items:center; gap:3px; font-size:.75rem; font-weight:600; padding:2px 7px; border-radius:999px; }
  .db-delta-up   { background:#e6faf3; color:#00A870; }
  .db-delta-down { background:#fff0f1; color:#e53e3e; }
  .db-delta-neu  { background:#f0f4f8; color:#5e6a85; }
  .db-stat-sub { font-size:.78rem; color:#5e6a85; margin-top:4px; }
  .db-stat-forecast { font-size:.75rem; color:#1A6EFF; margin-top:6px; font-weight:500; }
  .db-two-col { display:grid; grid-template-columns:2fr 1fr; gap:16px; margin-bottom:20px; }
  .db-card { background:#fff; border-radius:14px; border:1px solid #e4e9f0; padding:22px; margin-bottom:16px; }
  .db-card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
  .db-card-title { font-size:1rem; font-weight:700; color:#1a2035; }
  .db-card-link { font-size:.8rem; color:#1A6EFF; text-decoration:none; cursor:pointer; font-weight:500; }
  .db-card-link:hover { text-decoration:underline; }
  .db-analytics-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0; }
  .db-analytics-item { text-align:center; padding:16px 10px; border-right:1px solid #e4e9f0; }
  .db-analytics-item:last-child { border-right:none; }
  .db-analytics-val { font-size:1.6rem; font-weight:800; color:#1a2035; }
  .db-analytics-label { font-size:.78rem; color:#5e6a85; margin-top:4px; }
  .db-chart-area { height:140px; background:linear-gradient(180deg,#f0f8ff 0%,#fff 100%);
    border-radius:8px; border:1px solid #e4e9f0; display:flex; align-items:flex-end;
    padding:10px; gap:6px; overflow:hidden; margin-top:16px; }
  .db-bar { flex:1; background:linear-gradient(180deg,#1A6EFF,#00D68F); border-radius:4px 4px 0 0; opacity:.7; transition:opacity .2s; }
  .db-bar:hover { opacity:1; }
  .db-chart-legend { display:flex; gap:16px; margin-top:10px; }
  .db-legend-item { display:flex; align-items:center; gap:5px; font-size:.75rem; color:#5e6a85; }
  .db-legend-dot { width:8px; height:8px; border-radius:50%; }
  .db-donut-wrap { display:flex; flex-direction:column; align-items:center; gap:14px; }
  .db-donut { width:100px; height:100px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .db-donut-inner { width:68px; height:68px; border-radius:50%; background:#fff;
    display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .db-donut-pct { font-size:1rem; font-weight:800; color:#1a2035; }
  .db-donut-sub { font-size:.6rem; color:#5e6a85; }
  .db-waste-types { width:100%; }
  .db-waste-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
  .db-waste-label { display:flex; align-items:center; gap:6px; font-size:.8rem; }
  .db-waste-dot { width:8px; height:8px; border-radius:50%; }
  .db-waste-bar-wrap { flex:1; height:5px; background:#e4e9f0; border-radius:99px; margin:0 8px; }
  .db-waste-bar-fill { height:100%; border-radius:99px; }
  .db-waste-pct { font-size:.78rem; font-weight:600; color:#1a2035; }
  .db-predictions-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:12px; }
  .db-pred-card { background:#fff; border-radius:12px; border:1px solid #e4e9f0; padding:16px; transition:transform .2s,box-shadow .2s; }
  .db-pred-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.07); }
  .db-pred-id { font-weight:700; font-size:.95rem; color:#1a2035; margin-bottom:2px; }
  .db-pred-meta { font-size:.75rem; color:#5e6a85; margin-bottom:10px; }
  .db-pred-row { display:flex; justify-content:space-between; font-size:.78rem; margin-bottom:4px; }
  .db-pred-row-label { color:#5e6a85; }
  .db-pred-row-val { font-weight:500; color:#1a2035; }
  .db-pred-confidence { margin-top:10px; }
  .db-pred-conf-bar { height:4px; background:#e4e9f0; border-radius:99px; margin-top:4px; }
  .db-pred-conf-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,#1A6EFF,#00D68F); }
  .db-pred-btn { width:100%; margin-top:12px; padding:8px; border-radius:8px;
    border:1px solid #1A6EFF; color:#1A6EFF; background:transparent;
    font-size:.8rem; font-weight:600; cursor:pointer; transition:all .2s; }
  .db-pred-btn:hover { background:#1A6EFF; color:#fff; }
  .db-badge { display:inline-flex; align-items:center; gap:4px; font-size:.72rem; font-weight:600; padding:2px 8px; border-radius:999px; }
  .db-badge-green { background:#e6faf3; color:#00A870; }
  .db-badge-blue  { background:#eff5ff; color:#1A6EFF; }
  .db-attention-empty { text-align:center; padding:24px; color:#5e6a85; font-size:.85rem; }
  .db-attention-icon { font-size:2rem; margin-bottom:6px; }
  .db-actions-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
  .db-action-btn { display:flex; flex-direction:column; align-items:center; gap:6px;
    background:#fff; border:1px solid #e4e9f0; border-radius:12px; padding:14px 8px;
    cursor:pointer; transition:all .2s; position:relative; }
  .db-action-btn:hover { background:#f0f4f8; transform:translateY(-2px); }
  .db-action-icon { font-size:1.3rem; }
  .db-action-label { font-size:.75rem; font-weight:500; color:#1a2035; text-align:center; }
  .db-settings-list { display:flex; flex-direction:column; gap:14px; }
  .db-settings-row { display:flex; align-items:center; justify-content:space-between; }
  .db-settings-name { font-size:.85rem; font-weight:500; color:#1a2035; }
  .db-settings-sub  { font-size:.75rem; color:#5e6a85; }
  .db-toggle { width:36px; height:20px; border-radius:99px; border:none; cursor:pointer;
    transition:background .2s; position:relative; flex-shrink:0; }
  .db-toggle.on  { background:#1A6EFF; }
  .db-toggle.off { background:#d1d9e6; }
  .db-toggle::after { content:''; position:absolute; top:3px; width:14px; height:14px;
    border-radius:50%; background:#fff; transition:left .2s; }
  .db-toggle.on::after  { left:19px; }
  .db-toggle.off::after { left:3px; }
  .db-skeleton { background:linear-gradient(90deg,#f0f4f8 25%,#e4e9f0 50%,#f0f4f8 75%);
    background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:6px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .mobile-shell .db-topbar {
    padding: 0 14px;
    height: 54px;
  }
  .mobile-shell .db-brand { font-size: 1rem; }
  .mobile-shell .db-main {
    padding: 14px;
  }
  .mobile-shell .db-page-header h1 {
    font-size: 1.35rem;
  }
  .mobile-shell .db-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  .mobile-shell .db-toolbar-left,
  .mobile-shell .db-nav-right {
    width: 100%;
    flex-wrap: wrap;
  }
  .mobile-shell .db-period-tabs {
    width: 100%;
    justify-content: space-between;
  }
  .mobile-shell .db-period-tabs button {
    flex: 1;
    text-align: center;
  }
  .mobile-shell .db-stats-grid,
  .mobile-shell .db-two-col,
  .mobile-shell .db-analytics-grid,
  .mobile-shell .db-predictions-grid {
    grid-template-columns: 1fr;
  }
  .mobile-shell .db-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .mobile-shell .db-card {
    padding: 14px;
  }
  .mobile-shell .db-chart-area {
    height: 120px;
  }
  .mobile-shell .db-user-pill {
    font-size: .75rem;
    padding: 4px 10px 4px 5px;
  }

  @media(max-width:1100px){
    .db-stats-grid{grid-template-columns:repeat(2,1fr);}
    .db-two-col{grid-template-columns:1fr;}
    .db-predictions-grid{grid-template-columns:repeat(2,1fr);}
    .db-actions-grid{grid-template-columns:repeat(3,1fr);}
  }
`;

// ── Sub-components ────────────────────────────────────────────
function StatCard({ title, value, delta, deltaType = "neu", subtitle, forecast, loading }) {
  return (
    <div className="db-stat-card">
      <div className="db-stat-label">{title}</div>
      {loading
        ? <div className="db-skeleton" style={{ height: 40, marginBottom: 8 }} />
        : <div className="db-stat-value">{value}</div>
      }
      <span className={`db-stat-delta db-delta-${deltaType}`}>
        {deltaType === "up" ? "▲" : deltaType === "down" ? "▼" : "●"} {delta}
      </span>
      <div className="db-stat-sub">{subtitle}</div>
      {forecast && <div className="db-stat-forecast">🔮 {forecast}</div>}
    </div>
  );
}

function PredCard({ binId, pred }) {
  const formatTs = (ts) => ts ? new Date(ts * 1000).toLocaleString() : "—";
  return (
    <div className="db-pred-card">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div>
          <div className="db-pred-id">{binId}</div>
          <div className="db-pred-meta">Auto Registered • Sharp Medical Waste</div>
        </div>
        <span className="db-badge db-badge-green">Live</span>
      </div>
      <div className="db-pred-row">
        <span className="db-pred-row-label">Full at:</span>
        <span className="db-pred-row-val">{formatTs(pred?.target_timestamp)}</span>
      </div>
      <div className="db-pred-row">
        <span className="db-pred-row-label">Hours until full:</span>
        <span className="db-pred-row-val">{pred?.hours_until_full ?? "—"}h</span>
      </div>
      {pred?.note && (
        <div style={{ fontSize:"0.7rem", color:"#F59E0B", marginTop:4 }}>⚠ {pred.note}</div>
      )}
      <div className="db-pred-confidence">
        <div className="db-pred-row">
          <span className="db-pred-row-label">Confidence:</span>
          <span className="db-pred-row-val" style={{ color:"#1A6EFF" }}>{pred?.confidence ?? 0}%</span>
        </div>
        <div className="db-pred-conf-bar">
          <div className="db-pred-conf-fill" style={{ width:`${pred?.confidence ?? 0}%` }} />
        </div>
      </div>
      <button className="db-pred-btn">Schedule Pickup</button>
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return <button className={`db-toggle ${on ? "on" : "off"}`} onClick={onToggle} />;
}

// ── Main ──────────────────────────────────────────────────────
function Dashboard() {
  const navigate = useNavigate();

  // ── Auth ──────────────────────────────────────────────────
  const username = sessionStorage.getItem("mw_name") || sessionStorage.getItem("mw_user") || "User";
  const role     = sessionStorage.getItem("mw_role") || "personnel";

  useEffect(() => {
    if (sessionStorage.getItem("mw_logged_in") !== "true") navigate("/login");
  }, [navigate]);

  // ── State ─────────────────────────────────────────────────
  const [bins,          setBins]          = useState([]);
  const [predictions,   setPredictions]   = useState({});
  const [alerts,        setAlerts]        = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifBanner,   setNotifBanner]   = useState(null);
  const [period,        setPeriod]        = useState("Month");
  const [loading,       setLoading]       = useState(true);
  const [settings,      setSettings]      = useState({
    autoRefresh: true, aiPredictions: true, analytics: true, compact: false,
  });

  // ── Derived stats from REAL bin data ──────────────────────
  const totalBins   = bins.length;
  const avgFullness = bins.length
    ? Math.round(bins.reduce((s, b) => s + b.fullness, 0) / bins.length)
    : 0;
  const critical    = bins.filter(b => b.fullness >= 80).length;
  const avgConf     = Object.values(predictions).length
    ? Math.round(Object.values(predictions).reduce((s, p) => s + (p?.confidence ?? 0), 0) / Object.values(predictions).length)
    : 0;

  // ── Fetch all data ─────────────────────────────────────────
  const fetchAll = async () => {
    try {
      // 1. Bins from MongoDB telemetry
      const binsRes = await getBins();
      setBins(binsRes.data);

      // 2. AI predictions for each bin
      const binIds = binsRes.data.map(b => b._id);
      const predResults = await Promise.all(
        binIds.map(id => getPredict(id).then(r => ({ id, data: r.data })).catch(() => ({ id, data: null })))
      );
      const predMap = {};
      predResults.forEach(({ id, data }) => { if (data) predMap[id] = data; });
      setPredictions(predMap);

      // 3. Alerts
      const alertsRes = await getAlerts();
      setAlerts(alertsRes.data.filter(a => !a.resolved));

    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data);
      const unread = res.data.find(n => !n.read);
      if (unread) setNotifBanner(unread);
    } catch (err) {
      console.error("Notifications error:", err);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchNotifications();
    const dataInterval  = setInterval(fetchAll, 10000);
    const notifInterval = setInterval(fetchNotifications, 30000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(notifInterval);
     };
  }, []);

  useSocket({
  // New telemetry reading → update bin in state without full refetch
  'telemetry:update': ({ binId, fullness }) => {
    setBins(prev => {
      const exists = prev.find(b => b._id === binId);
      if (exists) return prev.map(b => b._id === binId ? { ...b, fullness } : b);
      return [...prev, { _id: binId, fullness }]; // new bin
    });
  },
 
  // New alert → add to alerts list
  'alert:new': (alert) => {
    setAlerts(prev => [alert, ...prev]);
  },
 
  // New notification → show banner
  'notification:new': (notif) => {
    setNotifications(prev => [notif, ...prev]);
    setNotifBanner(notif);
  },
});
 
// Keep ONE initial fetch on mount, remove the interval:
useEffect(() => {
  fetchAll();
  fetchNotifications();
}, []);

  // ── Actions ───────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (notifBanner?._id === id) setNotifBanner(null);
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => { sessionStorage.clear(); navigate("/login"); };
  const toggleSetting = (key) => setSettings(s => ({ ...s, [key]: !s[key] }));

  // Bar heights from real bin data (or fallback)
  const barHeights = bins.length
    ? bins.map(b => b.fullness)
    : [30, 55, 45, 70, 60, 80, 51, 65, 40, 58, 72, 51];

  return (
    <>
      <style>{css}</style>
      <div className="db-root">

        {/* TOP BAR */}
        <div className="db-topbar">
          <div className="db-brand">MedWaste</div>
          <div className="db-nav-right">
            <div className="db-user-pill">
              <div className="db-avatar">{username.charAt(0).toUpperCase()}</div>
              <span>{username}</span>
              <span style={{ fontSize:"0.7rem", background:"#f0f4f8", padding:"2px 7px", borderRadius:999, color:"#5e6a85", marginLeft:4 }}>
                {role}
              </span>
            </div>
            <button className="db-btn db-btn-danger" onClick={handleLogout}>Log Out</button>
          </div>
        </div>

        <div className="db-main">

          {/* Notification banner */}
          {notifBanner && (
            <div style={{ background:"#ecfdf5", border:"1px solid #10b981", padding:"14px 18px",
              borderRadius:12, marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <strong style={{ color:"#065f46" }}>
                  {notifBanner.type === "success" ? "✅" : "ℹ️"} {notifBanner.title}
                </strong>
                <p style={{ color:"#065f46", margin:"4px 0 0", fontSize:"0.88rem" }}>{notifBanner.message}</p>
              </div>
              <button onClick={() => handleMarkRead(notifBanner._id)}
                style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:"1.2rem" }}>✕</button>
            </div>
          )}

          {/* Page header */}
          <div className="db-page-header">
            <h1>Monitoring Dashboard</h1>
            <p>Medical waste management with AI analytics</p>
          </div>

          {/* Toolbar */}
          <div className="db-toolbar">
            <div className="db-toolbar-left">
              <div className="db-status-badge"><span className="db-online-dot" /> Online</div>
              <div className="db-autorefresh">🔄 Auto-refresh 10s</div>
              <div className="db-period-tabs">
                {["Day","Week","Month","Year"].map(p => (
                  <button key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="db-btn db-btn-ghost" onClick={fetchAll}>🔄 Refresh</button>
            </div>
          </div>

          {/* STAT CARDS — real data */}
          <div className="db-stats-grid">
            <StatCard loading={loading} title="Total Bins"       value={totalBins}       delta="live"  deltaType="neu" subtitle="Active in system" />
            <StatCard loading={loading} title="Average Fullness" value={`${avgFullness}%`} delta="live" deltaType={avgFullness > 70 ? "up" : "neu"} subtitle="Current average" />
            <StatCard loading={loading} title="Needs Attention"  value={critical}        delta={critical > 0 ? "!" : "ok"} deltaType={critical > 0 ? "down" : "neu"}
              subtitle="Bins ≥ 80% full" forecast={critical > 0 ? `${critical} bin(s) need pickup` : "All bins normal"} />
            <StatCard loading={loading} title="AI Confidence"    value={`${avgConf}%`}   delta="live"  deltaType="up" subtitle="Avg prediction accuracy" />
          </div>

          {/* ANALYTICS + WASTE TYPES */}
          <div className="db-two-col">
            <div className="db-card">
              <div className="db-card-header">
                <span className="db-card-title">Fullness Overview</span>
                <Link to="/dashboard/containers" className="db-card-link">All containers →</Link>
              </div>
              <div className="db-analytics-grid">
                {[
                  { val: totalBins,        label: "Total bins"     },
                  { val: `${avgFullness}%`, label: "Avg fullness"  },
                  { val: critical,          label: "Critical (≥80%)"},
                  { val: `${avgConf}%`,     label: "AI confidence" },
                ].map(m => (
                  <div className="db-analytics-item" key={m.label}>
                    <div className="db-analytics-val">{loading ? "—" : m.val}</div>
                    <div className="db-analytics-label">{m.label}</div>
                  </div>
                ))}
              </div>
              {/* Bar chart — real bin fullness */}
              <div className="db-chart-area">
                {barHeights.map((h, i) => (
                  <div key={i} className="db-bar" style={{ height:`${Math.max(h, 4)}%` }}
                    title={bins[i] ? `${bins[i]._id}: ${bins[i].fullness}%` : `${h}%`} />
                ))}
              </div>
              <div className="db-chart-legend">
                <div className="db-legend-item"><div className="db-legend-dot" style={{ background:"#1A6EFF" }} /> Fullness %</div>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-header">
                <span className="db-card-title">Waste Types</span>
              </div>
              <div className="db-donut-wrap">
                <div className="db-donut" style={{ background:`conic-gradient(#1A6EFF 0deg 360deg, #e4e9f0 360deg)` }}>
                  <div className="db-donut-inner">
                    <div className="db-donut-pct">100%</div>
                    <div className="db-donut-sub">Sharp</div>
                  </div>
                </div>
                <div className="db-waste-types">
                  <div className="db-waste-row">
                    <div className="db-waste-label">
                      <div className="db-waste-dot" style={{ background:"#1A6EFF" }} />
                      <span style={{ fontSize:"0.78rem" }}>Sharp Medical Waste</span>
                    </div>
                    <span className="db-waste-pct">100%</span>
                  </div>
                  <div className="db-waste-bar-wrap">
                    <div className="db-waste-bar-fill" style={{ width:"100%", background:"#1A6EFF" }} />
                  </div>
                  <div style={{ fontSize:"0.72rem", color:"#5e6a85", marginTop:4 }}>
                    {totalBins} bins · {avgFullness}% avg filled
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI PREDICTIONS — real data */}
          <div className="db-card">
            <div className="db-card-header">
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span className="db-card-title">AI Maintenance Predictions</span>
                <span className="db-badge db-badge-green">✓ Live · {Object.keys(predictions).length} bins</span>
              </div>
              <Link to="/dashboard/containers" className="db-card-link">View all →</Link>
            </div>
            {loading ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
                {[1,2,3].map(i => <div key={i} className="db-skeleton" style={{ height:180 }} />)}
              </div>
            ) : bins.length === 0 ? (
              <div style={{ textAlign:"center", padding:40, color:"#a0aec0" }}>
                No bin data yet. Start the sensor to see predictions.
              </div>
            ) : (
              <div className="db-predictions-grid">
                {bins.slice(0,6).map(bin => (
                  <PredCard key={bin._id} binId={bin._id} pred={predictions[bin._id]} />
                ))}
              </div>
            )}
          </div>

          {/* NEEDS ATTENTION */}
          <div className="db-card">
            <div className="db-card-header">
              <span className="db-card-title">Needs Attention</span>
              <Link to="/dashboard/alerts" className="db-card-link">View all →</Link>
            </div>
            {alerts.length === 0 ? (
              <div className="db-attention-empty">
                <div className="db-attention-icon">✅</div>
                <p>All bins are normal — no attention needed</p>
              </div>
            ) : (
              <div style={{ maxHeight:280, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
                {alerts.slice(0,5).map(alert => (
                  <div key={alert._id} style={{
                    background: alert.severity === "critical" ? "#fff5f5" : "#fffbeb",
                    borderLeft: `4px solid ${alert.severity === "critical" ? "#f87171" : "#fbbf24"}`,
                    padding:"10px 14px", borderRadius:6,
                    color: alert.severity === "critical" ? "#991b1b" : "#92400e",
                  }}>
                    <div style={{ fontWeight:700, fontSize:"0.85rem" }}>⚠️ {alert.title}</div>
                    <div style={{ fontSize:"0.75rem", marginTop:3 }}>{alert.message}</div>
                    <div style={{ fontSize:"0.65rem", opacity:.6, marginTop:4 }}>
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUICK ACTIONS + SETTINGS */}
          <div className="db-two-col">
            <div className="db-card">
              <div className="db-card-header">
                <span className="db-card-title">Quick Actions</span>
              </div>
              <div className="db-actions-grid">
                {[
                  { icon:"🗑️", label:"Bins",         link:"/dashboard/containers" },
                  { icon:"🗺️", label:"Map",          link:"/dashboard/map"        },
                  { icon:"⚠️", label:"Alerts",       link:"/dashboard/alerts"     },
                  { icon:"📊", label:"Reports",      link:"/dashboard/reports"    },
                  { icon:"🛣️", label:"Routes",       link:"/dashboard/routes-history" },
                  { icon:"👤", label:"Profile",      link:"/dashboard/profile"    },
                  ...(role === "admin" ? [
                    { icon:"🚛", label:"Dispatch",   link:"/dashboard/admin/dispatch" },
                    { icon:"🛡️", label:"Approvals", link:"/dashboard/admin/drivers"  },
                  ] : []),
                ].map(a => (
                  <Link to={a.link} key={a.label} style={{ textDecoration:"none" }}>
                    <div className="db-action-btn">
                      <span className="db-action-icon">{a.icon}</span>
                      <span className="db-action-label">{a.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-header">
                <span className="db-card-title">Dashboard Settings</span>
              </div>
              <div className="db-settings-list">
                {[
                  { key:"autoRefresh",   name:"Auto-refresh",   sub:"Every 10 sec"       },
                  { key:"aiPredictions", name:"AI Predictions",  sub:"Machine learning"   },
                  { key:"analytics",     name:"Analytics",       sub:"Advanced metrics"   },
                  { key:"compact",       name:"Compact view",    sub:"Save space"         },
                ].map(s => (
                  <div className="db-settings-row" key={s.key}>
                    <div>
                      <div className="db-settings-name">{s.name}</div>
                      <div className="db-settings-sub">{s.sub}</div>
                    </div>
                    <Toggle on={settings[s.key]} onToggle={() => toggleSetting(s.key)} />
                  </div>
                ))}
              </div>

              {/* Unread notifications */}
              {notifications.filter(n => !n.read).length > 0 && (
                <div style={{ marginTop:16, borderTop:"1px solid #f0f4f8", paddingTop:14 }}>
                  <div style={{ fontSize:"0.78rem", fontWeight:600, color:"#5e6a85", marginBottom:8 }}>
                    NOTIFICATIONS
                  </div>
                  {notifications.filter(n => !n.read).map(n => (
                    <div key={n._id} style={{
                      background: n.type === "success" ? "#e6faf3" : "#fff0f1",
                      border:`1px solid ${n.type === "success" ? "#00D68F" : "#e53e3e"}`,
                      padding:"10px 12px", borderRadius:8, marginBottom:8,
                      display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                    }}>
                      <div>
                        <div style={{ fontSize:"0.82rem", fontWeight:600, color: n.type === "success" ? "#00A870" : "#e53e3e" }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize:"0.75rem", marginTop:2, color:"#5e6a85" }}>{n.message}</div>
                      </div>
                      <button onClick={() => handleMarkRead(n._id)}
                        style={{ border:"none", background:"transparent", cursor:"pointer", fontSize:"1rem", flexShrink:0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default Dashboard;