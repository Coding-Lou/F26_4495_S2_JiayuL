import { Backpack, Compass, Home, LogIn, LogOut, Map, Mountain, PanelLeftClose, PanelLeftOpen, Sparkles, UserPlus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

const navigation = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/plan", label: "Plan", icon: Mountain },
  { to: "/pack", label: "Pack", icon: Backpack },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/memory", label: "Memory", icon: Map },
];

interface AppLayoutProps {
  children: ReactNode;
  displayName: string;
  authenticated: boolean;
  authAvailable: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
  onExitGuest: () => void;
}

export function AppLayout({ children, displayName, authenticated, authAvailable, onLogin, onRegister, onLogout, onExitGuest }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return <div className={`app-shell ${collapsed ? "app-shell--collapsed" : ""}`}>
    <aside className="sidebar">
      <div className="brand"><span className="brand__mark"><Mountain size={22} /></span><div className="brand__text"><strong>Outdoor</strong><small>Trip Companion</small></div></div>
      <nav className="sidebar__nav" aria-label="Main navigation">
        <p className="nav-label">Journey</p>
        {navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`}><Icon size={19} /><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar__tip"><Sparkles size={18} /><div><strong>Adventure tip</strong><p>Always share your route before heading out.</p></div></div>
      {authenticated ? <div className="sidebar__footer">
        <NavLink to="/profile" className="profile-chip"><span className="avatar">{initials}</span><span><strong>{displayName}</strong><small>View profile</small></span></NavLink>
        <button className="icon-button" aria-label="Log out" title="Log out" onClick={onLogout}><LogOut size={18} /></button>
      </div> : <div className="sidebar__guest"><div className="profile-chip"><span className="avatar">G</span><span><strong>Guest mode</strong><small>Previewing the app</small></span></div><button className="button button--primary" disabled={!authAvailable} onClick={onLogin}><LogIn size={16} />Log in</button><button className="guest-register" disabled={!authAvailable} onClick={onRegister}><UserPlus size={14} />Create account</button><button className="guest-exit" onClick={onExitGuest}>Exit guest mode</button></div>}
      <button className="collapse-button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
    </aside>
    <main className="main-content">{children}</main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? "active" : ""}><Icon size={20} /><span>{label}</span></NavLink>)}{!authenticated && <button disabled={!authAvailable} onClick={onLogin}><LogIn size={20} /><span>Log in</span></button>}</nav>
  </div>;
}
