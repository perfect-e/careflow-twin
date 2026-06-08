import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, Sparkles, AlertCircle, 
  Bed, Activity, Database, Info, Layout, 
  ChevronRight, CheckCircle2, Users, X, Code, Terminal,
  Cpu, ShieldCheck, RefreshCw
} from 'lucide-react';

const SubDataCard = ({ label, data }) => {
  if (!data || typeof data !== 'object') return null;
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-inner">
      <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">{label.replace(/_/g, ' ')}</p>
      <div className="grid grid-cols-1 gap-y-3">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center gap-4 border-b border-white/5 pb-2 last:border-0 last:pb-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
            <span className="text-xs font-bold text-slate-200 truncate max-w-[150px]">
              {typeof value === 'object' ? '{...}' : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DataLog = ({ data }) => {
  if (!data || typeof data !== 'object') return null;

  const arrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
  const items = arrayKey ? data[arrayKey] : null;
  
  const nestedObjects = Object.entries(data).filter(([k, v]) => 
    v !== null && typeof v === 'object' && !Array.isArray(v) && k !== 'actions_taken'
  );

  const flatSpecs = Object.entries(data).filter(([k, v]) => 
    typeof v !== 'object' && k !== 'success' && k !== 'message'
  );

  return (
    <div className="w-full mt-6 space-y-8">
      {/* 1. Array Data: Registry */}
      {items && items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-[0.3em] px-1 border-l-2 border-blue-500 pl-4">
             {arrayKey.replace(/_/g, ' ')} REGISTRY
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-blue-500/30 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${item?.triage === 'critical' || item?.status === 'occupied' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {item?.name ? <Users size={18} /> : <Bed size={18} />}
                  </div>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter group-hover:text-blue-400 transition-colors">
                    {item?.assigned_bed || item?.status || "RECORD"}
                  </span>
                </div>
                <div>
                  <p className="text-base font-black text-white truncate tracking-tight">{item?.name || item?.bed_id || item?.id}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mt-1 italic">
                    {item?.triage || item?.department || "SYSTEM ASSET"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Nested Objects: Detailed Reports */}
      {nestedObjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nestedObjects.map(([key, val]) => (
            <SubDataCard key={key} label={key} data={val} />
          ))}
        </div>
      )}

      {/* 3. Flat Technical Specs */}
      {flatSpecs.length > 0 && (
        <div className="bg-black/20 border border-slate-800 rounded-3xl p-8">
          <div className="flex items-center gap-2 text-amber-500 text-xs font-black uppercase tracking-[0.3em] mb-8 border-l-2 border-amber-500 pl-4">
            TECHNICAL SPECIFICATIONS
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-12">
            {flatSpecs.map(([key, value]) => (
              <div key={key} className="space-y-2">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{key.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold text-slate-100 break-all leading-tight">
                  {typeof value === 'boolean' ? (value ? 'ACTIVE' : 'INACTIVE') : String(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.actions_taken && (
         <div className="mt-6 pt-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.actions_taken.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-slate-400 font-bold bg-white/5 p-4 rounded-xl border border-white/5 uppercase tracking-tighter">
                 <ChevronRight size={14} className="text-blue-500" /> {a}
              </div>
            ))}
         </div>
      )}
    </div>
  );
};

const LogEntry = ({ msg, onDecision }) => {
  const isAi = msg.sender === 'ai';
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: isAi ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full border-b border-slate-800/50 py-12 first:pt-0"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-start gap-8">
          {/* Avatar/Icon Section */}
          <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-2xl border ${
            isAi ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'
          }`}>
            {isAi ? <Cpu size={28} /> : <ShieldCheck size={28} />}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header Metadata */}
            <div className="flex items-center gap-4 mb-4">
              <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${isAi ? 'text-blue-500' : 'text-slate-500'}`}>
                {isAi ? 'CORE_INTELLIGENCE_OUTPUT' : 'AUTHORIZED_AUTHORITY_INPUT'}
              </span>
              <div className="h-[1px] flex-1 bg-slate-800/50" />
              <span className="text-[10px] font-mono text-slate-600 font-bold">
                {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Main Content */}
            <div className="space-y-4">
              <p className={`text-2xl sm:text-3xl font-black tracking-tight leading-[1.1] ${
                msg.error ? 'text-red-500' : isAi ? 'text-white' : 'text-slate-400 font-bold'
              }`}>
                {msg.text}
              </p>
              
              {isAi && <DataLog data={msg.data} />}
              {isAi && msg.proposalId && msg.pending && (
                <div className="flex gap-3 pt-2">
                  <button onClick={() => onDecision(msg.proposalId, true)} className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl">APPROVE & EXECUTE</button>
                  <button onClick={() => onDecision(msg.proposalId, false)} className="px-4 py-2 border border-red-500/30 text-red-400 text-xs font-black rounded-xl">REJECT</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AICenter = () => {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('hospital_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('hospital_chat_history', JSON.stringify(messages));
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { text: input, sender: 'user', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/agent/propose', { message: input });
      const aiMsg = { 
        text: res.data.message || "PROPOSAL_CREATED",
        sender: 'ai',
        data: res.data.data,
        proposalId: res.data.proposal_id,
        pending: res.data.requires_approval,
        error: !!(res.data.data && res.data.data.error),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        text: "CRITICAL_CONNECTION_FAILURE", 
        sender: 'ai',
        error: true,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const decideProposal = async (proposalId, approve) => {
    try {
      const res = await api.post(`/agent/proposals/${proposalId}/decision`, { approve });
      setMessages(prev => prev.map(message => message.proposalId === proposalId ? { ...message, pending: false, text: res.data.message, data: res.data.data || message.data } : message));
    } catch {
      setMessages(prev => [...prev, { text: 'PROPOSAL_DECISION_FAILED', sender: 'ai', error: true, timestamp: new Date().toISOString() }]);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/20 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Terminal className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tighter uppercase leading-none">Command Terminal</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Decision support // human approval required</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => { if(window.confirm('Wipe session?')) setMessages([]); }}
            className="px-4 py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
          >
            Clear Log
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="py-12">
          {messages.length === 0 && (
            <div className="h-[50vh] flex flex-col items-center justify-center text-slate-800 select-none">
              <Code size={80} strokeWidth={1} className="mb-6 opacity-20" />
              <p className="text-xs font-black uppercase tracking-[0.5em] opacity-40">Request an operational proposal</p>
            </div>
          )}
          {messages.map((m, i) => <LogEntry key={i} msg={m} onDecision={decideProposal} />)}
          {loading && (
            <div className="max-w-6xl mx-auto px-6 py-12 flex items-center gap-6 animate-pulse">
              <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500">
                <RefreshCw className="animate-spin" size={24} />
              </div>
              <div className="space-y-3 flex-1">
                <div className="h-4 bg-slate-800 rounded-full w-1/4" />
                <div className="h-8 bg-slate-800 rounded-2xl w-full" />
              </div>
            </div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* Input Console */}
      <div className="p-8 border-t border-slate-800 bg-slate-900/40 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSend} className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500/50 group-focus-within:text-blue-500 transition-colors">
              <Terminal size={24} />
            </div>
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="ENTER_COMMAND_SEQUENCE_..."
              className="w-full bg-slate-950 border-2 border-slate-800 group-focus-within:border-blue-600/50 rounded-3xl py-6 pl-16 pr-24 text-xl font-bold text-white focus:outline-none focus:ring-8 focus:ring-blue-600/5 transition-all placeholder:text-slate-800 placeholder:uppercase"
            />
            <button 
              type="submit"
              disabled={loading}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-600/30 disabled:opacity-20 flex items-center gap-3 transition-all active:scale-95"
            >
              EXECUTE
              <ChevronRight size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AICenter;
