import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../../services/api";

const Login = () => {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      const { token, email: userEmail, role, fullName, username } = res.data;

      sessionStorage.setItem("mw_logged_in", "true");
      sessionStorage.setItem("mw_user",      userEmail);
      sessionStorage.setItem("mw_token",     token);
      sessionStorage.setItem("mw_role",      role);
      sessionStorage.setItem("mw_name",      fullName || userEmail.split("@")[0]);
      if (username) sessionStorage.setItem("mw_username", username);

      // Redirect based on role
      const routes = {
        admin:      "/dashboard/admin/dispatch",
        utilizer:   "/dashboard/utilizer",
        driver:     "/dashboard/routes-history",
        personnel:  "/dashboard",
      };
      navigate(routes[role] || "/dashboard");

    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>MedWaste</h1>
          <p>Sign in to continue to your dashboard.</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email" placeholder="you@example.com" required
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password" placeholder="••••••••" required
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p style={{ color: "#EF4444", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit" className="btn btn-primary btn-full-width"
            disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in…" : "Log In"}
          </button>
          <a href="#" className="forgot-password">Forgot your password?</a>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;