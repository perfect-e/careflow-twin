import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Bed, 
  Bell, 
  ShieldCheck,
  LogOut,
  Activity,
  Radar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { clsx } from 'clsx';

const SidebarItem = ({ to, icon: Icon, label, roles }) => {
  const { user } = useAuth();
  if (roles && !roles.includes(user?.role)) return null;

  return (
    <NavLink
      to={to}
      className={({ isActive }) => clsx(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative",
        isActive 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      {({ isActive }) => (
        <>
          <Icon size={20} />
          <span className="font-medium">{label}</span>
          {isActive && (
            <motion.div 
              layoutId="sidebar-active"
              className="absolute left-0 w-1 h-8 bg-blue-400 rounded-r-full"
            />
          )}
        </>
      )}
    </NavLink>
  );
};

const Sidebar = () => {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
    }
  };

  const menuItems = [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: ["admin", "doctor", "nurse"] },
    { label: "Patients", to: "/patients", icon: Users, roles: ["admin", "doctor", "nurse"] },
    { label: "AI Command", to: "/ai", icon: MessageSquare, roles: ["admin", "doctor"] },
    { label: "Beds", to: "/beds", icon: Bed, roles: ["admin", "doctor", "nurse"] },
    { label: "Alerts", to: "/alerts", icon: Bell, roles: ["admin", "doctor", "nurse"] },
    { label: "Surge Twin", to: "/surge", icon: Radar, roles: ["admin", "doctor", "nurse"] },
    { label: "Admin", to: "/admin", icon: ShieldCheck, roles: ["admin"] },
  ];

  return (
    <aside className="w-72 h-screen bg-slate-950 border-r border-slate-800 flex flex-col p-6 sticky top-0">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Activity className="text-white" size={24} />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Care<span className="text-blue-500">Flow</span> Twin</h1>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {menuItems.map((item) => (
          <SidebarItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-800">
        <div className="px-4 py-3 mb-4 bg-slate-900/50 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Authenticated</p>
          <p className="text-sm font-semibold text-white truncate">{user?.username || 'Guest'}</p>
          <span className="inline-block px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded mt-1 uppercase tracking-widest">
            {user?.role || 'No Role'}
          </span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-300 group"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          <span className="font-medium">Logout System</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
