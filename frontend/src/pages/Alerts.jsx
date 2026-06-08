import React, { useState, useEffect } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Info, Clock, Send } from 'lucide-react';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('NORMAL');

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleSendAlert = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await api.post('/send_hospital_alert', { 
        subject: 'Manual Broadcast',
        message, 
        priority,
        alert_type: 'BROADCAST'
      });
      setMessage('');
      fetchAlerts();
    } catch (err) {
      alert('Failed to send alert');
    }
  };

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'HIGH': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-4xl font-black text-white tracking-tight">System Alerts</h2>
        <p className="text-slate-400 mt-2 font-medium">Real-time notification stream and broadcasting.</p>
      </div>

      <form onSubmit={handleSendAlert} className="bg-slate-900 p-8 rounded-[32px] border border-slate-800 space-y-6 shadow-xl shadow-black/20">
        <h4 className="text-lg font-bold text-white flex items-center gap-3">
          <Send size={20} className="text-blue-500" />
          Broadcast Alert
        </h4>
        <div className="flex flex-col md:flex-row gap-4">
          <input 
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your emergency broadcast message here..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
          />
          <div className="flex gap-2">
            <select 
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-blue-500 font-bold text-xs uppercase tracking-widest"
            >
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all">
              Send
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-4">
        <AnimatePresence>
          {alerts.map((alert, i) => (
            <motion.div
              key={alert.alert_id || i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-6 rounded-3xl border flex items-start gap-5 transition-all hover:scale-[1.01] ${getPriorityStyle(alert.priority)}`}
            >
              <div className="p-3 bg-white/5 rounded-2xl">
                {alert.priority === 'CRITICAL' ? <AlertTriangle size={24} /> : <Info size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-black text-sm uppercase tracking-tight truncate">{alert.subject}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-bold opacity-60 whitespace-nowrap">
                    <Clock size={12} />
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
                <p className="text-sm opacity-90 leading-relaxed break-words">{alert.message}</p>
                <div className="mt-4 flex gap-2">
                   <span className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-black tracking-widest border border-white/5">{alert.alert_type}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Alerts;
