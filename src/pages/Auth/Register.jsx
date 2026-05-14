import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../../services/api";

const Register = () => {
  const [form, setForm]       = useState({ fullName: "", username: "", email: "", password: "", confirmPassword: "" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
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
      await register(form.fullName, form.username, form.email, form.password);
      setSuccess("Registered successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

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
            <input type="text" placeholder="Dr. Jane Smith" required
              value={form.fullName} onChange={set("fullName")} />
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

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;