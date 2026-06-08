import React, { useState } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { ShieldCheck, Database, Activity, RefreshCw } from 'lucide-react';

const Admin = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInitDB = async () => {
    setLoading(true);
    try {
      const res = await api.post('/init_db');
      alert(res.data.message);
    } catch (err) {
      alert('Failed to initialize database');
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await api.get('/health');
      setStatus(res.data);
    } catch (err) {
      setStatus({ status: 'offline', provider: 'local' });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <div>
        <h2 className="text-4xl font-black text-white tracking-tight">Admin Terminal</h2>
        <p className="text-slate-400 mt-2 font-medium">System maintenance and infrastructure controls.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 p-8 rounded-[32px] border border-slate-800 space-y-6">
          <div className="flex items-center gap-4 text-blue-500 mb-2">
            <div className="p-3 bg-blue-500/10 rounded-2xl">
              <Database size={24} />
            </div>
            <h4 className="text-xl font-bold text-white">Data Management</h4>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Initialize the database with default ICU and General beds, as well as essential system accounts.
          </p>
          <button 
            onClick={handleInitDB}
            disabled={loading}
            className="w-full py-4 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Initialize Infrastructure'}
          </button>
        </div>

        <div className="bg-slate-900 p-8 rounded-[32px] border border-slate-800 space-y-6">
          <div className="flex items-center gap-4 text-emerald-500 mb-2">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <Activity size={24} />
            </div>
            <h4 className="text-xl font-bold text-white">System Health</h4>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Verify the connectivity between the frontend, API server, and the Llama3 agent backend.
          </p>
          <button 
            onClick={checkHealth}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition-all"
          >
            Run Diagnostics
          </button>
          
          {status && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[10px]"
            >
              <pre className="text-emerald-400">{JSON.stringify(status, null, 2)}</pre>
            </motion.div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[32px] border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-5">
           <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-500">
              <ShieldCheck size={28} />
           </div>
           <div>
              <p className="text-white font-bold tracking-tight">Access Control</p>
              <p className="text-slate-500 text-xs font-medium">Currently logged in with root administrative privileges.</p>
           </div>
        </div>
        <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">
          Superuser Verified
        </span>
      </div>
    </div>
  );
};

export default Admin;
