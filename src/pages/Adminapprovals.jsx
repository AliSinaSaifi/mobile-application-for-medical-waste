import React, { useEffect, useState } from "react";
import { getPendingDrivers, updateDriverStatus } from "../services/api";
import api from "../services/api";

const css = `
  
  .ap-root { min-height:100vh; background:#f0f4f8; font-family:'Geist',sans-serif; color:#1a2035; padding:32px; }
  .ap-header { margin-bottom:28px; }
  .ap-header h1 { font-size:1.9rem; font-weight:800; letter-spacing:-.03em; margin-bottom:4px; }
  .ap-header p  { color:#5e6a85; font-size:.9rem; }

  .ap-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
  .ap-stat  { background:#fff; border-radius:12px; border:1px solid #e4e9f0; padding:16px 20px; position:relative; overflow:hidden; }
  .ap-stat::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
  .ap-stat.pending::before  { background:#F59E0B; }
  .ap-stat.approved::before { background:#00D68F; }
  .ap-stat.rejected::before { background:#EF4444; }
  .ap-stat.total::before    { background:#1A6EFF; }
  .ap-stat-label { font-size:.72rem; font-weight:600; color:#5e6a85; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
  .ap-stat-val   { font-size:1.8rem; font-weight:800; color:#1a2035; }

  .ap-tabs { display:flex; gap:4px; background:#e8edf5; border-radius:8px; padding:3px; margin-bottom:20px; width:fit-content; }
  .ap-tab  { padding:7px 20px; border:none; border-radius:6px; background:transparent;
    font-family:inherit; font-size:.85rem; font-weight:500; color:#5e6a85; cursor:pointer; transition:all .2s; }
  .ap-tab.active { background:#fff; color:#1a2035; box-shadow:0 1px 4px rgba(0,0,0,.1); }

  .ap-card { background:#fff; border-radius:14px; border:1px solid #e4e9f0; box-shadow:0 2px 8px rgba(0,0,0,.04); overflow:hidden; }
  .ap-card-head { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #f0f4f8; }
  .ap-card-title { font-size:.95rem; font-weight:700; }
  .ap-card-count { font-size:.78rem; color:#5e6a85; }

  .ap-table { width:100%; border-collapse:collapse; font-size:.84rem; }
  .ap-table th { padding:12px 16px; text-align:left; font-size:.7rem; font-weight:700;
    color:#5e6a85; text-transform:uppercase; letter-spacing:.06em; background:#f8fafc; }
  .ap-table td { padding:14px 16px; border-top:1px solid #f8f9fb; vertical-align:top; }
  .ap-table tr:hover td { background:#fafbfc; }

  .ap-user-cell { display:flex; align-items:center; gap:10px; }
  .ap-avatar { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#1A6EFF,#00D68F);
    display:flex; align-items:center; justify-content:center; font-size:.85rem; font-weight:700; color:#fff; flex-shrink:0; }
  .ap-user-name  { font-weight:600; font-size:.88rem; }
  .ap-user-email { font-size:.72rem; color:#5e6a85; }

  .ap-badge { display:inline-flex; align-items:center; gap:3px; font-size:.7rem; font-weight:700;
    padding:3px 9px; border-radius:999px; }
  .ap-badge-pending  { background:#fff8ec; color:#D97706; }
  .ap-badge-approved { background:#e6faf3; color:#00A870; }
  .ap-badge-rejected { background:#fff0f1; color:#E53E3E; }

  .ap-detail { font-size:.78rem; color:#1a2035; line-height:1.7; }
  .ap-detail span { color:#5e6a85; }

  .ap-actions { display:flex; gap:8px; flex-wrap:wrap; }
  .ap-btn { padding:7px 14px; border-radius:8px; border:none; font-family:inherit;
    font-size:.8rem; font-weight:600; cursor:pointer; transition:all .2s; white-space:nowrap; }
  .ap-btn-approve { background:#00D68F; color:#0B1A14; }
  .ap-btn-approve:hover { background:#00A870; }
  .ap-btn-reject  { background:#fff; color:#EF4444; border:1px solid #fed7d7; }
  .ap-btn-reject:hover  { background:#fff0f1; }
  .ap-btn:disabled { opacity:.5; cursor:not-allowed; }

  .ap-expand-btn { background:none; border:none; color:#1A6EFF; font-family:inherit;
    font-size:.78rem; font-weight:500; cursor:pointer; padding:0; }
  .ap-expand-btn:hover { text-decoration:underline; }

  .ap-detail-panel { background:#f8fafc; border-radius:8px; padding:12px 14px; margin-top:8px;
    font-size:.78rem; line-height:1.8; }
  .ap-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 20px; }
  .ap-detail-row  { display:flex; gap:6px; }
  .ap-detail-key  { color:#5e6a85; min-width:120px; flex-shrink:0; }
  .ap-detail-val  { font-weight:500; color:#1a2035; }

  .ap-empty { padding:60px; text-align:center; color:#a0aec0; }
  .ap-empty-icon { font-size:3rem; margin-bottom:12px; }
  .ap-loading { padding:40px; text-align:center; color:#5e6a85; }

  .ap-toast { position:fixed; bottom:24px; right:24px; background:#1a2035; color:#fff;
    border-radius:10px; padding:12px 20px; font-size:.85rem; font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.2); animation:toastIn .3s ease; z-index:9999; }
  @keyframes toastIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  @media(max-width:900px) {
    .ap-stats { grid-template-columns:repeat(2,1fr); }
    .ap-root  { padding:16px; }
  }

  .ap-root.driver-only .ap-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .ap-root.driver-only .ap-card-title::before {
    content: 'Driver Queue';
    display: inline-block;
    margin-right: 8px;
    font-size: 0.72rem;
    font-weight: 700;
    color: #1A6EFF;
    background: #eff5ff;
    border-radius: 999px;
    padding: 2px 8px;
    vertical-align: middle;
  }

  @media (max-width: 700px) {
    .ap-root.driver-only .ap-stats {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }
`;

export default function AdminApprovals({ driverOnly = false }) {
  const [tab,       setTab]       = useState("drivers");
  const [drivers,   setDrivers]   = useState([]);
  const [utilizers, setUtilizers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState({});
  const [expanded,  setExpanded]  = useState({});
  const [toast,     setToast]     = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchAll = async () => {
    setLoading(true);
    try {
      if (driverOnly) {
        const dRes = await getPendingDrivers();
        setDrivers(dRes.data);
        setUtilizers([]);
      } else {
        const [dRes, uRes] = await Promise.all([
          getPendingDrivers(),
          api.get("/api/utilizers/pending"),
        ]);
        setDrivers(dRes.data);
        setUtilizers(uRes.data);
      }
    } catch (err) {
      showToast("❌ Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Driver action ─────────────────────────────────────────
  const handleDriver = async (id, status) => {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await updateDriverStatus(id, status);
      setDrivers(prev => prev.filter(d => d._id !== id && d.id !== id));
      showToast(status === "approved"
        ? "✅ Driver approved — role updated automatically"
        : "✕ Driver application rejected");
    } catch (err) {
      showToast("❌ " + (err.response?.data?.message || "Action failed"));
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  };

  // ── Utilizer action ───────────────────────────────────────
  const handleUtilizer = async (id, status) => {
    setSaving(s => ({ ...s, [`u_${id}`]: true }));
    try {
      await api.patch(`/api/utilizers/${id}/status`, { status });
      setUtilizers(prev => prev.filter(u => u.id !== id));
      showToast(status === "approved"
        ? "✅ Utilizer approved — role updated automatically"
        : "✕ Utilizer application rejected");
    } catch (err) {
      showToast("❌ " + (err.response?.data?.error || "Action failed"));
    } finally {
      setSaving(s => ({ ...s, [`u_${id}`]: false }));
    }
  };

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  // ── Stats ─────────────────────────────────────────────────
  const totalPending = drivers.length + utilizers.length;

  return (
    <>
      <style>{css}</style>
      <div className={`ap-root ${driverOnly ? "driver-only" : ""}`}>

        {/* HEADER */}
        <div className="ap-header">
          <h1>{driverOnly ? "Driver Approvals" : "Approvals"}</h1>
          <p>{driverOnly
            ? "Review and approve driver applications"
            : "Review and approve driver and utilizer station applications"}
          </p>
        </div>

        {/* STATS */}
        <div className="ap-stats">
          <div className="ap-stat total">
            <div className="ap-stat-label">📋 Total pending</div>
            <div className="ap-stat-val">{totalPending}</div>
          </div>
          <div className="ap-stat pending">
            <div className="ap-stat-label">🚛 Drivers waiting</div>
            <div className="ap-stat-val">{drivers.length}</div>
          </div>
          {!driverOnly && (
            <div className="ap-stat pending">
              <div className="ap-stat-label">♻️ Utilizers waiting</div>
              <div className="ap-stat-val">{utilizers.length}</div>
            </div>
          )}
          <div className="ap-stat approved">
            <div className="ap-stat-label">✅ Auto role update</div>
            <div className="ap-stat-val">On</div>
          </div>
        </div>

        {/* TABS */}
        {!driverOnly && (
          <div className="ap-tabs">
            <button className={`ap-tab ${tab === "drivers" ? "active" : ""}`} onClick={() => setTab("drivers")}>
              🚛 Drivers ({drivers.length})
            </button>
            <button className={`ap-tab ${tab === "utilizers" ? "active" : ""}`} onClick={() => setTab("utilizers")}>
              ♻️ Utilizers ({utilizers.length})
            </button>
          </div>
        )}

        {/* DRIVERS TABLE */}
        {(driverOnly || tab === "drivers") && (
          <div className="ap-card">
            <div className="ap-card-head">
              <span className="ap-card-title">Driver Applications</span>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span className="ap-card-count">{drivers.length} pending</span>
                <button onClick={fetchAll} style={{ padding:"5px 12px", border:"1px solid #e4e9f0",
                  borderRadius:7, background:"#fff", cursor:"pointer", fontSize:".78rem" }}>🔄</button>
              </div>
            </div>

            {loading ? (
              <div className="ap-loading">⏳ Loading…</div>
            ) : drivers.length === 0 ? (
              <div className="ap-empty">
                <div className="ap-empty-icon">🎉</div>
                <p>No pending driver applications</p>
              </div>
            ) : (
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>License</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(d => {
                    const id    = d._id || d.id;
                    const email = d.userId?.email || d.email || "—";
                    const name  = d.userId?.fullName || email.split("@")[0];

                    return (
                      <React.Fragment key={id}>
                        <tr>
                          {/* Applicant */}
                          <td>
                            <div className="ap-user-cell">
                              <div className="ap-avatar">{name.charAt(0).toUpperCase()}</div>
                              <div>
                                <div className="ap-user-name">{name}</div>
                                <div className="ap-user-email">{email}</div>
                              </div>
                            </div>
                          </td>

                          {/* License */}
                          <td>
                            <div className="ap-detail">
                              <div><span>№ </span>{d.licenseNumber}</div>
                              <div><span>Exp: </span>{d.licenseExpiry ? new Date(d.licenseExpiry).toLocaleDateString() : "—"}</div>
                              <div><span>Company: </span>{d.company || "—"}</div>
                            </div>
                          </td>

                          {/* Vehicle */}
                          <td>
                            <div className="ap-detail">
                              <div>{d.vehicleModel || "—"} {d.vehicleYear ? `(${d.vehicleYear})` : ""}</div>
                              <div><span>Plate: </span>{d.plateNumber || "—"}</div>
                              <div><span>Capacity: </span>{d.capacity ? `${d.capacity} kg` : "—"}</div>
                            </div>
                            <button className="ap-expand-btn" onClick={() => toggleExpand(id)}>
                              {expanded[id] ? "▲ Hide details" : "▼ More details"}
                            </button>
                          </td>

                          {/* Status */}
                          <td><span className="ap-badge ap-badge-pending">⏳ Pending</span></td>

                          {/* Actions */}
                          <td>
                            <div className="ap-actions">
                              <button className="ap-btn ap-btn-approve"
                                disabled={saving[id]}
                                onClick={() => handleDriver(id, "approved")}>
                                {saving[id] ? "…" : "✓ Approve"}
                              </button>
                              <button className="ap-btn ap-btn-reject"
                                disabled={saving[id]}
                                onClick={() => handleDriver(id, "rejected")}>
                                ✕ Reject
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded details */}
                        {expanded[id] && (
                          <tr>
                            <td colSpan={5} style={{ padding:"0 16px 14px", borderTop:"none" }}>
                              <div className="ap-detail-panel">
                                <div style={{ fontWeight:600, marginBottom:8, fontSize:".8rem" }}>Emergency Contact</div>
                                <div className="ap-detail-grid">
                                  <div className="ap-detail-row">
                                    <span className="ap-detail-key">Name:</span>
                                    <span className="ap-detail-val">{d.emergencyContact?.name || "—"}</span>
                                  </div>
                                  <div className="ap-detail-row">
                                    <span className="ap-detail-key">Phone:</span>
                                    <span className="ap-detail-val">{d.emergencyContact?.phone || "—"}</span>
                                  </div>
                                  <div className="ap-detail-row">
                                    <span className="ap-detail-key">Relation:</span>
                                    <span className="ap-detail-val">{d.emergencyContact?.relation || "—"}</span>
                                  </div>
                                  <div className="ap-detail-row">
                                    <span className="ap-detail-key">Applied:</span>
                                    <span className="ap-detail-val">{d.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* UTILIZERS TABLE */}
        {!driverOnly && tab === "utilizers" && (
          <div className="ap-card">
            <div className="ap-card-head">
              <span className="ap-card-title">Utilizer Station Applications</span>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span className="ap-card-count">{utilizers.length} pending</span>
                <button onClick={fetchAll} style={{ padding:"5px 12px", border:"1px solid #e4e9f0",
                  borderRadius:7, background:"#fff", cursor:"pointer", fontSize:".78rem" }}>🔄</button>
              </div>
            </div>

            {loading ? (
              <div className="ap-loading">⏳ Loading…</div>
            ) : utilizers.length === 0 ? (
              <div className="ap-empty">
                <div className="ap-empty-icon">🎉</div>
                <p>No pending utilizer applications</p>
              </div>
            ) : (
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Station</th>
                    <th>License & Capacity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizers.map(u => {
                    const id    = u.id;
                    const email = u.user?.email || "—";
                    const name  = u.user?.fullName || email.split("@")[0];

                    return (
                      <React.Fragment key={id}>
                        <tr>
                          {/* Applicant */}
                          <td>
                            <div className="ap-user-cell">
                              <div className="ap-avatar">{name.charAt(0).toUpperCase()}</div>
                              <div>
                                <div className="ap-user-name">{name}</div>
                                <div className="ap-user-email">{email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Station */}
                          <td>
                            <div className="ap-detail">
                              <div style={{ fontWeight:600 }}>{u.stationName}</div>
                              <div><span>Address: </span>{u.stationAddress}</div>
                              <div><span>Method: </span>{u.method}</div>
                            </div>
                          </td>

                          {/* License */}
                          <td>
                            <div className="ap-detail">
                              <div><span>№ </span>{u.licenseNumber}</div>
                              <div><span>Exp: </span>{u.licenseExpiry ? new Date(u.licenseExpiry).toLocaleDateString() : "—"}</div>
                              <div><span>Capacity: </span>{u.capacity ? `${u.capacity} kg/day` : "—"}</div>
                              <div><span>Waste types: </span>{(u.wasteTypes || []).join(", ") || "—"}</div>
                            </div>
                            <button className="ap-expand-btn" onClick={() => toggleExpand(`u_${id}`)}>
                              {expanded[`u_${id}`] ? "▲ Hide" : "▼ More"}
                            </button>
                          </td>

                          {/* Status */}
                          <td><span className="ap-badge ap-badge-pending">⏳ Pending</span></td>

                          {/* Actions */}
                          <td>
                            <div className="ap-actions">
                              <button className="ap-btn ap-btn-approve"
                                disabled={saving[`u_${id}`]}
                                onClick={() => handleUtilizer(id, "approved")}>
                                {saving[`u_${id}`] ? "…" : "✓ Approve"}
                              </button>
                              <button className="ap-btn ap-btn-reject"
                                disabled={saving[`u_${id}`]}
                                onClick={() => handleUtilizer(id, "rejected")}>
                                ✕ Reject
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded contact */}
                        {expanded[`u_${id}`] && (
                          <tr>
                            <td colSpan={5} style={{ padding:"0 16px 14px", borderTop:"none" }}>
                              <div className="ap-detail-panel">
                                <div style={{ fontWeight:600, marginBottom:8, fontSize:".8rem" }}>Contact & Location</div>
                                <div className="ap-detail-grid">
                                  <div className="ap-detail-row">
                                    <span className="ap-detail-key">Contact:</span>
                                    <span className="ap-detail-val">{u.contactName || "—"}</span>
                                  </div>
                                  <div className="ap-detail-row">
                                    <span className="ap-detail-key">Phone:</span>
                                    <span className="ap-detail-val">{u.contactPhone || "—"}</span>
                                  </div>
                                  <div className="ap-detail-row">
                                    <span className="ap-detail-key">Coordinates:</span>
                                    <span className="ap-detail-val">
                                      {u.stationLat && u.stationLon ? `${u.stationLat}, ${u.stationLon}` : "Not set"}
                                    </span>
                                  </div>
                                  <div className="ap-detail-row">
                                    <span className="ap-detail-key">Applied:</span>
                                    <span className="ap-detail-val">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      {toast && <div className="ap-toast">{toast}</div>}
    </>
  );
}