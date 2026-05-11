import React from "react";
import { Navigate } from "react-router-dom";

// Protects routes — redirects to /login if not authenticated
function PrivateRoute({ children, requiredRole }) {
  const isLoggedIn = sessionStorage.getItem("mw_logged_in") === "true";
  const userRole   = sessionStorage.getItem("mw_role");

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Optional role check (e.g. requiredRole="admin")
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default PrivateRoute;