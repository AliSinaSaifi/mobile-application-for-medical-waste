import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { getMe } from "../services/api";

const pageMeta = [
  { match: (path) => path === "/dashboard", title: "Monitoring Dashboard", subtitle: "Medical waste management with AI analytics" },
  { match: (path) => path.startsWith("/dashboard/containers"), title: "Container Monitoring", subtitle: "Real-time status of all medical waste containers" },
  { match: (path) => path.startsWith("/dashboard/reports"), title: "Reports & Analytics", subtitle: "Data analysis and statistics for the waste management system" },
  { match: (path) => path.startsWith("/dashboard/map"), title: "Live Map", subtitle: "Container locations and route visibility" },
  { match: (path) => path.startsWith("/dashboard/alerts"), title: "Alerts", subtitle: "Warnings and container events that need attention" },
  { match: (path) => path.startsWith("/dashboard/routes-history"), title: "Route History", subtitle: "Completed and active collection route records" },
  { match: (path) => path.startsWith("/dashboard/profile"), title: "My Profile", subtitle: "Manage your personal information" },
  { match: (path) => path.startsWith("/dashboard/driver-registration"), title: "Driver Registration", subtitle: "Register as a driver for medical waste collection" },
  { match: (path) => path.startsWith("/dashboard/utilizer-registration"), title: "Utilizer Registration", subtitle: "Register your station for medical waste processing" },
  { match: (path) => path.startsWith("/dashboard/driver-dashboard"), title: "Driver Dashboard", subtitle: "Assigned pickups and collection tasks" },
  { match: (path) => path.startsWith("/dashboard/utilizer"), title: "Utilizer Station", subtitle: "Incoming waste processing tasks" },
  { match: (path) => path.startsWith("/dashboard/admin/dispatch"), title: "Dispatch", subtitle: "Assign and monitor collection tasks" },
  { match: (path) => path.startsWith("/dashboard/admin/users"), title: "Users & Roles", subtitle: "Manage users and access levels" },
  { match: (path) => path.startsWith("/dashboard/approvals"), title: "Approvals", subtitle: "Review pending access requests" },
  { match: (path) => path.startsWith("/dashboard/driver-approvals"), title: "Driver Approvals", subtitle: "Review pending driver requests" },
];

function getPageMeta(pathname) {
  return pageMeta.find((item) => item.match(pathname)) || {
    title: "MedWaste",
    subtitle: "Medical waste management",
  };
}

function MenuIcon() {
  return (
    <svg className="mobile-header-menu-icon" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const meta = getPageMeta(location.pathname);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await getMe();
        const newRole = res.data.role;
        const oldRole = sessionStorage.getItem("mw_role");

        if (newRole !== oldRole) {
          sessionStorage.setItem("mw_role", newRole);
          sessionStorage.setItem("mw_name", res.data.fullName || res.data.email);
          if (res.data.username) sessionStorage.setItem('mw_username', res.data.username);

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
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} showMenuButton={false} />
      <main className="app-main">
        <div className="mobile-header-row">
          <button
            type="button"
            className="mobile-header-menu"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon />
          </button>
          <div className="mobile-header-copy">
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
