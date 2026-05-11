import React, { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { getMe } from "../services/api";

const Layout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await getMe();
        const newRole = res.data.role;
        const oldRole = sessionStorage.getItem("mw_role");

        if (newRole !== oldRole) {
          sessionStorage.setItem("mw_role", newRole);
          sessionStorage.setItem("mw_name", res.data.fullName || res.data.email);

          const routes = {
            admin:     "/dashboard/admin/dispatch",
            utilizer:  "/dashboard/utilizer",
            driver:    "/dashboard/driver-dashboard",
            personnel: "/dashboard",
          };
          navigate(routes[newRole] || "/dashboard");
        }
      } catch {}
    };

    const interval = setInterval(checkRole, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;