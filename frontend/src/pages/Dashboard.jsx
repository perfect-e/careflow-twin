import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';
import { Users, Bell, Activity, Bed, TrendingUp, AlertTriangle } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-slate-900 p-6 rounded-3xl border border-slate-800 relative overflow-hidden group hover:border-blue-500/50 transition-colors"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-${color}-500/10 transition-colors`} />
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 bg-${color}-500/10 rounded-2xl text-${color}-400`}>
        <Icon size={24} />
      </div>
      <TrendingUp size={16} className="text-emerald-500" />
    </div>
    <p className="text-slate-400 text-sm font-medium">{label}</p>
    <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
  </motion.div>
);

const DepartmentPanel = ({ dept }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.post('/get_department_status', { department: dept })
      .then(res => setData(res.data.body));
  }, [dept]);

  if (!data) return <div className="h-48 bg-slate-900 rounded-3xl animate-pulse border border-slate-800" />;

  return (
    <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-bold text-white">{dept} Status</h4>
        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full">{data.occupancy_rate}% Occupied</span>
      </div>
      
      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Bed Availability</span>
            <span className="text-white font-medium">{data.available_beds} / {data.total_beds}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(data.occupied_beds / data.total_beds) * 100}%` }}
              className="h-full bg-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Critical</p>
            <p className="text-xl font-bold text-white">{data.critical_patients_count}</p>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Total Patients</p>
            <p className="text-xl font-bold text-white">{data.patient_count}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/patients').then(res => setPatients(res.data));
    api.get('/alerts').then(res => setAlerts(res.data));
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">System Overview</h2>
          <p className="text-slate-400 mt-2 font-medium">Real-time hospital automation monitoring.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Activity size={16} className="text-blue-500" />
            Refresh Sync
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Patients" value={patients.length} icon={Users} color="blue" />
        <StatCard label="Critical Alerts" value={alerts.filter(a => a.priority === 'CRITICAL').length} icon={AlertTriangle} color="red" />
        <StatCard label="Active Alerts" value={alerts.length} icon={Bell} color="amber" />
        <StatCard label="Resource Usage" value="84%" icon={Activity} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <DepartmentPanel dept="ICU" />
              <DepartmentPanel dept="GENERAL" />
           </div>
           
           <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8">
              <h4 className="text-lg font-bold text-white mb-6">Recent System Activity</h4>
              <div className="space-y-4">
                {alerts.slice(0, 5).map(alert => (
                  <div key={alert.id || alert.alert_id} className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-800/50">
                    <div className={`p-2 rounded-xl bg-opacity-10 ${
                      alert.priority === 'CRITICAL' ? 'bg-red-500 text-red-400' : 'bg-blue-500 text-blue-400'
                    }`}>
                      <Bell size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white leading-tight truncate">{alert.subject}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{alert.message}</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white relative overflow-hidden">
              <Activity className="absolute bottom-[-20px] right-[-20px] w-48 h-48 opacity-10" />
              <h4 className="text-xl font-bold mb-2">AI Diagnostic Tool</h4>
              <p className="text-blue-100 text-sm mb-6">Ask the agent to manage beds or check patient status using natural language.</p>
              <button 
                onClick={() => navigate('/ai')}
                className="w-full py-4 bg-white text-blue-600 font-bold rounded-2xl hover:bg-blue-50 transition-colors shadow-xl shadow-blue-900/20"
              >
                Open AI Command Center
              </button>
           </div>

           <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8">
              <h4 className="text-lg font-bold text-white mb-6">Quick Actions</h4>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/patients')}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl border border-slate-700 transition-all"
                >
                  Manage Patients
                </button>
                <button 
                  onClick={() => navigate('/beds')}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl border border-slate-700 transition-all"
                >
                  Check Bed Availability
                </button>
                <button 
                  onClick={() => navigate('/alerts')}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl border border-slate-700 transition-all"
                >
                  Broadcast Alert
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
