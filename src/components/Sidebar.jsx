import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const COLLAPSED_W = 60;
const EXPANDED_W  = 240;

const css = `

  .sb-mobile-hover-area {
    position: relative;
    z-index: 600;
  }

  .sb-mobile-trigger {
    display: none;
  }
  
  .sb-root {
    width:${COLLAPSED_W}px; min-width:${COLLAPSED_W}px; height:100vh; position:sticky; top:0;
    background:#0f1623; display:flex; flex-direction:column;
    font-family:'Geist',sans-serif; border-right:1px solid rgba(255,255,255,.06);
    overflow:hidden; z-index:200;
    transition:width .25s cubic-bezier(.22,1,.36,1),min-width .25s cubic-bezier(.22,1,.36,1);
  }
  .sb-root.expanded{width:${EXPANDED_W}px;min-width:${EXPANDED_W}px;}
  .sb-logo{padding:16px 0;height:64px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0;
    display:flex;align-items:center;padding-left:18px;overflow:hidden;white-space:nowrap;}
  .sb-logo-icon{width:26px;height:26px;flex-shrink:0;background:linear-gradient(135deg,#1A6EFF,#00D68F);
    border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:800;color:#fff;}
  .sb-logo-text{margin-left:11px;font-size:1.1rem;font-weight:800;letter-spacing:-.03em;
    background:linear-gradient(120deg,#1A6EFF,#00D68F);-webkit-background-clip:text;
    -webkit-text-fill-color:transparent;background-clip:text;opacity:0;transition:opacity .2s .05s;white-space:nowrap;}
  .sb-root.expanded .sb-logo-text{opacity:1;}
  .sb-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 0;display:flex;flex-direction:column;}
  .sb-nav::-webkit-scrollbar{display:none;}
  .sb-section-label{font-size:.6rem;font-weight:700;color:rgba(255,255,255,.2);text-transform:uppercase;
    letter-spacing:.1em;padding:10px 0 3px 20px;white-space:nowrap;overflow:hidden;
    opacity:0;max-height:0;transition:opacity .2s,max-height .2s;}
  .sb-root.expanded .sb-section-label{opacity:1;max-height:30px;}
  .sb-link{display:flex;align-items:center;height:42px;text-decoration:none;font-size:.85rem;
    font-weight:500;color:rgba(255,255,255,.45);transition:background .18s,color .18s;
    position:relative;overflow:hidden;white-space:nowrap;}
  .sb-link:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.85);}
  .sb-link.active{background:rgba(26,110,255,.15);color:#fff;}
  .sb-link.active::before{content:'';position:absolute;left:0;top:7px;bottom:7px;
    width:3px;background:#1A6EFF;border-radius:0 3px 3px 0;}
  .sb-icon-wrap{width:${COLLAPSED_W}px;min-width:${COLLAPSED_W}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .sb-icon{width:18px;height:18px;transition:color .18s;}
  .sb-link.active .sb-icon{color:#1A6EFF;}
  .sb-link:hover .sb-icon{color:rgba(255,255,255,.9);}
  .sb-link-label{flex:1;font-size:.85rem;opacity:0;transition:opacity .15s;overflow:hidden;}
  .sb-root.expanded .sb-link-label{opacity:1;transition:opacity .2s .08s;}
  .sb-badge{background:#1A6EFF;color:#fff;font-size:.58rem;font-weight:700;padding:1px 5px;
    border-radius:999px;margin-right:12px;opacity:0;transition:opacity .15s;flex-shrink:0;}
  .sb-root.expanded .sb-badge{opacity:1;transition:opacity .2s .1s;}
  .sb-link .sb-tooltip{position:absolute;left:${COLLAPSED_W+8}px;background:#1a2035;color:#fff;
    font-size:.78rem;font-weight:600;padding:5px 10px;border-radius:6px;pointer-events:none;
    opacity:0;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.3);transition:opacity .15s;z-index:999;}
  .sb-link .sb-tooltip::before{content:'';position:absolute;left:-4px;top:50%;transform:translateY(-50%);
    border:4px solid transparent;border-right-color:#1a2035;border-left:0;}
  .sb-root:not(.expanded) .sb-link:hover .sb-tooltip{opacity:1;}
  .sb-divider{height:1px;background:rgba(255,255,255,.06);margin:4px 0;flex-shrink:0;}
  .sb-user{padding:10px 0;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;overflow:hidden;}
  .sb-user-row{display:flex;align-items:center;height:44px;cursor:default;}
  .sb-user-avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#1A6EFF,#00D68F);
    display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:800;color:#fff;
    flex-shrink:0;margin-left:15px;}
  .sb-user-info{margin-left:10px;overflow:hidden;opacity:0;transition:opacity .2s .05s;white-space:nowrap;}
  .sb-root.expanded .sb-user-info{opacity:1;}
  .sb-user-name{font-size:.8rem;font-weight:600;color:rgba(255,255,255,.85);}
  .sb-user-role{font-size:.62rem;color:rgba(255,255,255,.3);text-transform:capitalize;}
  .sb-logout-row{display:flex;align-items:center;height:38px;cursor:pointer;
    transition:background .18s;margin:0 8px;border-radius:8px;}
  .sb-logout-row:hover{background:rgba(239,68,68,.12);}
  .sb-logout-icon-wrap{width:44px;min-width:44px;display:flex;align-items:center;justify-content:center;}
  .sb-logout-icon{width:16px;height:16px;color:#f87171;}
  .sb-logout-label{font-size:.82rem;font-weight:600;color:#f87171;opacity:0;transition:opacity .15s;}
  .sb-root.expanded .sb-logout-label{opacity:1;transition:opacity .2s .08s;}

  .mobile-shell .sb-mobile-hover-area {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    width: 100%;
    height: 76px;
    z-index: 650;
    pointer-events: auto;
  }

  .mobile-shell .sb-mobile-trigger {
    display: none !important;
  }

  .mobile-shell .sb-root,
  .mobile-shell .sb-root.expanded {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    height: 76px;
    border-right: none;
    border-top: 1px solid rgba(255,255,255,.12);
    z-index: 650;
    transform: none;
    opacity: 1;
    pointer-events: auto;
    transition: none;
  }

  .mobile-shell .sb-logo,
  .mobile-shell .sb-section-label,
  .mobile-shell .sb-divider,
  .mobile-shell .sb-user,
  .mobile-shell .sb-badge,
  .mobile-shell .sb-tooltip {
    display: none !important;
  }

  .mobile-shell .sb-nav {
    width: 100%;
    height: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 8px 8px max(8px, env(safe-area-inset-bottom));
    gap: 4px;
    scrollbar-width: none;
  }
  .mobile-shell .sb-nav::-webkit-scrollbar { display: none; }

  .mobile-shell .sb-link {
    min-width: 68px;
    height: 56px;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 0 2px;
  }

  .mobile-shell .sb-icon-wrap {
    width: auto;
    min-width: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-shell .sb-icon {
    width: 18px;
    height: 18px;
  }

  .mobile-shell .sb-link-label,
  .mobile-shell .sb-root.expanded .sb-link-label {
    opacity: 1;
    font-size: .58rem;
    line-height: 1.1;
    text-align: center;
    max-width: 66px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .mobile-shell .sb-link.active::before {
    left: 12px;
    right: 12px;
    top: auto;
    bottom: 2px;
    width: auto;
    height: 3px;
    border-radius: 3px;
  }

  .sb-mobile-logout {
    display: none;
  }

  .mobile-shell .sb-mobile-logout {
    display: inline-flex;
    min-width: 68px;
    height: 56px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,.55);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    cursor: pointer;
    font-family: inherit;
    padding: 0 2px;
    border-radius: 10px;
  }
  .mobile-shell .sb-mobile-logout:hover {
    background: rgba(239,68,68,.12);
    color: #f87171;
  }
  .mobile-shell .sb-mobile-logout .sb-link-label {
    opacity: 1;
    font-size: .58rem;
    line-height: 1.1;
    text-align: center;
    max-width: 66px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
`;

// Role → nav sections
const NAV = {
  admin: [
    { section: "Main", items: [
      { to: "/dashboard",            label: "Dashboard",  icon: "grid" },
      { to: "/dashboard/containers", label: "Containers", icon: "trash", badge: "5" },
      { to: "/dashboard/map",        label: "Map",        icon: "map"  },
      { to: "/dashboard/alerts",     label: "Alerts",     icon: "bell" },
    ]},
    { section: "Management", items: [
      { to: "/dashboard/reports",        label: "Reports",       icon: "chart" },
      { to: "/dashboard/routes-history", label: "Route History", icon: "route" },
    ]},
    { section: "Administration", items: [
      { to: "/dashboard/approvals",      label: "Approvals",      icon: "shield" },
      { to: "/dashboard/admin/dispatch", label: "Dispatch",        icon: "truck"  },
      { to: "/dashboard/driver-approvals",  label: "Driver Approvals",icon: "users" },
      { to: "/dashboard/admin/users",    label: "Users & Roles",   icon: "users"  },
    ]},
    { section: "Account", items: [
      { to: "/dashboard/profile", label: "Profile", icon: "user" },
    ]},
  ],

  personnel: [
    { section: "Main", items: [
      { to: "/dashboard",            label: "Dashboard",  icon: "grid"  },
      { to: "/dashboard/containers", label: "Containers", icon: "trash" },
      { to: "/dashboard/map",        label: "Map",        icon: "map"   },
      { to: "/dashboard/alerts",     label: "Alerts",     icon: "bell"  },
    ]},
    { section: "Management", items: [
      { to: "/dashboard/reports",             label: "Reports",        icon: "chart" },
      { to: "/dashboard/routes-history",      label: "Route History",  icon: "route" },
      { to: "/dashboard/driver-registration", label: "Become a Driver",icon: "users" },
      { to: "/dashboard/utilizer-registration", label: "Become a Utilizer", icon: "recycle" },
    ]},
    { section: "Account", items: [
      { to: "/dashboard/profile", label: "Profile", icon: "user" },
    ]},
  ],

  driver: [
    { section: "Driver", items: [
      { to: "/dashboard",                     label: "Dashboard",    icon: "grid"  },
      { to: "/dashboard/routes-history",      label: "My Routes",    icon: "route" },
      { to: "/dashboard/driver-registration", label: "Registration", icon: "users" },
      { to: "/dashboard/driver-dashboard", label: "My Tasks", icon: "truck" },
    ]},
    { section: "Account", items: [
      { to: "/dashboard/profile", label: "Profile", icon: "user" },
    ]},
  ],

  utilizer: [
    { section: "Utilizer", items: [
      { to: "/dashboard/utilizer", label: "Station", icon: "grid" },
    ]},
    { section: "Account", items: [
      { to: "/dashboard/profile", label: "Profile", icon: "user" },
    ]},
  ],
};

const paths = {
  grid:  <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
  map:   <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
  bell:  <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
  chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  route: <><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19h4.5a3.5 3.5 0 000-7h-8a3.5 3.5 0 010-7H12"/></>,
  truck: <><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  user:  <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></>,
  logout:<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  recycle: <><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></>,
};

function SbIcon({ name, className = "sb-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const role     = sessionStorage.getItem("mw_role")  || "personnel";
  const name     = sessionStorage.getItem("mw_name")  || "User";
  const email    = sessionStorage.getItem("mw_user")  || "";

  const navItems = NAV[role] || NAV.personnel;

  const isActive = (to) =>
    to === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(to);

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/login";
  };

  return (
    <>
      <style>{css}</style>
      <div
        className="sb-mobile-hover-area"
      >
        <div className="sb-mobile-trigger" />
        <div className={`sb-root ${open ? "expanded" : ""}`}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}>

        <div className="sb-logo">
          <div className="sb-logo-icon">M</div>
          <span className="sb-logo-text">MedWaste</span>
        </div>

        <nav className="sb-nav">
          {navItems.map((section, si) => (
            <React.Fragment key={section.section}>
              {si > 0 && <div className="sb-divider" />}
              <div className="sb-section-label">{section.section}</div>
              {section.items.map((item) => (
                <Link key={item.to} to={item.to}
                  className={`sb-link ${isActive(item.to) ? "active" : ""}`}>
                  <span className="sb-icon-wrap"><SbIcon name={item.icon} /></span>
                  <span className="sb-link-label">{item.label}</span>
                  {item.badge && <span className="sb-badge">{item.badge}</span>}
                  <span className="sb-tooltip">{item.label}</span>
                </Link>
              ))}
            </React.Fragment>
          ))}
          <button className="sb-mobile-logout" onClick={handleLogout}>
            <span className="sb-icon-wrap"><SbIcon name="logout" /></span>
            <span className="sb-link-label">Logout</span>
          </button>
        </nav>

        <div className="sb-user">
          <div className="sb-user-row">
            <div className="sb-user-avatar">{name.charAt(0).toUpperCase()}</div>
            <div className="sb-user-info">
              <div className="sb-user-name">{name}</div>
              <div className="sb-user-role">{role}</div>
            </div>
          </div>
          <div className="sb-logout-row" onClick={handleLogout}>
            <div className="sb-logout-icon-wrap">
              <SbIcon name="logout" className="sb-logout-icon" />
            </div>
            <span className="sb-logout-label">Log Out</span>
          </div>
        </div>

        </div>
      </div>
    </>
  );
}