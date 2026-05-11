import React, { useEffect, useState } from "react";
import { getUsers, updateUserRole } from "../services/api";


const css = `
  @import url('https://cdn.jsdelivr.net/npm/geist@1.3.0/dist/fonts/geist-sans/style.css');

  .au-root { min-height:100vh; background:#f0f4f8; font-family:'Geist',sans-serif; color:#1a2035; padding:32px; }
  .au-header { margin-bottom:28px; }
  .au-header h1 { font-size:1.9rem; font-weight:800; letter-spacing:-.03em; margin-bottom:4px; }
  .au-header p  { color:#5e6a85; font-size:.9rem; }

  .au-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
  .au-stat  { background:#fff; border-radius:12px; border:1px solid #e4e9f0; padding:16px 20px;
    position:relative; overflow:hidden; }
  .au-stat::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
  .au-stat.admin::before    { background:#8B5CF6; }
  .au-stat.personnel::before{ background:#1A6EFF; }
  .au-stat.driver::before   { background:#00D68F; }
  .au-stat.utilizer::before { background:#F59E0B; }
  .au-stat-label { font-size:.72rem; font-weight:600; color:#5e6a85; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
  .au-stat-val   { font-size:1.8rem; font-weight:800; color:#1a2035; }

  .au-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
  .au-search { flex:1; min-width:200px; padding:9px 14px; border:1.5px solid #e4e9f0; border-radius:8px;
    font-family:inherit; font-size:.88rem; outline:none; background:#fff; transition:border-color .2s; }
  .au-search:focus { border-color:#1A6EFF; }
  .au-filter-btn { padding:8px 14px; border-radius:8px; border:1px solid #e4e9f0;
    background:#fff; font-family:inherit; font-size:.82rem; font-weight:500; color:#5e6a85;
    cursor:pointer; transition:all .2s; white-space:nowrap; }
  .au-filter-btn:hover { background:#f0f4f8; }
  .au-filter-btn.active { background:#1A6EFF; color:#fff; border-color:#1A6EFF; }

  .au-card { background:#fff; border-radius:14px; border:1px solid #e4e9f0;
    box-shadow:0 2px 8px rgba(0,0,0,.04); overflow:hidden; }
  .au-card-head { display:flex; justify-content:space-between; align-items:center;
    padding:16px 20px; border-bottom:1px solid #f0f4f8; }
  .au-card-title { font-size:.95rem; font-weight:700; }
  .au-card-count { font-size:.78rem; color:#5e6a85; }

  .au-table { width:100%; border-collapse:collapse; font-size:.85rem; }
  .au-table th { padding:12px 16px; text-align:left; font-size:.7rem; font-weight:700;
    color:#5e6a85; text-transform:uppercase; letter-spacing:.06em; background:#f8fafc; }
  .au-table td { padding:14px 16px; border-top:1px solid #f8f9fb; vertical-align:middle; }
  .au-table tr:hover td { background:#fafbfc; }

  .au-avatar { width:32px; height:32px; border-radius:50%;
    background:linear-gradient(135deg,#1A6EFF,#00D68F);
    display:flex; align-items:center; justify-content:center;
    font-size:.8rem; font-weight:700; color:#fff; flex-shrink:0; }
  .au-user-cell { display:flex; align-items:center; gap:10px; }
  .au-user-name  { font-weight:600; font-size:.88rem; }
  .au-user-email { font-size:.72rem; color:#5e6a85; }

  .au-role-badge { display:inline-flex; align-items:center; gap:4px;
    font-size:.72rem; font-weight:700; padding:3px 10px; border-radius:999px; }
  .au-role-admin     { background:#f3f0ff; color:#7C3AED; }
  .au-role-personnel { background:#eff5ff; color:#1A6EFF; }
  .au-role-driver    { background:#e6faf3; color:#00A870; }
  .au-role-utilizer  { background:#fff8ec; color:#D97706; }

  .au-role-select { padding:6px 10px; border:1.5px solid #e4e9f0; border-radius:8px;
    font-family:inherit; font-size:.82rem; color:#1a2035; background:#f8fafc;
    outline:none; cursor:pointer; transition:border-color .2s; }
  .au-role-select:focus { border-color:#1A6EFF; }

  .au-save-btn { padding:6px 14px; border-radius:8px; border:none;
    background:#1A6EFF; color:#fff; font-family:inherit; font-size:.8rem;
    font-weight:600; cursor:pointer; transition:all .2s; }
  .au-save-btn:hover { background:#0F4ECC; }
  .au-save-btn:disabled { opacity:.5; cursor:not-allowed; }
  .au-save-btn.saved { background:#00D68F; color:#0B1A14; }

  .au-empty { padding:60px; text-align:center; color:#a0aec0; font-size:.9rem; }
  .au-loading { padding:40px; text-align:center; color:#5e6a85; }

  .au-toast { position:fixed; bottom:24px; right:24px; background:#1a2035; color:#fff;
    border-radius:10px; padding:12px 20px; font-size:.85rem; font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.2); animation:toastIn .3s ease; z-index:9999; }
  @keyframes toastIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  .au-avail-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:5px; }
  .au-avail-yes { background:#00D68F; }
  .au-avail-no  { background:#e4e9f0; }

  @media(max-width:800px) {
    .au-stats { grid-template-columns:repeat(2,1fr); }
    .au-root  { padding:16px; }
  }

  @media (max-width: 700px) {
    .au-header h1 { font-size: 1.45rem; }
    .au-header p  { font-size: .82rem; }

    .au-stats {
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }

    .au-stat {
      padding: 12px;
    }

    .au-stat-val {
      font-size: 1.45rem;
    }

    .au-toolbar {
      gap: 8px;
    }

    .au-search {
      min-width: 100%;
      width: 100%;
    }

    .au-filter-btn {
      font-size: .76rem;
      padding: 7px 10px;
    }

    .au-card-head {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 12px 14px;
    }

    .au-table,
    .au-table tbody,
    .au-table tr,
    .au-table td {
      display: block;
      width: 100%;
    }

    .au-table thead {
      display: none;
    }

    .au-table tr {
      margin: 10px;
      border: 1px solid #e8edf5;
      border-radius: 10px;
      background: #fff;
      overflow: hidden;
    }

    .au-table td {
      border-top: 1px solid #f3f6fb;
      padding: 10px 12px;
    }

    .au-table td:first-child {
      border-top: none;
    }

    .au-table td[data-label]::before {
      content: attr(data-label);
      display: block;
      font-size: .68rem;
      font-weight: 700;
      color: #6b7791;
      text-transform: uppercase;
      letter-spacing: .05em;
      margin-bottom: 4px;
    }

    .au-user-cell {
      align-items: flex-start;
    }

    .au-role-select,
    .au-save-btn {
      width: 100%;
      min-height: 38px;
    }

    .au-toast {
      left: 12px;
      right: 12px;
      bottom: 94px;
      font-size: .8rem;
      padding: 10px 12px;
    }
  }
`;

const ROLES = ['admin', 'personnel', 'driver', 'utilizer'];

const ROLE_ICONS = {
  admin:     '🛡️',
  personnel: '👤',
  driver:    '🚛',
  utilizer:  '♻️',
};

export default function AdminUsers() {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState("all");
  const [pendingRole, setPendingRole] = useState({}); // {userId: newRole}
  const [saving,      setSaving]      = useState({}); // {userId: bool}
  const [toast,       setToast]       = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) {
      showToast("❌ Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = (userId, newRole) => {
    setPendingRole(p => ({ ...p, [userId]: newRole }));
  };

  const handleSave = async (userId) => {
    const newRole = pendingRole[userId];
    if (!newRole) return;

    setSaving(s => ({ ...s, [userId]: true }));
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setPendingRole(p => { const copy = { ...p }; delete copy[userId]; return copy; });
      showToast(`✅ Role updated to ${newRole}`);
    } catch (err) {
      showToast("❌ " + (err.response?.data?.error || "Failed to update role"));
    } finally {
      setSaving(s => ({ ...s, [userId]: false }));
    }
  };

  // ── Filter ─────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // ── Role counts ────────────────────────────────────────────
  const counts = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  return (
    <>
      <style>{css}</style>
      <div className="au-root">

        {/* HEADER */}
        <div className="au-header">
          <h1>Users & Roles</h1>
          <p>Manage user accounts and assign roles across the system</p>
        </div>

        {/* STATS */}
        <div className="au-stats">
          {ROLES.map(r => (
            <div key={r} className={`au-stat ${r}`}>
              <div className="au-stat-label">{ROLE_ICONS[r]} {r}</div>
              <div className="au-stat-val">{counts[r] ?? 0}</div>
            </div>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="au-toolbar">
          <input
            className="au-search"
            placeholder="🔍  Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className={`au-filter-btn ${roleFilter === "all" ? "active" : ""}`}
            onClick={() => setRoleFilter("all")}>All</button>
          {ROLES.map(r => (
            <button key={r}
              className={`au-filter-btn ${roleFilter === r ? "active" : ""}`}
              onClick={() => setRoleFilter(r)}>
              {ROLE_ICONS[r]} {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
          <button className="au-filter-btn" onClick={fetchUsers}>🔄 Refresh</button>
        </div>

        {/* TABLE */}
        <div className="au-card">
          <div className="au-card-head">
            <span className="au-card-title">All Users</span>
            <span className="au-card-count">Showing {filtered.length} of {users.length}</span>
          </div>

          {loading ? (
            <div className="au-loading">⏳ Loading users…</div>
          ) : filtered.length === 0 ? (
            <div className="au-empty">No users found</div>
          ) : (
            <table className="au-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Current Role</th>
                  <th>Available</th>
                  <th>Joined</th>
                  <th>Change Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const currentRole = u.role;
                  const selected    = pendingRole[u.id] ?? currentRole;
                  const changed     = pendingRole[u.id] && pendingRole[u.id] !== currentRole;

                  return (
                    <tr key={u.id}>
                      {/* User */}
                      <td data-label="User">
                        <div className="au-user-cell">
                          <div className="au-avatar">
                            {(u.fullName || u.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="au-user-name">{u.fullName || "—"}</div>
                            <div className="au-user-email">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Current role */}
                      <td data-label="Current Role">
                        <span className={`au-role-badge au-role-${currentRole}`}>
                          {ROLE_ICONS[currentRole]} {currentRole}
                        </span>
                      </td>

                      {/* Available */}
                      <td data-label="Available">
                        <span className={`au-avail-dot ${u.isAvailable ? "au-avail-yes" : "au-avail-no"}`} />
                        {u.isAvailable ? "Yes" : "No"}
                      </td>

                      {/* Joined */}
                      <td data-label="Joined" style={{ color:"#5e6a85", fontSize:".78rem" }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>

                      {/* Role select */}
                      <td data-label="Change Role">
                        <select
                          className="au-role-select"
                          value={selected}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>
                              {ROLE_ICONS[r]} {r}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Save */}
                      <td data-label="Save">
                        <button
                          className={`au-save-btn ${!changed ? "saved" : ""}`}
                          disabled={!changed || saving[u.id]}
                          onClick={() => handleSave(u.id)}
                        >
                          {saving[u.id] ? "Saving…" : changed ? "Save" : "✓"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {toast && <div className="au-toast">{toast}</div>}
    </>
  );
}