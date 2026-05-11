import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useSocket } from "../hooks/useSocket";

const css = `
  
  .dd-root { min-height:100vh; background:#f0f4f8; font-family:'Geist',sans-serif; color:#1a2035; padding:32px; }
  .dd-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; flex-wrap:wrap; gap:14px; }
  .dd-header h1 { font-size:1.9rem; font-weight:800; letter-spacing:-.03em; margin-bottom:4px; }
  .dd-header p  { color:#5e6a85; font-size:.9rem; }

  .dd-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:24px; }
  .dd-stat  { background:#fff; border-radius:12px; border:1px solid #e4e9f0; padding:18px 20px;
    position:relative; overflow:hidden; }
  .dd-stat::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
  .dd-stat.blue::before   { background:#1A6EFF; }
  .dd-stat.green::before  { background:#00D68F; }
  .dd-stat.orange::before { background:#F59E0B; }
  .dd-stat-label { font-size:.72rem; font-weight:600; color:#5e6a85; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
  .dd-stat-val   { font-size:1.8rem; font-weight:800; color:#1a2035; }

  .dd-tabs { display:flex; gap:4px; background:#e8edf5; border-radius:8px; padding:3px; margin-bottom:20px; width:fit-content; }
  .dd-tab  { padding:7px 18px; border:none; border-radius:6px; background:transparent;
    font-family:inherit; font-size:.85rem; font-weight:500; color:#5e6a85; cursor:pointer; transition:all .2s; }
  .dd-tab.active { background:#fff; color:#1a2035; box-shadow:0 1px 4px rgba(0,0,0,.1); }

  .dd-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }

  .dd-card { background:#fff; border-radius:14px; border:1px solid #e4e9f0;
    padding:20px; position:relative; overflow:hidden;
    transition:transform .2s,box-shadow .2s; }
  .dd-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.08); }
  .dd-card-accent { position:absolute; top:0; left:0; right:0; height:3px; }

  .dd-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
  .dd-task-id  { font-size:1rem; font-weight:700; }
  .dd-priority { font-size:.7rem; font-weight:700; padding:3px 9px; border-radius:999px; }
  .dd-priority-high     { background:#fff0f1; color:#E53E3E; }
  .dd-priority-medium   { background:#fff8ec; color:#D97706; }
  .dd-priority-low      { background:#e6faf3; color:#00A870; }
  .dd-priority-critical { background:#4B0082; color:#fff; }

  .dd-status-badge { font-size:.72rem; font-weight:600; padding:3px 9px; border-radius:999px; display:inline-flex; align-items:center; gap:4px; }
  .dd-status-assigned     { background:#eff5ff; color:#1A6EFF; }
  .dd-status-in_transit   { background:#fff8ec; color:#D97706; }
  .dd-status-completed    { background:#e6faf3; color:#00A870; }
  .dd-status-cancelled    { background:#fff0f1; color:#E53E3E; }

  .dd-info-row { display:flex; justify-content:space-between; font-size:.8rem; margin-bottom:5px; }
  .dd-info-label { color:#5e6a85; }
  .dd-info-val   { font-weight:500; color:#1a2035; }

  .dd-divider { height:1px; background:#f0f4f8; margin:12px 0; }

  .dd-btn { width:100%; padding:10px; border-radius:8px; border:none;
    font-family:inherit; font-size:.85rem; font-weight:600; cursor:pointer; transition:all .2s; margin-top:4px; }
  .dd-btn-primary { background:#1A6EFF; color:#fff; }
  .dd-btn-primary:hover { background:#0F4ECC; }
  .dd-btn-green { background:#00D68F; color:#0B1A14; }
  .dd-btn-green:hover { background:#00A870; }
  .dd-btn-ghost { background:#f0f4f8; color:#5e6a85; }
  .dd-btn-ghost:hover { background:#e4e9f0; }
  .dd-btn:disabled { opacity:.5; cursor:not-allowed; }

  .dd-empty { text-align:center; padding:60px 20px; color:#a0aec0; }
  .dd-empty-icon { font-size:3rem; margin-bottom:12px; }
  .dd-empty h3 { font-size:1rem; font-weight:700; color:#5e6a85; margin-bottom:6px; }
  .dd-empty p  { font-size:.85rem; line-height:1.6; }

  .dd-toast { position:fixed; bottom:24px; right:24px; background:#1a2035; color:#fff;
    border-radius:10px; padding:12px 20px; font-size:.85rem; font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.2); animation:toastIn .3s ease; z-index:9999; }
  @keyframes toastIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  .dd-refresh-btn { padding:8px 16px; border-radius:8px; border:1px solid #e4e9f0;
    background:#fff; font-family:inherit; font-size:.85rem; font-weight:500;
    color:#1a2035; cursor:pointer; transition:all .2s; display:inline-flex; align-items:center; gap:6px; }
  .dd-refresh-btn:hover { background:#f0f4f8; }

  .dd-profile-card { background:#fff; border-radius:14px; border:1px solid #e4e9f0; padding:20px; margin-bottom:20px;
    display:flex; align-items:center; gap:16px; }
  .dd-profile-avatar { width:48px; height:48px; border-radius:50%;
    background:linear-gradient(135deg,#1A6EFF,#00D68F);
    display:flex; align-items:center; justify-content:center;
    font-size:1.2rem; font-weight:800; color:#fff; flex-shrink:0; }
  .dd-profile-name { font-size:1rem; font-weight:700; }
  .dd-profile-role { font-size:.78rem; color:#5e6a85; }
  .dd-avail-toggle { margin-left:auto; }

  @media(max-width:700px) {
    .dd-root { padding:16px; }
    .dd-stats { grid-template-columns:1fr 1fr; }
    .dd-grid  { grid-template-columns:1fr; }
  }
`;

const STATUS_NEXT = {
  assigned:   { label: "🚛 Pick Up — Start Transit", next: "in_transit", btnClass: "dd-btn-primary" },
};

const STATUS_COLOR = {
  assigned:     "#1A6EFF",
  in_transit:   "#F59E0B",
  completed:    "#00D68F",
  cancelled:    "#EF4444",
};

export default function DriverDashboard() {
  const navigate  = useNavigate();
  const name      = sessionStorage.getItem("mw_name") || "Driver";
  const [tab,     setTab]     = useState("active");
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState({});
  const [avail,   setAvail]   = useState(true);
  const [toast,   setToast]   = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/drivers/tasks");
      setTasks(res.data);
    } catch (err) {
      showToast("❌ Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (sessionStorage.getItem("mw_logged_in") !== "true") navigate("/login");
  fetchTasks();
  const id = setInterval(fetchTasks, 15000);
  return () => clearInterval(id);
}, []);


  useSocket({
  // Admin assigned a new task → instantly appear in list
  'task:assigned': (task) => {
    setTasks(prev => [task, ...prev]);
    showToast("🚛 New task assigned!");
  },
});


  const handleStatusUpdate = async (taskId, nextStatus) => {
    setSaving(s => ({ ...s, [taskId]: true }));
    try {
      await api.patch(`/api/drivers/tasks/${taskId}/status`, { status: nextStatus });
      setTasks(prev => prev.map(t =>
        (t.id === taskId || t._id === taskId)
          ? { ...t, status: nextStatus }
          : t
      ));
      showToast(nextStatus === "in_transit"
        ? "🚛 Status updated — you are now in transit!"
        : "✅ Task completed! Well done.");
    } catch (err) {
      showToast("❌ " + (err.response?.data?.error || "Failed to update"));
    } finally {
      setSaving(s => ({ ...s, [taskId]: false }));
    }
  };

  const handleAvailToggle = async () => {
    try {
      await api.patch("/api/drivers/availability", { isAvailable: !avail });
      setAvail(a => !a);
      showToast(`Status: ${!avail ? "Available" : "Unavailable"}`);
    } catch { setAvail(a => !a); }
  };

  // Filter by tab
  const active    = tasks.filter(t => ["assigned", "in_transit"].includes(t.status));
  const completed = tasks.filter(t => t.status === "completed");
  const displayed = tab === "active" ? active : completed;

  return (
    <>
      <style>{css}</style>
      <div className="dd-root">

        {/* Profile + availability */}
        <div className="dd-profile-card">
          <div className="dd-profile-avatar">{name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="dd-profile-name">{name}</div>
            <div className="dd-profile-role">🚛 Driver</div>
          </div>
          <div className="dd-avail-toggle">
            <button
              onClick={handleAvailToggle}
              style={{
                padding:"8px 16px", borderRadius:999, border:"none", cursor:"pointer",
                background: avail ? "#e6faf3" : "#f0f4f8",
                color:      avail ? "#00A870" : "#5e6a85",
                fontFamily:"inherit", fontWeight:600, fontSize:".82rem",
              }}>
              {avail ? "🟢 Available" : "⚫ Unavailable"}
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="dd-header">
          <div>
            <h1>My Tasks</h1>
            <p>Medical waste collection assignments</p>
          </div>
          <button className="dd-refresh-btn" onClick={fetchTasks}>🔄 Refresh</button>
        </div>

        {/* Stats */}
        <div className="dd-stats">
          <div className="dd-stat blue">
            <div className="dd-stat-label">📋 Assigned</div>
            <div className="dd-stat-val">{tasks.filter(t => t.status === "assigned").length}</div>
          </div>
          <div className="dd-stat orange">
            <div className="dd-stat-label">🚛 In Transit</div>
            <div className="dd-stat-val">{tasks.filter(t => t.status === "in_transit").length}</div>
          </div>
          <div className="dd-stat green">
            <div className="dd-stat-label">✅ Completed</div>
            <div className="dd-stat-val">{completed.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="dd-tabs">
          <button className={`dd-tab ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>
            Active ({active.length})
          </button>
          <button className={`dd-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
            History ({completed.length})
          </button>
        </div>

        {/* Task cards */}
        {loading ? (
          <div className="dd-empty"><div className="dd-empty-icon">⏳</div><p>Loading tasks…</p></div>
        ) : displayed.length === 0 ? (
          <div className="dd-empty">
            <div className="dd-empty-icon">{tab === "active" ? "🎉" : "📋"}</div>
            <h3>{tab === "active" ? "No active tasks" : "No completed tasks yet"}</h3>
            <p>{tab === "active"
              ? "You have no assigned tasks right now. Stay available to receive new assignments."
              : "Completed tasks will appear here."}</p>
          </div>
        ) : (
          <div className="dd-grid">
            {displayed.map(task => {
              const id       = task.id || task._id;
              const nextStep = STATUS_NEXT[task.status];

              return (
                <div key={id} className="dd-card">
                  <div className="dd-card-accent" style={{ background: STATUS_COLOR[task.status] }} />

                  <div className="dd-card-top">
                    <span className="dd-task-id">Task #{String(id).slice(-6)}</span>
                    <span className={`dd-status-badge dd-status-${task.status}`}>
                      {task.status === "assigned"   && "● Assigned"}
                      {task.status === "in_transit" && "🚛 In Transit"}
                      {task.status === "completed"  && "✓ Completed"}
                      {task.status === "cancelled"  && "✕ Cancelled"}
                    </span>
                  </div>

                  <div className="dd-info-row">
                    <span className="dd-info-label">📦 Container</span>
                    <span className="dd-info-val">{task.containerId}</span>
                  </div>
                  <div className="dd-info-row">
                    <span className="dd-info-label">📅 Assigned</span>
                    <span className="dd-info-val">
                      {task.assignedAt ? new Date(task.assignedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                  {task.completedAt && (
                    <div className="dd-info-row">
                      <span className="dd-info-label">✅ Completed</span>
                      <span className="dd-info-val">{new Date(task.completedAt).toLocaleString()}</span>
                    </div>
                  )}

                  {/* Action button */}
                  {nextStep && (
                    <>
                      <div className="dd-divider" />
                      <button
                        className={`dd-btn ${nextStep.btnClass}`}
                        disabled={saving[id]}
                        onClick={() => handleStatusUpdate(id, nextStep.next)}
                      >
                        {saving[id] ? "Updating…" : nextStep.label}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {toast && <div className="dd-toast">{toast}</div>}
    </>
  );
}