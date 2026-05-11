import React, { useState, useEffect } from "react";
import { getAlerts, getApprovedDrivers, getAllTasks, assignTask } from "../services/api";
import { useSocket } from "../hooks/useSocket";

const css = `
  
  .ad-root { min-height:100vh; background:#f0f4f8; font-family:'Geist',sans-serif; color:#1a2035; padding:32px; }
  .ad-header { margin-bottom:28px; }
  .ad-header h1 { font-size:1.9rem; font-weight:800; letter-spacing:-0.03em; margin-bottom:4px; }
  .ad-header p  { color:#5e6a85; font-size:0.9rem; }
  .ad-card { background:#fff; border-radius:14px; border:1px solid #e4e9f0;
    box-shadow:0 2px 8px rgba(0,0,0,.04); overflow:hidden; margin-bottom:20px; }
  .ad-card-title { font-size:0.95rem; font-weight:700; padding:16px 20px; border-bottom:1px solid #f0f4f8; }
  .ad-table { width:100%; border-collapse:collapse; font-size:0.85rem; }
  .ad-table th { padding:12px 16px; text-align:left; font-size:0.72rem; font-weight:700;
    color:#5e6a85; text-transform:uppercase; letter-spacing:.06em; background:#f8fafc; }
  .ad-table td { padding:14px 16px; border-top:1px solid #f8f9fb; vertical-align:middle; }
  .ad-table tr:hover td { background:#fafbfc; }
  .ad-critical { color:#EF4444; font-weight:700; }
  .ad-select { padding:8px 12px; border:1px solid #e4e9f0; border-radius:8px;
    font-family:inherit; font-size:0.85rem; outline:none; min-width:200px; }
  .ad-btn { padding:7px 14px; border-radius:8px; border:none; font-family:inherit;
    font-size:0.82rem; font-weight:600; cursor:pointer; transition:all .2s; }
  .ad-btn-blue  { background:#1A6EFF; color:#fff; }
  .ad-btn-blue:hover  { background:#0F4ECC; }
  .ad-btn-green { background:#00D68F; color:#0B1A14; }
  .ad-btn-green:hover { background:#00A870; }
  .ad-empty { padding:40px; text-align:center; color:#a0aec0; font-size:0.9rem; }
  .ad-status { font-size:0.72rem; font-weight:600; padding:3px 9px; border-radius:999px; }
  .ad-status-assigned { background:#eff5ff; color:#1A6EFF; }
  .ad-status-transit  { background:#fff7e6; color:#D97706; }
  .ad-status-done     { background:#e6faf3; color:#00A870; }
  .ad-toast { position:fixed; bottom:24px; right:24px; background:#1a2035; color:#fff;
    border-radius:10px; padding:12px 20px; font-size:0.85rem; font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.2); animation:toastIn .3s ease; z-index:9999; }
  @keyframes toastIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  @media (max-width: 700px) {
    .ad-root { padding: 12px; }
    .ad-header h1 { font-size: 1.45rem; }
    .ad-header p  { font-size: 0.82rem; }
    .ad-card-title { padding: 12px 14px; font-size: 0.88rem; }

    .ad-table,
    .ad-table tbody,
    .ad-table tr,
    .ad-table td {
      display: block;
      width: 100%;
    }

    .ad-table thead {
      display: none;
    }

    .ad-table tr {
      margin: 10px;
      border: 1px solid #e8edf5;
      border-radius: 10px;
      background: #fff;
      overflow: hidden;
    }

    .ad-table td {
      border-top: 1px solid #f3f6fb;
      padding: 10px 12px;
      font-size: 0.82rem;
    }

    .ad-table td:first-child {
      border-top: none;
    }

    .ad-table td[data-label]::before {
      content: attr(data-label);
      display: block;
      font-size: 0.68rem;
      font-weight: 700;
      color: #6b7791;
      text-transform: uppercase;
      letter-spacing: .05em;
      margin-bottom: 4px;
    }

    .ad-select {
      width: 100%;
      min-width: 0;
    }

    .ad-btn {
      width: 100%;
      min-height: 38px;
    }

    .ad-toast {
      left: 12px;
      right: 12px;
      bottom: 94px;
      font-size: 0.8rem;
      padding: 10px 12px;
    }
  }
`;

export default function AdminDispatch() {
  const [alerts, setAlerts]           = useState([]);
  const [drivers, setDrivers]         = useState([]);
  const [tasks, setTasks]             = useState([]);
  const [selected, setSelected]       = useState({});
  const [toast, setToast]             = useState("");
  const [loading, setLoading]         = useState(true);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, driversRes, tasksRes] = await Promise.all([
        getAlerts(),
        getApprovedDrivers(),
        getAllTasks(),
      ]);
      setAlerts(alertsRes.data.filter(a => a.severity === "critical" && !a.resolved));
      setDrivers(driversRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useSocket({
  // Driver updated task status → refresh task list
  'task:updated': (task) => {
    setTasks(prev => prev.map(t =>
      (t.id === task.id || t._id === task.id) ? task : t
    ));
  },
 
  // New alert from sensor → add to critical list
  'alert:new': (alert) => {
    if (alert.severity === 'critical') {
      setAlerts(prev => [alert, ...prev]);
    }
  },
});

  const handleAssign = async (containerId, alertId) => {
    const driverId = selected[alertId];
    if (!driverId) return showToast("⚠️ Please select a driver first");

    try {
      await assignTask(driverId, containerId);
      showToast("✅ Task assigned successfully!");
      setAlerts(prev => prev.filter(a => a._id !== alertId));
      fetchData();
    } catch (err) {
      showToast("❌ " + (err.response?.data?.error || "Error assigning task"));
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="ad-root">

        <div className="ad-header">
          <h1>Dispatch Management</h1>
          <p>Assign drivers to critical containers and track active tasks</p>
        </div>

        {/* Critical alerts → assign driver */}
        <div className="ad-card">
          <div className="ad-card-title">🚨 Critical Containers — Assign Driver</div>
          {loading ? (
            <div className="ad-empty">Loading...</div>
          ) : alerts.length === 0 ? (
            <div className="ad-empty">✅ No critical containers right now</div>
          ) : (
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Container</th>
                  <th>Fullness</th>
                  <th>Select Driver</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert._id}>
                    <td data-label="Container" style={{ fontWeight: 600 }}>{alert.containerId}</td>
                    <td data-label="Fullness"><span className="ad-critical">{alert.fullness}%</span></td>
                    <td data-label="Select Driver">
                      <select
                        className="ad-select"
                        onChange={(e) => setSelected({ ...selected, [alert._id]: e.target.value })}
                        defaultValue=""
                      >
                        <option value="" disabled>— Choose Driver —</option>
                        {drivers.map((d) => {
                          const driverId = d.id ?? d._id;
                          const driverEmail = d.user?.email || d.userId?.email || `driver-${driverId}`;
                          return (
                          <option key={driverId} value={driverId}>
                            {driverEmail} · {d.plateNumber || "No plate"}
                          </option>
                        );
                        })}
                      </select>
                    </td>
                    <td data-label="Action">
                      <button
                        className="ad-btn ad-btn-blue"
                        onClick={() => handleAssign(alert.containerId, alert._id)}
                      >
                        Assign Task
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Active tasks */}
        <div className="ad-card">
          <div className="ad-card-title">📋 All Tasks</div>
          {tasks.length === 0 ? (
            <div className="ad-empty">No tasks yet</div>
          ) : (
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Container</th>
                  <th>Driver ID</th>
                  <th>Status</th>
                  <th>Assigned At</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t._id || t.id}>
                    <td data-label="Container" style={{ fontWeight: 600 }}>{t.containerId}</td>
                    <td data-label="Driver ID" style={{ color: "#5e6a85", fontSize: "0.8rem" }}>
                      {t.driverId?.toString().slice(-6) || t.driverId}
                    </td>
                    <td data-label="Status">
                      <span className={`ad-status ${
                        t.status === "assigned"       ? "ad-status-assigned" :
                        t.status === "in_transit"     ? "ad-status-transit"  :
                        t.status === "completed"      ? "ad-status-done"     : "ad-status-assigned"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td data-label="Assigned At" style={{ color: "#5e6a85", fontSize: "0.8rem" }}>
                      {t.assignedAt ? new Date(t.assignedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {toast && <div className="ad-toast">{toast}</div>}
    </>
  );
}