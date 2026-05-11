import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const css = `
  
  .ur-root { min-height:100vh; background:#f0f4f8; font-family:'Geist',sans-serif; color:#1a2035; padding:32px; }
  .ur-wrap { max-width:820px; margin:0 auto; }
  .ur-page-header { margin-bottom:28px; }
  .ur-page-header h1 { font-size:1.9rem; font-weight:800; letter-spacing:-.03em; margin-bottom:4px; }
  .ur-page-header p  { color:#5e6a85; font-size:.9rem; }
  .ur-card { background:#fff; border-radius:14px; border:1px solid #e4e9f0;
    box-shadow:0 2px 8px rgba(0,0,0,.04); overflow:hidden; margin-bottom:16px; }
  .ur-section-head { display:flex; align-items:center; gap:10px;
    padding:18px 24px; border-bottom:1px solid #f0f4f8; }
  .ur-section-icon { width:32px; height:32px; border-radius:8px;
    background:linear-gradient(135deg,#1A6EFF22,#00D68F22);
    display:flex; align-items:center; justify-content:center; font-size:1rem; }
  .ur-section-title { font-size:.95rem; font-weight:700; }
  .ur-section-body  { padding:20px 24px; }
  .ur-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .ur-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
  .ur-col-2  { grid-column:span 2; }
  .ur-field  { display:flex; flex-direction:column; gap:6px; }
  .ur-field label { font-size:.75rem; font-weight:600; color:#5e6a85; text-transform:uppercase; letter-spacing:.04em; }
  .ur-field label span { color:#EF4444; margin-left:2px; }
  .ur-field input, .ur-field select {
    padding:10px 14px; border:1.5px solid #e4e9f0; border-radius:8px;
    font-family:inherit; font-size:.9rem; color:#1a2035; background:#f8fafc;
    outline:none; transition:border-color .2s,box-shadow .2s;
  }
  .ur-field input:focus, .ur-field select:focus {
    border-color:#1A6EFF; background:#fff; box-shadow:0 0 0 3px rgba(26,110,255,.1);
  }
  .ur-field input::placeholder { color:#a0aec0; }
  .ur-field-hint { font-size:.72rem; color:#a0aec0; }
  .ur-waste-types { display:flex; flex-wrap:wrap; gap:8px; padding:4px 0; }
  .ur-waste-type-btn { padding:6px 14px; border-radius:999px; border:1.5px solid #e4e9f0;
    background:#f8fafc; font-family:inherit; font-size:.82rem; font-weight:500;
    color:#5e6a85; cursor:pointer; transition:all .2s; }
  .ur-waste-type-btn.selected { background:#1A6EFF; color:#fff; border-color:#1A6EFF; }
  .ur-submit-card { background:#fff; border-radius:14px; border:1px solid #e4e9f0;
    padding:24px; display:flex; flex-direction:column; gap:16px; }
  .ur-submit-btn { display:inline-flex; align-items:center; gap:8px; padding:12px 28px;
    border-radius:10px; border:none; background:linear-gradient(135deg,#1A6EFF,#00D68F);
    color:#fff; font-family:inherit; font-size:.95rem; font-weight:700;
    cursor:pointer; transition:opacity .2s,transform .2s; align-self:flex-start; }
  .ur-submit-btn:hover { opacity:.9; transform:translateY(-1px); }
  .ur-submit-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
  .ur-note { display:flex; gap:10px; align-items:flex-start; background:#f0f8ff;
    border:1px solid #bfdbfe; border-radius:10px; padding:12px 14px;
    font-size:.82rem; color:#3b82f6; line-height:1.6; }
  .ur-success { text-align:center; padding:60px 20px; }
  .ur-success-icon { font-size:4rem; margin-bottom:16px; }
  .ur-success h2 { font-size:1.4rem; font-weight:800; margin-bottom:8px; }
  .ur-success p  { color:#5e6a85; font-size:.9rem; max-width:400px; margin:0 auto; line-height:1.6; }
  .ur-pending-banner { background:#fff8ec; border:1px solid #fde68a; border-radius:12px;
    padding:20px; text-align:center; margin-bottom:20px; }
  .ur-pending-banner h3 { color:#D97706; font-size:1rem; margin-bottom:6px; }
  .ur-pending-banner p  { color:#92400e; font-size:.85rem; }
  @media(max-width:640px) {
    .ur-root { padding:16px; }
    .ur-grid-2, .ur-grid-3 { grid-template-columns:1fr; }
    .ur-col-2 { grid-column:span 1; }
  }
`;

const WASTE_TYPES = [
  { id: 'A', label: 'Type A — Sharps' },
  { id: 'B', label: 'Type B — Infectious' },
  { id: 'C', label: 'Type C — Pharmaceutical' },
  { id: 'D', label: 'Type D — Chemical' },
];

const METHODS = [
  { value: 'incineration', label: '🔥 Incineration' },
  { value: 'autoclave',    label: '♨️ Autoclave'    },
  { value: 'chemical',     label: '🧪 Chemical'     },
  { value: 'landfill',     label: '🏗 Landfill'     },
];

export default function UtilizerRegistration() {
  const navigate = useNavigate();
  const [existing,  setExisting]  = useState(null);  // existing application
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [dateError, setDateError] = useState("");
  const [form, setForm] = useState({
    stationName:    "",
    stationAddress: "",
    stationLat:     "",
    stationLon:     "",
    licenseNumber:  "",
    licenseExpiry:  "",
    capacity:       "",
    method:         "incineration",
    contactName:    "",
    contactPhone:   "",
  });
  const [wasteTypes, setWasteTypes] = useState([]);

  // Check if already applied
  useEffect(() => {
    api.get("/api/utilizers/my-status")
      .then(res => { if (res.data) setExisting(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (field) => (e) => {
    if (field === "licenseExpiry") {
      const expired = new Date(e.target.value) < new Date();
      setDateError(expired ? "License has already expired!" : "");
    }
    setForm(f => ({ ...f, [field]: e.target.value }));
  };

  const toggleWasteType = (id) => {
    setWasteTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dateError) return;
    try {
      await api.post("/api/utilizers/register", { ...form, wasteTypes });
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.error || "Submission failed");
    }
  };

  if (loading) return null;

  // Already approved
  if (existing?.status === "approved") {
    return (
      <>
        <style>{css}</style>
        <div className="ur-root">
          <div className="ur-wrap">
            <div className="ur-card">
              <div className="ur-success">
                <div className="ur-success-icon">♻️</div>
                <h2>Station Active</h2>
                <p>Your station <strong>{existing.stationName}</strong> is approved and active in the system.</p>
                <button onClick={() => navigate("/dashboard/utilizer")}
                  style={{ marginTop:20, padding:"10px 24px", background:"#1A6EFF", color:"#fff",
                    border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                  Go to Station Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Pending approval
  if (existing?.status === "pending" && !submitted) {
    return (
      <>
        <style>{css}</style>
        <div className="ur-root">
          <div className="ur-wrap">
            <div className="ur-pending-banner">
              <h3>⏳ Application Under Review</h3>
              <p>Your station <strong>{existing.stationName}</strong> is being reviewed by an administrator. You'll receive a notification once it's approved.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Success after submit
  if (submitted) {
    return (
      <>
        <style>{css}</style>
        <div className="ur-root">
          <div className="ur-wrap">
            <div className="ur-card">
              <div className="ur-success">
                <div className="ur-success-icon">⏳</div>
                <h2>Application Submitted!</h2>
                <p>Your station registration is under review. An administrator will verify your license and station details within 24 hours.</p>
                <button onClick={() => navigate("/dashboard")}
                  style={{ marginTop:20, padding:"10px 24px", background:"#1A6EFF", color:"#fff",
                    border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="ur-root">
        <div className="ur-wrap">

          <div className="ur-page-header">
            <h1>Utilizer Registration</h1>
            <p>Register your station for medical waste processing</p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* STATION INFO */}
            <div className="ur-card">
              <div className="ur-section-head">
                <div className="ur-section-icon">🏭</div>
                <span className="ur-section-title">Station Information</span>
              </div>
              <div className="ur-section-body">
                <div className="ur-grid-2">
                  <div className="ur-field ur-col-2">
                    <label>Station Name <span>*</span></label>
                    <input type="text" required placeholder="e.g. Central Medical Waste Processing Center"
                      value={form.stationName} onChange={set("stationName")} />
                  </div>
                  <div className="ur-field ur-col-2">
                    <label>Address <span>*</span></label>
                    <input type="text" required placeholder="Full address"
                      value={form.stationAddress} onChange={set("stationAddress")} />
                  </div>
                  <div className="ur-field">
                    <label>Latitude</label>
                    <input type="number" placeholder="e.g. 51.1694" step="any"
                      value={form.stationLat} onChange={set("stationLat")} />
                    <span className="ur-field-hint">For map display (optional)</span>
                  </div>
                  <div className="ur-field">
                    <label>Longitude</label>
                    <input type="number" placeholder="e.g. 71.4491" step="any"
                      value={form.stationLon} onChange={set("stationLon")} />
                  </div>
                </div>
              </div>
            </div>

            {/* LICENSE */}
            <div className="ur-card">
              <div className="ur-section-head">
                <div className="ur-section-icon">📋</div>
                <span className="ur-section-title">License & Capabilities</span>
              </div>
              <div className="ur-section-body">
                <div className="ur-grid-2">
                  <div className="ur-field">
                    <label>License Number <span>*</span></label>
                    <input type="text" required placeholder="e.g. UTL-2024-001"
                      value={form.licenseNumber} onChange={set("licenseNumber")} />
                  </div>
                  <div className="ur-field">
                    <label>License Expiry <span>*</span></label>
                    <input type="date" required
                      style={{ borderColor: dateError ? "#EF4444" : undefined }}
                      value={form.licenseExpiry} onChange={set("licenseExpiry")} />
                    {dateError && <span className="ur-field-hint" style={{ color:"#EF4444" }}>{dateError}</span>}
                  </div>
                  <div className="ur-field">
                    <label>Daily Capacity (kg)</label>
                    <input type="number" placeholder="e.g. 500"
                      value={form.capacity} onChange={set("capacity")} />
                  </div>
                  <div className="ur-field">
                    <label>Processing Method <span>*</span></label>
                    <select value={form.method} onChange={set("method")}>
                      {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="ur-field ur-col-2">
                    <label>Accepted Waste Types <span>*</span></label>
                    <div className="ur-waste-types">
                      {WASTE_TYPES.map(t => (
                        <button type="button" key={t.id}
                          className={`ur-waste-type-btn ${wasteTypes.includes(t.id) ? "selected" : ""}`}
                          onClick={() => toggleWasteType(t.id)}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* EMERGENCY CONTACT */}
            <div className="ur-card">
              <div className="ur-section-head">
                <div className="ur-section-icon">🆘</div>
                <span className="ur-section-title">Emergency Contact</span>
              </div>
              <div className="ur-section-body">
                <div className="ur-grid-2">
                  <div className="ur-field">
                    <label>Contact Name</label>
                    <input type="text" placeholder="e.g. John Smith"
                      value={form.contactName} onChange={set("contactName")} />
                  </div>
                  <div className="ur-field">
                    <label>Phone Number</label>
                    <input type="tel" placeholder="+7 705 123 4567"
                      value={form.contactPhone} onChange={set("contactPhone")} />
                  </div>
                </div>
              </div>
            </div>

            {/* SUBMIT */}
            <div className="ur-submit-card">
              <button type="submit" className="ur-submit-btn" disabled={!!dateError || wasteTypes.length === 0}>
                ♻️ Submit Station Application
              </button>
              {wasteTypes.length === 0 && (
                <span style={{ fontSize:".8rem", color:"#F59E0B" }}>
                  ⚠ Please select at least one accepted waste type
                </span>
              )}
              <div className="ur-note">
                <span>ℹ</span>
                <span>After submission, an administrator will verify your license and station details. You'll receive a notification once approved. Your role will automatically change to <strong>utilizer</strong>.</span>
              </div>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}