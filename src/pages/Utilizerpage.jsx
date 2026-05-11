import React, { useEffect, useState } from "react";
import { getIncomingTasks, acceptWaste, completeProcess, getUtilizerHistory } from "../services/api";

const css = `
  
  .ut-root { min-height:100vh; background:#f0f4f8; font-family:'Geist',sans-serif; color:#1a2035; padding:32px; }
  .ut-header { margin-bottom:28px; }
  .ut-header h1 { font-size:1.9rem; font-weight:800; letter-spacing:-0.03em; margin-bottom:4px; }
  .ut-header p  { color:#5e6a85; font-size:0.9rem; }
  .ut-tabs { display:flex; gap:4px; background:#e8edf5; border-radius:8px; padding:3px; margin-bottom:24px; width:fit-content; }
  .ut-tab { padding:7px 18px; border:none; border-radius:6px; background:transparent; font-family:inherit;
    font-size:0.85rem; font-weight:500; color:#5e6a85; cursor:pointer; transition:all .2s; }
  .ut-tab.active { background:#fff; color:#1a2035; box-shadow:0 1px 4px rgba(0,0,0,.1); }
  .ut-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
  .ut-card { background:#fff; border-radius:14px; border:1px solid #e4e9f0; padding:20px;
    box-shadow:0 2px 8px rgba(0,0,0,.04); }
  .ut-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
  .ut-card-id  { font-size:1rem; font-weight:700; }
  .ut-badge { font-size:0.7rem; font-weight:600; padding:3px 9px; border-radius:999px; }
  .ut-badge-transit { background:#eff5ff; color:#1A6EFF; }
  .ut-badge-util    { background:#fff7e6; color:#D97706; }
  .ut-badge-done    { background:#e6faf3; color:#00A870; }
  .ut-meta { font-size:0.8rem; color:#5e6a85; margin-bottom:14px; line-height:1.6; }
  .ut-btn { padding:8px 16px; border-radius:8px; border:none; font-family:inherit;
    font-size:0.82rem; font-weight:600; cursor:pointer; transition:all .2s; margin-right:8px; margin-top:4px; }
  .ut-btn-blue  { background:#1A6EFF; color:#fff; }
  .ut-btn-blue:hover  { background:#0F4ECC; }
  .ut-btn-green { background:#00D68F; color:#0B1A14; }
  .ut-btn-green:hover { background:#00A870; }
  .ut-empty { text-align:center; padding:60px 20px; color:#a0aec0; }
  .ut-empty-icon { font-size:3rem; margin-bottom:12px; }
  .ut-complete-form { margin-top:12px; padding-top:12px; border-top:1px solid #f0f4f8; display:flex; flex-direction:column; gap:8px; }
  .ut-input { padding:8px 12px; border:1.5px solid #e4e9f0; border-radius:8px; font-family:inherit;
    font-size:0.85rem; outline:none; width:100%; transition:border-color .2s; }
  .ut-input:focus { border-color:#1A6EFF; }
`;

function statusBadge(status) {
  if (status === "in_transit")     return <span className="ut-badge ut-badge-transit">🚛 In Transit</span>;
  if (status === "at_utilization") return <span className="ut-badge ut-badge-util">⚙️ Processing</span>;
  if (status === "completed")      return <span className="ut-badge ut-badge-done">✅ Completed</span>;
  return null;
}

export default function UtilizerPage() {
  const [tab, setTab]             = useState("incoming");
  const [incoming, setIncoming]   = useState([]);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [completing, setCompleting] = useState({}); // {taskId: {weight, method, notes}}

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === "incoming") {
        const res = await getIncomingTasks();
        setIncoming(res.data);
      } else {
        const res = await getUtilizerHistory();
        setHistory(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await acceptWaste(id);
      setIncoming(prev => prev.map(t => t.id === id ? { ...t, status: "at_utilization" } : t));
    } catch (err) { console.error("Accept error:", err.response?.data || err.message); }
  };

  const handleComplete = async (id) => {
    const data = completing[id] || {};
    try {
      await completeProcess(id, { weightKg: Number(data.weight || 0), method: data.method || "incineration", notes: data.notes || "" });
      setIncoming(prev => prev.filter(t => t.id !== id));
      fetchData();
    } catch (err) { console.error("Complete error:", err.response?.data || err.message); }
  };

  const tasks = tab === "incoming" ? incoming : history;

  return (
    <>
      <style>{css}</style>
      <div className="ut-root">
        <div className="ut-header">
          <h1>Utilization Station</h1>
          <p>Manage incoming waste and record disposal processes</p>
        </div>

        <div className="ut-tabs">
          <button className={`ut-tab ${tab === "incoming" ? "active" : ""}`} onClick={() => setTab("incoming")}>
            Incoming ({incoming.length})
          </button>
          <button className={`ut-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
            History
          </button>
        </div>

        {loading ? (
          <div className="ut-empty"><div className="ut-empty-icon">⏳</div><p>Loading...</p></div>
        ) : tasks.length === 0 ? (
          <div className="ut-empty">
            <div className="ut-empty-icon">{tab === "incoming" ? "🚛" : "📋"}</div>
            <p>{tab === "incoming" ? "No incoming tasks right now." : "No completed tasks yet."}</p>
          </div>
        ) : (
          <div className="ut-grid">
            {tasks.map((task) => (
              <div key={task.id || task._id} className="ut-card">
                <div className="ut-card-top">
                  <span className="ut-card-id">Task #{(task.id || task._id)?.toString().slice(-6)}</span>
                  {statusBadge(task.status)}
                </div>
                <div className="ut-meta">
                  <div>📦 Container: <strong>{task.containerId}</strong></div>
                  <div>🚛 Driver ID: {task.driverId}</div>
                  {task.disposalLog && (
                    <>
                      <div>⚖️ Weight: {task.disposalLog.weightKg} kg</div>
                      <div>🔥 Method: {task.disposalLog.method}</div>
                      <div>🕐 Completed: {new Date(task.disposalLog.completedAt).toLocaleString()}</div>
                    </>
                  )}
                </div>

                {/* Actions for incoming tab */}
                {tab === "incoming" && (
                  <>
                    {task.status === "in_transit" && (
                      <button className="ut-btn ut-btn-blue" onClick={() => handleAccept(task.id)}>
                        ✓ Accept Waste
                      </button>
                    )}

                    {task.status === "at_utilization" && (
                      <div className="ut-complete-form">
                        <input
                          className="ut-input" type="number" placeholder="Weight (kg)"
                          value={completing[task.id]?.weight || ""}
                          onChange={(e) => setCompleting(p => ({ ...p, [task.id]: { ...p[task.id], weight: e.target.value } }))}
                        />
                        <select
                          className="ut-input"
                          value={completing[task.id]?.method || "incineration"}
                          onChange={(e) => setCompleting(p => ({ ...p, [task.id]: { ...p[task.id], method: e.target.value } }))}
                        >
                          <option value="incineration">Incineration</option>
                          <option value="autoclave">Autoclave</option>
                          <option value="chemical">Chemical treatment</option>
                        </select>
                        <input
                          className="ut-input" type="text" placeholder="Notes (optional)"
                          value={completing[task.id]?.notes || ""}
                          onChange={(e) => setCompleting(p => ({ ...p, [task.id]: { ...p[task.id], notes: e.target.value } }))}
                        />
                        <button className="ut-btn ut-btn-green" onClick={() => handleComplete(task.id)}>
                          🔥 Mark as Destroyed
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

