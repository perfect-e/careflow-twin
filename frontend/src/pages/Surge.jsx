import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock3, Play, ShieldAlert } from 'lucide-react';
import api from '../api';

const Risk = ({ value }) => <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
  value === 'exhausted' || value === 'critical' ? 'bg-red-500/15 text-red-400' : value === 'watch' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
}`}>{value}</span>;

const CapacityCard = ({ title, data }) => data && <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
  <div className="flex items-center justify-between"><p className="text-sm font-bold text-white">{title}</p><Risk value={data.risk} /></div>
  <p className="text-4xl font-black text-white">{data.available}<span className="text-lg text-slate-500"> / {data.total}</span></p>
  <p className="text-xs text-slate-400 font-medium">beds available · {data.occupancy_rate}% projected occupancy</p>
  <div className="h-2 rounded bg-slate-800 overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${Math.min(data.occupancy_rate, 100)}%`}} /></div>
</div>;

export default function Surge() {
  const [forecast, setForecast] = useState(null);
  const [scenario, setScenario] = useState({ name: 'Evening ED surge', horizon_hours: 12, incoming_critical: 3, incoming_moderate: 12, incoming_low: 8 });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const load = async () => { try { const [f, h] = await Promise.all([api.post('/surge/forecast', { horizon_hours: 24, hourly_critical_arrivals: .25, hourly_moderate_arrivals: 1 }), api.get('/surge/scenarios')]); setForecast(f.data); setHistory(h.data); } catch {} };
  useEffect(() => { load(); }, []);
  const run = async (event) => { event.preventDefault(); const response = await api.post('/surge/scenarios', scenario); setResult(response.data.result); load(); };
  return <div className="p-8 max-w-7xl mx-auto space-y-8">
    <div><h2 className="text-4xl font-black text-white tracking-tight">Surge Command Twin</h2><p className="text-slate-400 mt-2 font-medium">Test capacity decisions before operational pressure becomes a crisis.</p></div>
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-sm text-blue-200 flex gap-3"><ShieldAlert className="shrink-0" />Planning support only. All outputs require clinical and operational review.</div>
    <section><div className="flex items-center gap-2 mb-4 text-slate-400 text-xs uppercase tracking-widest font-bold"><Clock3 size={14}/> 24-hour planning forecast</div><div className="grid md:grid-cols-2 gap-6"><CapacityCard title="ICU" data={forecast?.icu}/><CapacityCard title="General ward" data={forecast?.general}/></div></section>
    <div className="grid lg:grid-cols-2 gap-8"><form onSubmit={run} className="bg-slate-900 p-7 rounded-3xl border border-slate-800 space-y-5"><h3 className="text-xl font-bold text-white flex gap-2"><Activity className="text-blue-400"/> Create a surge scenario</h3><input required value={scenario.name} onChange={e=>setScenario({...scenario,name:e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white" placeholder="Scenario name"/><div className="grid grid-cols-2 gap-3">{[['incoming_critical','Critical arrivals'],['incoming_moderate','Moderate arrivals'],['incoming_low','Low-acuity arrivals'],['horizon_hours','Horizon (hours)']].map(([key,label])=><label key={key} className="text-xs text-slate-400">{label}<input type="number" min="0" value={scenario[key]} onChange={e=>setScenario({...scenario,[key]:Number(e.target.value)})} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"/></label>)}</div><button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex gap-2 justify-center"><Play size={18}/> Run simulation</button></form>
    <div className="bg-slate-900 p-7 rounded-3xl border border-slate-800"><h3 className="text-xl font-bold text-white mb-5">Scenario outcome</h3>{result ? <><div className="grid grid-cols-2 gap-3"><CapacityCard title="ICU" data={result.icu}/><CapacityCard title="General" data={result.general}/></div><ul className="mt-5 text-sm text-slate-300 space-y-2">{result.recommendations.map(x=><li key={x} className="flex gap-2"><AlertTriangle size={16} className="text-amber-400 shrink-0"/>{x}</li>)}</ul></> : <p className="text-slate-500">Run a scenario to see capacity and escalation recommendations.</p>}</div></div>
    <section className="bg-slate-900 rounded-3xl border border-slate-800 p-7"><h3 className="text-lg font-bold text-white mb-4">Recent planning scenarios</h3><div className="space-y-2">{history.map(item=><div key={item.id} className="flex justify-between p-3 bg-slate-950 rounded-xl text-sm"><span className="text-white font-medium">{item.name}</span><span className="text-slate-500">ICU {item.result.icu.available} available · General {item.result.general.available} available</span></div>)}{!history.length && <p className="text-slate-500 text-sm">No saved scenarios yet.</p>}</div></section>
  </div>;
}
