import React, { useEffect, useState } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Cpu, Activity, X, Info } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const Topbar = () => {
  const [status, setStatus] = useState('connecting');
  const [alerts, setAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data.slice(0, 5));
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    }
  };

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.get('/health');
        setStatus('online');
      } catch {
        setStatus('offline');
      }
    };
    checkHealth();
    fetchAlerts();
    const interval = setInterval(() => {
      checkHealth();
      fetchAlerts();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-20 bg-slate-950/50 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <div 
          title={status === 'online' ? "Backend is healthy" : "Cannot reach backend server"}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-full border border-slate-800 cursor-help"
        >
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
          }`} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Server: {status}</span>
        </div>
        
        <div 
          title="AI suggestions require human approval before any operational action"
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-full border border-slate-800 cursor-help"
        >
          <Cpu size={14} className="text-blue-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI: Review mode</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2.5 rounded-full transition-all border relative ${
              showNotifications ? "bg-blue-600 border-blue-500 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800 border-transparent hover:border-slate-700"
            }`}
          >
            <Bell size={20} />
            {alerts.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950" />
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setShowNotifications(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest text-center">Live Alerts</h4>
                    <button onClick={() => setShowNotifications(false)}><X size={14} className="text-slate-500 hover:text-white" /></button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <div className="p-8 text-center">
                        <Info className="mx-auto text-slate-700 mb-2" size={24} />
                        <p className="text-xs text-slate-500 font-bold uppercase">No active alerts</p>
                      </div>
                    ) : (
                      alerts.map((alert, i) => (
                        <div 
                          key={i} 
                          className="p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer"
                          onClick={() => { navigate('/alerts'); setShowNotifications(false); }}
                        >
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter mb-1">{alert.subject}</p>
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{alert.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <button 
                    onClick={() => { navigate('/alerts'); setShowNotifications(false); }}
                    className="w-full py-3 bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-colors"
                  >
                    View All Alerts
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-[1px] bg-slate-800 mx-2" />
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-white leading-none mb-1">{user?.username}</p>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">{user?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-900/20 border border-white/10">
            {user?.username?.[0].toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
