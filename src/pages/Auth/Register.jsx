import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../../services/api";

const Register = () => {
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const payload = {
      fullName: String(formData.get("fullName") || form.fullName).trim(),
      username: String(formData.get("username") || form.username).trim(),
      email: String(formData.get("email") || form.email).trim(),
      password: String(formData.get("password") || form.password),
    };
    const confirmPassword = String(formData.get("confirmPassword") || form.confirmPassword);

    if (payload.password !== confirmPassword) return setError("Passwords do not match.");
    if (payload.password.length < 6) return setError("Password must be at least 6 characters.");
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(payload.username)) {
      return setError("Username must be 3-30 chars and only letters, numbers, underscores, or hyphens.");
    }

    setLoading(true);
    try {
      await register(payload);
      setSuccess("Account created. You can log in now.");
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>MedWaste</h1>
          <p>Create a new account to access the system.</p>
        </div>

        <form className="auth-form" onSubmit={handleRegister}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="fullName"
              placeholder="Dr. Jane Smith"
              required
              value={form.fullName}
              onChange={setField("fullName")}
            />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
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
              name="email"
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
              name="password"
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
              name="confirmPassword"
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

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
