import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, sendAuthOtp, verifyAuthOtp } from "../../services/api";

const Register = () => {
  const [form, setForm]       = useState({ fullName: "", username: "", email: "", phoneNumber: "", password: "", confirmPassword: "" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(form.username)) return setError('Username must be 3-30 chars and only letters, numbers, underscores, or hyphens.');

    setLoading(true);
    try {
      const res = await register(form.fullName, form.username, form.email, form.password, form.phoneNumber);
      const msg = res.data?.message || '';
      if (form.phoneNumber) {
        setSuccess('OTP sent to your phone. Enter the code to verify.');
        setStep('verify');
        // start resend cooldown
        setResendCooldown(Number(process.env.REACT_APP_OTP_RESEND_COOLDOWN || 60));
      } else {
        setSuccess("Registered successfully. Redirecting to login...");
        setTimeout(() => navigate("/login"), 1200);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // countdown for resend
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>MedWaste</h1>
          <p>Create a new account to access the system.</p>
        </div>

        {step === 'form' && (
        <form className="auth-form" onSubmit={handleRegister}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" placeholder="Dr. Jane Smith" required
              value={form.fullName} onChange={set("fullName")} />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" placeholder="+77051234567" required
              value={form.phoneNumber} onChange={set("phoneNumber")} />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input type="text" placeholder="your_username" required
              value={form.username} onChange={set("username")} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" required
              value={form.email} onChange={set("email")} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" required
              value={form.password} onChange={set("password")} />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" placeholder="••••••••" required
              value={form.confirmPassword} onChange={set("confirmPassword")} />
          </div>

          {error && (
            <p style={{ color: "#EF4444", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
              {error}
            </p>
          )}

          {success && (
            <p style={{ color: "#22C55E", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
              {success}
            </p>
          )}

          <button
            type="submit" className="btn btn-primary btn-full-width"
            disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
        )}

        {step === 'verify' && (
          <div className="auth-form">
            <div className="form-group">
              <label>Enter OTP</label>
              <input type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  const res = await verifyAuthOtp(form.phoneNumber, form.email, otp);
                  const data = res.data;
                  sessionStorage.setItem('mw_logged_in','true');
                  sessionStorage.setItem('mw_token', data.token);
                  sessionStorage.setItem('mw_user', data.email);
                  sessionStorage.setItem('mw_role', data.role);
                  sessionStorage.setItem('mw_name', data.fullName || data.email.split('@')[0]);
                  sessionStorage.setItem('mw_username', data.username || '');
                  navigate('/dashboard');
                } catch (err) {
                  setError(err.response?.data?.error || 'Verification failed');
                }
              }}>Verify</button>
              <button className="btn btn-ghost" disabled={resendCooldown>0} onClick={async () => {
                try {
                  await sendAuthOtp(form.phoneNumber, form.email);
                  setSuccess('OTP resent');
                  setResendCooldown(60);
                } catch (err) {
                  setError(err.response?.data?.error || 'Failed to resend OTP');
                }
              }}>{resendCooldown>0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}</button>
            </div>
          </div>
        )}

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;