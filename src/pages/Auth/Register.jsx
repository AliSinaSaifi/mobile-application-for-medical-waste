import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, sendAuthOtp, verifyAuthOtp } from "../../services/api";

const RESEND_COOLDOWN_SEC = 60;

const Register = () => {
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [step, setStep] = useState("form");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(form.username)) {
      return setError("Username must be 3-30 chars and only letters, numbers, underscores, or hyphens.");
    }

    setLoading(true);
    try {
      await register(
        form.fullName,
        form.username,
        form.email,
        form.password,
        form.phoneNumber
      );
      setSuccess("Enter the 6-digit code sent to your phone.");
      setStep("verify");
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleVerify = async () => {
    setError("");
    setSuccess("");
    setVerifyLoading(true);
    try {
      const res = await verifyAuthOtp(form.phoneNumber, form.email, otp);
      const data = res.data;
      sessionStorage.setItem("mw_logged_in", "true");
      sessionStorage.setItem("mw_token", data.token);
      sessionStorage.setItem("mw_user", data.email);
      sessionStorage.setItem("mw_role", data.role);
      sessionStorage.setItem("mw_name", data.fullName || data.email.split("@")[0]);
      sessionStorage.setItem("mw_username", data.username || "");
      setStep("done");
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || "Verification failed.";
      if (status === 429 && err.response?.data?.retryAfterSec != null) {
        setError(`${msg} Retry in about ${err.response.data.retryAfterSec}s.`);
      } else {
        setError(msg);
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setError("");
    setSuccess("");
    setResendLoading(true);
    try {
      await sendAuthOtp(form.phoneNumber, form.email);
      setSuccess("A new code was sent to your phone.");
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || "Failed to resend code.";
      if (status === 429 && err.response?.data?.retryAfterSec != null) {
        setError(`${msg} Retry in about ${err.response.data.retryAfterSec}s.`);
      } else {
        setError(msg);
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>MedWaste</h1>
          <p>Create a new account to access the system.</p>
        </div>

        {step === "form" && (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Dr. Jane Smith"
                required
                value={form.fullName}
                onChange={setField("fullName")}
              />
            </div>
            <div className="form-group">
              <label>Phone Number (E.164)</label>
              <input
                type="tel"
                placeholder="+77051234567"
                required
                value={form.phoneNumber}
                onChange={setField("phoneNumber")}
              />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="your_username"
                required
                value={form.username}
                onChange={setField("username")}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                required
                value={form.email}
                onChange={setField("email")}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                value={form.password}
                onChange={setField("password")}
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                value={form.confirmPassword}
                onChange={setField("confirmPassword")}
              />
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
              type="submit"
              className="btn btn-primary btn-full-width"
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        )}

        {step === "verify" && (
          <div className="auth-form">
            <p style={{ color: "#94A3B8", fontSize: "0.9rem", textAlign: "center", marginTop: 0 }}>
              We sent a code to <strong>{form.phoneNumber}</strong>
            </p>
            <div className="form-group">
              <label>Enter 6-digit code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
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

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary btn-full-width"
                disabled={verifyLoading || otp.length !== 6}
                onClick={handleVerify}
              >
                {verifyLoading ? "Verifying…" : "Verify & continue"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={resendCooldown > 0 || resendLoading}
                onClick={handleResend}
              >
                {resendLoading
                  ? "Sending…"
                  : resendCooldown > 0
                    ? `Resend code (${resendCooldown}s)`
                    : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <p style={{ color: "#22C55E", textAlign: "center" }}>You&apos;re verified. Redirecting…</p>
        )}

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
