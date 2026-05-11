import axios from "axios";
import { API_BASE_URL } from "../config/api";

const api = axios.create({ baseURL: API_BASE_URL });

// Auto-attach token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("mw_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────
export const login    = (email, password)           => api.post("/api/auth/login",    { email, password });
export const register = (fullName, email, password) => api.post("/api/auth/register", { fullName, email, password });
export const logout   = ()                          => api.post("/api/auth/logout");
export const getMe    = ()                          => api.get("/api/auth/me");

// ── Bins ──────────────────────────────────────────────────────
export const getBins       = ()      => api.get("/api/bins");
export const getBinHistory = (binId) => api.get(`/api/bins/history/${binId}`);
export const getPredict    = (binId) => api.get(`/api/bins/predict/${binId}`);

// ── Alerts ────────────────────────────────────────────────────
export const getAlerts    = ()   => api.get("/api/alerts");
export const resolveAlert = (id) => api.patch(`/api/alerts/${id}/resolve`);
export const dismissAlert = (id) => api.delete(`/api/alerts/${id}`);

// ── Notifications ─────────────────────────────────────────────
export const getNotifications = ()   => api.get("/api/notifications");
export const markRead         = (id) => api.patch(`/api/notifications/${id}/read`);

// ── Drivers ───────────────────────────────────────────────────
export const registerDriver = (data) => api.post("/api/drivers/register", data);
export const getDriverTasks = ()     => api.get("/api/drivers/tasks");

// ── Admin ─────────────────────────────────────────────────────
export const getUsers           = ()                      => api.get("/api/admin/users");
export const updateUserRole     = (id, role)              => api.patch(`/api/admin/users/${id}/role`, { role });
export const getPendingDrivers  = ()                      => api.get("/api/admin/drivers/pending");
export const getApprovedDrivers = ()                      => api.get("/api/admin/drivers/approved");
export const updateDriverStatus = (id, status)            => api.patch(`/api/admin/drivers/${id}/status`, { status });
export const getAllTasks         = ()                      => api.get("/api/admin/tasks/all");
export const assignTask         = (driverId, containerId) => api.post("/api/admin/assign-task", { driverId, containerId });

// ── Utilizer ──────────────────────────────────────────────────
export const getIncomingTasks   = ()         => api.get("/api/utilizer/incoming-tasks");
export const acceptWaste        = (id)       => api.patch(`/api/utilizer/accept-waste/${id}`);
export const completeProcess    = (id, data) => api.patch(`/api/utilizer/complete-process/${id}`, data);
export const getUtilizerHistory = ()         => api.get("/api/utilizer/history");