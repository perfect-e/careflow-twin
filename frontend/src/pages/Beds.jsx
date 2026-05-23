import React, { useState, useEffect } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { Bed, Filter, CheckCircle, XCircle } from 'lucide-react';

const Beds = () => {
  const [beds, setBeds] = useState([]);
  const [dept, setDept] = useState('ICU');
  const [includeOccupied, setIncludeOccupied] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchBeds = async () => {
    setLoading(true);
    try {
      const res = await api.post('/get_available_beds', { 
        department: dept, 
        include_occupied: includeOccupied 
      });
      setBeds(res.data.body.beds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, [dept, includeOccupied]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">Beds & Resources</h2>
          <p className="text-slate-400 mt-2 font-medium">Real-time inventory of hospital bed allocation.</p>
        </div>
      </div>

      <div className="flex gap-4 bg-slate-900 p-4 rounded-3xl border border-slate-800">
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          {['ICU', 'GENERAL'].map(d => (
            <button
              key={d}
              onClick={() => setDept(d)}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                dept === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        
        <label className="flex items-center gap-3 px-6 cursor-pointer group">
          <input 
            type="checkbox" 
            checked={includeOccupied} 
            onChange={e => setIncludeOccupied(e.target.checked)}
            className="hidden"
          />
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            includeOccupied ? 'bg-blue-600 border-blue-600' : 'border-slate-700'
          }`}>
            {includeOccupied && <CheckCircle size={12} className="text-white" />}
          </div>
          <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">Include Occupied</span>
        </label>

        <div className="ml-auto flex items-center gap-6 pr-4">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Available</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-700 rounded-full" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Occupied</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {beds.map((bed, i) => (
          <motion.div
            key={bed.bed_id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            className={`p-6 rounded-3xl border-2 flex flex-col items-center justify-center gap-4 transition-all hover:-translate-y-1 ${
              bed.status === 'available' 
                ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50' 
                : 'bg-slate-900 border-slate-800 opacity-60'
            }`}
          >
            <div className={`p-3 rounded-2xl ${
              bed.status === 'available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-600'
            }`}>
              <Bed size={24} />
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-white uppercase tracking-tighter">{bed.bed_id}</p>
              <p className={`text-[10px] font-bold mt-1 uppercase tracking-widest ${
                bed.status === 'available' ? 'text-emerald-500' : 'text-slate-600'
              }`}>{bed.status}</p>
            </div>
            {bed.patient_id && (
              <div className="mt-2 px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {bed.patient_id}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Beds;
