import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, sendAuthOtp, verifyAuthOtp } from "../../services/api";

const RESEND_COOLDOWN_SEC = 60;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("credentials");
  const [otp, setOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingEmail, setPendingEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const redirectForRole = (role) => {
    const routes = {
      admin: "/dashboard/admin/dispatch",
      utilizer: "/dashboard/utilizer",
      driver: "/dashboard/routes-history",
      personnel: "/dashboard",
    };
    navigate(routes[role] || "/dashboard");
  };

  const requestOtpForEmail = useCallback(async (targetEmail) => {
    await sendAuthOtp(undefined, targetEmail);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      const { token, email: userEmail, role, fullName, username } = res.data;

      sessionStorage.setItem("mw_logged_in", "true");
      sessionStorage.setItem("mw_user", userEmail);
      sessionStorage.setItem("mw_token", token);
      sessionStorage.setItem("mw_role", role);
      sessionStorage.setItem("mw_name", fullName || userEmail.split("@")[0]);
      if (username) sessionStorage.setItem("mw_username", username);

      redirectForRole(role);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 403 && data?.code === "PHONE_NOT_VERIFIED") {
        const em = data.email || email.trim();
        setPendingEmail(em);
        setStep("otp");
        setOtp("");
        setError("");
        try {
          await requestOtpForEmail(em);
          setResendCooldown(RESEND_COOLDOWN_SEC);
        } catch (sendErr) {
          const msg = sendErr.response?.data?.error || "Could not send verification code.";
          setError(msg);
        }
        return;
      }
      setError(data?.error || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setVerifyLoading(true);
    try {
      const res = await verifyAuthOtp(undefined, pendingEmail, otp);
      const data = res.data;
      sessionStorage.setItem("mw_logged_in", "true");
      sessionStorage.setItem("mw_token", data.token);
      sessionStorage.setItem("mw_user", data.email);
      sessionStorage.setItem("mw_role", data.role);
      sessionStorage.setItem("mw_name", data.fullName || data.email.split("@")[0]);
      sessionStorage.setItem("mw_username", data.username || "");
      redirectForRole(data.role);
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
    if (resendCooldown > 0 || resendLoading || !pendingEmail) return;
    setError("");
    setResendLoading(true);
    try {
      await requestOtpForEmail(pendingEmail);
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

  const backToCredentials = () => {
    setStep("credentials");
    setOtp("");
    setPendingEmail("");
    setError("");
    setResendCooldown(0);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>MedWaste</h1>
          <p>
            {step === "credentials"
              ? "Sign in to continue to your dashboard."
              : "Verify your phone to finish signing in."}
          </p>
        </div>

        {step === "credentials" && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p style={{ color: "#EF4444", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full-width"
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in…" : "Log In"}
            </button>
            <a href="#" className="forgot-password">
              Forgot your password?
            </a>
          </form>
        )}

        {step === "otp" && (
          <div className="auth-form">
            <p style={{ color: "#94A3B8", fontSize: "0.9rem", textAlign: "center", marginTop: 0 }}>
              Enter the code sent to the phone on file for <strong>{pendingEmail}</strong>
            </p>
            <div className="form-group">
              <label>6-digit code</label>
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

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary btn-full-width"
                disabled={verifyLoading || otp.length !== 6}
                onClick={handleVerifyOtp}
              >
                {verifyLoading ? "Verifying…" : "Verify & sign in"}
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
                    ? `Resend (${resendCooldown}s)`
                    : "Resend code"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={backToCredentials}>
                Back to email & password
              </button>
            </div>
          </div>
        )}

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
