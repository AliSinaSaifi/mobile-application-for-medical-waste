import React, { useEffect, useState } from "react";
import {
  changePassword,
  getProfile,
  sendPhoneCode,
  updateProfile,
  verifyPhoneCode,
} from "../services/api";

const css = `
  

  .pf-root {
    min-height: 100vh;
    background: #f0f4f8;
    font-family: 'Geist', 'DM Sans', sans-serif;
    color: #1a2035;
    padding: 32px;
  }

  .pf-wrap { max-width: 760px; margin: 0 auto; }

  /* PAGE HEADER */
  .pf-page-header { margin-bottom: 28px; }
  .pf-page-header h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
  .pf-page-header p  { color: #5e6a85; font-size: 0.9rem; }

  /* CARD */
  .pf-card {
    background: #fff; border-radius: 14px;
    border: 1px solid #e4e9f0;
    box-shadow: 0 2px 8px rgba(0,0,0,.04);
    overflow: hidden; margin-bottom: 16px;
  }
  .pf-card-head {
    display: flex; align-items: center; gap: 10px;
    padding: 18px 24px; border-bottom: 1px solid #f0f4f8;
  }
  .pf-card-icon {
    width: 32px; height: 32px; border-radius: 8px;
    background: linear-gradient(135deg,#1A6EFF22,#00D68F22);
    display: flex; align-items: center; justify-content: center; font-size: 1rem;
  }
  .pf-card-title { font-size: 0.95rem; font-weight: 700; }
  .pf-card-sub   { font-size: 0.78rem; color: #5e6a85; margin-top: 1px; }
  .pf-card-body  { padding: 22px 24px; }

  /* AVATAR ROW */
  .pf-avatar-row {
    display: flex; align-items: center; gap: 18px; margin-bottom: 24px;
    padding-bottom: 20px; border-bottom: 1px solid #f0f4f8;
  }
  .pf-avatar {
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg, #1A6EFF, #00D68F);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.6rem; font-weight: 800; color: #fff; flex-shrink: 0;
  }
  .pf-avatar-info h2 { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
  .pf-avatar-badges  { display: flex; gap: 6px; flex-wrap: wrap; }
  .pf-badge {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 0.7rem; font-weight: 600; padding: 3px 8px; border-radius: 999px;
  }
  .pf-badge-blue   { background: #eff5ff; color: #1A6EFF; }
  .pf-badge-orange { background: #fff7e6; color: #D97706; }
  .pf-badge-green  { background: #e6faf3; color: #00A870; }
  .pf-badge-ghost  { background: #eef2f7; color: #46556f; }

  /* STATS ROW */
  .pf-stats-row {
    display: grid; grid-template-columns: repeat(4,1fr);
    gap: 0; margin-bottom: 22px;
    background: #f8fafc; border-radius: 10px; overflow: hidden;
    border: 1px solid #e4e9f0;
  }
  .pf-stat-item {
    padding: 12px 14px; text-align: center;
    border-right: 1px solid #e4e9f0;
  }
  .pf-stat-item:last-child { border-right: none; }
  .pf-stat-label { font-size: 0.68rem; font-weight: 600; color: #5e6a85; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
  .pf-stat-val   { font-size: 0.88rem; font-weight: 700; color: #1a2035; }

  /* FORM */
  .pf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .pf-col-2  { grid-column: span 2; }
  .pf-field  { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
  .pf-field label {
    font-size: 0.75rem; font-weight: 600; color: #5e6a85;
    text-transform: uppercase; letter-spacing: .04em;
  }
  .pf-field input,
  .pf-field select {
    padding: 10px 14px; border: 1.5px solid #e4e9f0; border-radius: 8px;
    font-family: inherit; font-size: 0.9rem; color: #1a2035;
    background: #f8fafc; outline: none;
    width: 100%; min-width: 0; box-sizing: border-box;
    transition: border-color .2s, background .2s, box-shadow .2s;
  }
  .pf-field input:focus,
  .pf-field select:focus {
    border-color: #1A6EFF; background: #fff;
    box-shadow: 0 0 0 3px rgba(26,110,255,.1);
  }
  .pf-field input::placeholder { color: #a0aec0; }
  .pf-field-hint { font-size: 0.72rem; color: #a0aec0; margin-top: 2px; }

  /* PROFILE INFORMATION STACK */
  .pf-profile-stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pf-profile-row {
    width: 100%;
  }

  /* BUTTONS */
  .pf-btn {
    padding: 10px 22px; border-radius: 8px; border: none;
    font-family: inherit; font-size: 0.88rem; font-weight: 600;
    cursor: pointer; transition: all .2s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .pf-btn-primary { background: #1A6EFF; color: #fff; }
  .pf-btn-primary:hover { background: #0F4ECC; transform: translateY(-1px); }
  .pf-btn-ghost   { background: #f0f4f8; color: #1a2035; border: 1px solid #e4e9f0; }
  .pf-btn-ghost:hover { background: #e4e9f0; }
  .pf-btn-green   { background: #00D68F; color: #0B1A14; }
  .pf-btn-green:hover { background: #00A870; }
  .pf-btn-red     { background: #fff0f1; color: #E53E3E; border: 1px solid #fed7d7; }
  .pf-btn-red:hover { background: #fed7d7; }
  .pf-btn-row     { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }

  /* PASSWORD STRENGTH */
  .pf-pw-strength { margin-top: 6px; }
  .pf-pw-bars { display: flex; gap: 3px; margin-bottom: 3px; }
  .pf-pw-bar  { flex: 1; height: 3px; border-radius: 99px; background: #e4e9f0; transition: background .3s; }
  .pf-pw-bar.fill-weak   { background: #EF4444; }
  .pf-pw-bar.fill-medium { background: #F59E0B; }
  .pf-pw-bar.fill-strong { background: #00D68F; }
  .pf-pw-label { font-size: 0.7rem; color: #5e6a85; }

  /* PHONE VERIFICATION */
  .pf-phone-status {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px; border-radius: 8px; margin-bottom: 16px;
    font-size: 0.82rem; font-weight: 600;
  }
  .pf-phone-unverified { background: #fff7e6; color: #D97706; border: 1px solid #fde68a; }
  .pf-phone-verified   { background: #e6faf3; color: #00A870; border: 1px solid #6ee7b7; }
  .pf-phone-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: end;
  }
  .pf-phone-row .pf-field { margin-bottom: 0; }
  .pf-phone-action { margin-bottom: 22px; }

  /* SUCCESS TOAST */
  .pf-toast {
    position: fixed; bottom: 24px; right: 24px;
    background: #1a2035; color: #fff; border-radius: 10px;
    padding: 12px 20px; font-size: 0.85rem; font-weight: 500;
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,.2);
    animation: toastIn .3s ease;
    z-index: 9999;
  }
  @keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

  @media (max-width: 640px) {
    .pf-root { padding: 16px; }
    .pf-grid-2 { grid-template-columns: 1fr; }
    .pf-col-2  { grid-column: span 1; }
    .pf-stats-row { grid-template-columns: repeat(2,1fr); }
    .pf-avatar-row { flex-direction: column; align-items: flex-start; }
    .pf-btn-row .pf-btn { width: 100%; justify-content: center; }
    .pf-phone-row { grid-template-columns: 1fr; align-items: stretch; }
    .pf-phone-action { width: 100%; margin-bottom: 0; }
  }
`;

function pwStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function Profile() {
  const email = sessionStorage.getItem("mw_user") || "user@example.com";
  const fallbackUsername = (sessionStorage.getItem("mw_name") || email.split("@")[0] || "user").trim();

  const [profile, setProfile] = useState({
    username: fallbackUsername,
    fullName: sessionStorage.getItem("mw_name") || '',
    email,
    department: "",
    role: sessionStorage.getItem("mw_role") || "user",
  });
  const [security, setSecurity] = useState({ current: "", newPw: "", confirm: "" });
  const [phone, setPhone] = useState({ number: "", code: "", sent: false, verified: false });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        const { data } = await getProfile();
        if (!mounted) return;

        const nextUsername = (data.username || fallbackUsername).trim();
        const nextFullName = (data.fullName || sessionStorage.getItem('mw_name') || '').trim();

        setProfile({
          username: nextUsername,
          fullName: nextFullName,
          email: data.email || email,
          department: data.department || "",
          role: data.role || sessionStorage.getItem("mw_role") || "user",
        });

        setPhone((prev) => ({
          ...prev,
          number: data.phone?.number || "",
          verified: Boolean(data.phone?.verified),
          sent: false,
          code: "",
        }));

        sessionStorage.setItem("mw_name", nextFullName || nextUsername);
        sessionStorage.setItem("mw_username", nextUsername);
      } catch (err) {
        if (mounted) {
          showToast(`✕ ${err.response?.data?.error || "Failed to load profile"}`);
        }
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();

    try {
      setSavingProfile(true);
      const { data } = await updateProfile({
        fullName: profile.fullName,
        username: profile.username,
        department: profile.department,
      });

      const updatedUsername = (data.profile?.username || profile.username).trim();
      const updatedFullName = (data.profile?.fullName || profile.fullName).trim();
      setProfile((p) => ({
        ...p,
        username: updatedUsername,
        fullName: updatedFullName,
        department: data.profile?.department || "",
      }));
      sessionStorage.setItem("mw_name", updatedFullName || updatedUsername);
      sessionStorage.setItem("mw_username", updatedUsername);

      showToast("✓ Profile updated successfully");
    } catch (err) {
      showToast(`✕ ${err.response?.data?.error || "Failed to update profile"}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (security.newPw !== security.confirm) { showToast("✕ Passwords do not match"); return; }
    if (security.newPw.length < 8) { showToast("✕ Password must be at least 8 characters"); return; }

    try {
      setSavingPassword(true);
      await changePassword(security.current, security.newPw, security.confirm);
      showToast("✓ Password changed successfully");
      setSecurity({ current: "", newPw: "", confirm: "" });
    } catch (err) {
      showToast(`✕ ${err.response?.data?.error || "Failed to change password"}`);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSendCode = async () => {
    try {
      setSendingCode(true);
      await sendPhoneCode(phone.number);
      setPhone((p) => ({ ...p, sent: true, verified: false }));
      showToast("📱 Verification code sent");
    } catch (err) {
      showToast(`✕ ${err.response?.data?.error || "Failed to send code"}`);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifyingCode(true);
      await verifyPhoneCode(phone.code);
      setPhone((p) => ({ ...p, verified: true, sent: false, code: "" }));
      showToast("✓ Phone verified!");
    } catch (err) {
      showToast(`✕ ${err.response?.data?.error || "Failed to verify phone"}`);
    } finally {
      setVerifyingCode(false);
    }
  };

  const strength      = pwStrength(security.newPw);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "fill-weak", "fill-medium", "fill-medium", "fill-strong"][strength];

  return (
    <>
      <style>{css}</style>
      <div className="pf-root">
        <div className="pf-wrap">

          {/* PAGE HEADER */}
          <div className="pf-page-header">
            <h1>My Profile</h1>
            <p>Update your personal information and verify your phone number</p>
          </div>

          {/* AVATAR CARD */}
          <div className="pf-card">
            <div className="pf-card-body">
              <div className="pf-avatar-row">
                <div className="pf-avatar">{(profile.fullName || profile.username || fallbackUsername).charAt(0).toUpperCase()}</div>
                <div className="pf-avatar-info">
                  <h2>{profile.fullName || profile.username || fallbackUsername}</h2>
                  <div className="pf-avatar-badges">
                    <span className="pf-badge pf-badge-blue">Role: {profile.role || "user"}</span>
                    {profile.username && (
                      <span className="pf-badge pf-badge-ghost">@{profile.username}</span>
                    )}
                    <span className={`pf-badge ${phone.verified ? "pf-badge-green" : "pf-badge-orange"}`}>
                      {phone.verified ? "✓ Phone verified" : "⚠ Phone unverified"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pf-stats-row">
                {[
                  { label: "Email",      val: profile.email || email },
                  { label: "Phone",      val: phone.number || "—" },
                  { label: "Department", val: profile.department || "—" },
                  { label: "Status",     val: "Active" },
                ].map((s) => (
                  <div className="pf-stat-item" key={s.label}>
                    <div className="pf-stat-label">{s.label}</div>
                    <div className="pf-stat-val" style={{ fontSize: s.label === "Email" ? "0.72rem" : undefined }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PROFILE INFO */}
          <div className="pf-card">
            <div className="pf-card-head">
              <div className="pf-card-icon">👤</div>
              <div>
                <div className="pf-card-title">Profile Information</div>
                <div className="pf-card-sub">Update your personal details</div>
              </div>
            </div>
            <div className="pf-card-body">
              <form onSubmit={handleProfileSave}>
                <div className="pf-profile-stack">
                  <div className="pf-field pf-profile-row">
                    <label>Full Name</label>
                    <input
                      type="text" placeholder="John Smith"
                      value={profile.fullName}
                      disabled={loadingProfile || savingProfile}
                      onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                    />
                    <span className="pf-field-hint">Your display name (spaces allowed)</span>
                  </div>
                  <div className="pf-field pf-profile-row">
                    <label>Username</label>
                    <input
                      type="text" placeholder="your_username"
                      value={profile.username}
                      disabled={loadingProfile || savingProfile}
                      onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                    />
                    <span className="pf-field-hint">3–30 characters: letters, numbers, underscores, hyphens</span>
                  </div>
                  <div className="pf-field pf-profile-row">
                    <label>Email</label>
                    <input type="email" value={profile.email} readOnly
                      style={{ background: "#f0f4f8", cursor: "not-allowed", color: "#5e6a85" }} />
                  </div>
                  <div className="pf-field pf-profile-row">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={phone.number || "Not set"}
                      readOnly
                      style={{ background: "#f0f4f8", cursor: "not-allowed", color: "#5e6a85" }}
                    />
                  </div>
                  <div className="pf-field pf-profile-row">
                    <label>Role</label>
                    <input
                      type="text"
                      value={profile.role || "user"}
                      readOnly
                      style={{ background: "#f0f4f8", cursor: "not-allowed", color: "#5e6a85", textTransform: "capitalize" }}
                    />
                  </div>
                  <div className="pf-field pf-profile-row">
                    <label>Department</label>
                    <select
                      value={profile.department}
                      disabled={loadingProfile || savingProfile}
                      onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}
                    >
                      <option value="">Select department</option>
                      <option value="surgery">Surgery Department</option>
                      <option value="therapy">Therapy Department</option>
                      <option value="pediatrics">Pediatrics Department</option>
                      <option value="obstetrics">Obstetrics Department</option>
                      <option value="infectious">Infectious Disease Department</option>
                      <option value="lab">Laboratory</option>
                      <option value="icu">ICU / Intensive Care</option>
                    </select>
                  </div>
                </div>
                <div className="pf-btn-row">
                  <button type="submit" className="pf-btn pf-btn-primary" disabled={loadingProfile || savingProfile}>
                    {savingProfile ? "Saving..." : " Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* SECURITY */}
          <div className="pf-card">
            <div className="pf-card-head">
              <div className="pf-card-icon">🔒</div>
              <div>
                <div className="pf-card-title">Security Settings</div>
                <div className="pf-card-sub">Update your password</div>
              </div>
            </div>
            <div className="pf-card-body">
              <form onSubmit={handlePasswordSave}>
                <div className="pf-grid-2">
                  <div className="pf-field pf-col-2">
                    <label>Current Password</label>
                    <input type="password" placeholder="••••••••"
                      value={security.current}
                      disabled={savingPassword}
                      onChange={e => setSecurity(s => ({ ...s, current: e.target.value }))} />
                  </div>
                  <div className="pf-field">
                    <label>New Password</label>
                    <input type="password" placeholder="••••••••"
                      value={security.newPw}
                      disabled={savingPassword}
                      onChange={e => setSecurity(s => ({ ...s, newPw: e.target.value }))} />
                    {security.newPw && (
                      <div className="pf-pw-strength">
                        <div className="pf-pw-bars">
                          {[1,2,3,4].map(i => (
                            <div key={i} className={`pf-pw-bar ${i <= strength ? strengthColor : ""}`} />
                          ))}
                        </div>
                        <span className="pf-pw-label">{strengthLabel} — min 8 characters including letters and numbers</span>
                      </div>
                    )}
                  </div>
                  <div className="pf-field">
                    <label>Confirm New Password</label>
                    <input type="password" placeholder="••••••••"
                      value={security.confirm}
                      disabled={savingPassword}
                      onChange={e => setSecurity(s => ({ ...s, confirm: e.target.value }))}
                      style={security.confirm && security.confirm !== security.newPw
                        ? { borderColor: "#EF4444" } : {}} />
                    {security.confirm && security.confirm !== security.newPw && (
                      <span className="pf-field-hint" style={{ color: "#EF4444" }}>Passwords do not match</span>
                    )}
                  </div>
                </div>
                <div className="pf-btn-row">
                  <button type="submit" className="pf-btn pf-btn-primary" disabled={savingPassword}>
                    {savingPassword ? "Saving..." : " Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* PHONE VERIFICATION */}
          <div className="pf-card">
            <div className="pf-card-head">
              <div className="pf-card-icon">📱</div>
              <div>
                <div className="pf-card-title">Phone & Verification</div>
                <div className="pf-card-sub">Required for SMS / WhatsApp notifications</div>
              </div>
            </div>
            <div className="pf-card-body">
              <div className={`pf-phone-status ${phone.verified ? "pf-phone-verified" : "pf-phone-unverified"}`}>
                {phone.verified ? "✓ Phone number verified" : "⚠ Not verified"}
              </div>

              <div className="pf-phone-row">
                <div className="pf-field">
                  <label>Phone Number</label>
                  <input type="tel" placeholder="+77051234567"
                    value={phone.number}
                    disabled={sendingCode || verifyingCode}
                    onChange={e => setPhone(p => ({ ...p, number: e.target.value, sent: false, verified: false }))} />
                  <span className="pf-field-hint">E.164 format, e.g. +77051234567</span>
                </div>
                <button type="button" className="pf-btn pf-btn-ghost pf-phone-action" onClick={handleSendCode}
                  disabled={sendingCode || verifyingCode || !phone.number.trim()}>
                   {sendingCode ? "Sending..." : " Send Code"}
                </button>
              </div>

              {phone.sent && !phone.verified && (
                <div className="pf-phone-row" style={{ marginTop: 8 }}>
                  <div className="pf-field">
                    <label>Verification Code</label>
                    <input type="text" placeholder="Enter code from SMS"
                      value={phone.code}
                      disabled={verifyingCode}
                      onChange={e => setPhone(p => ({ ...p, code: e.target.value }))} />
                  </div>
                  <button type="button" className="pf-btn pf-btn-green pf-phone-action" onClick={handleVerify}
                    disabled={verifyingCode || !phone.code.trim()}>
                    {verifyingCode ? "Verifying..." : "✓ Verify Phone"}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {toast && <div className="pf-toast">{toast}</div>}
    </>
  );
}

export default Profile;