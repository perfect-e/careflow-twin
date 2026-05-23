import React, { useState, useEffect } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Filter, Trash2, UserPlus, X, CheckCircle2 } from 'lucide-react';

const AdmitModal = ({ isOpen, onClose, onRefresh }) => {
  const [formData, setFormData] = useState({
    patient_name: '',
    age: '',
    condition: '',
    severity: 'moderate'
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admit_patient', {
        ...formData,
        age: parseInt(formData.age)
      });
      onRefresh();
      onClose();
      setFormData({ patient_name: '', age: '', condition: '', severity: 'moderate' });
    } catch (err) {
      alert('Admission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[40px] p-10 relative shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
          <X size={24} />
        </button>
        <h3 className="text-2xl font-black text-white mb-8">Patient Admission</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Full Name</label>
            <input 
              required
              value={formData.patient_name}
              onChange={e => setFormData({...formData, patient_name: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white focus:border-blue-500 focus:outline-none transition-all"
              placeholder="e.g. John Doe"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Age</label>
              <input 
                required
                type="number"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white focus:border-blue-500 focus:outline-none transition-all"
                placeholder="25"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Severity</label>
              <select 
                value={formData.severity}
                onChange={e => setFormData({...formData, severity: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white focus:border-blue-500 focus:outline-none transition-all font-bold text-xs uppercase"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Condition</label>
            <textarea 
              required
              value={formData.condition}
              onChange={e => setFormData({...formData, condition: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white focus:border-blue-500 focus:outline-none transition-all h-24"
              placeholder="Brief description of diagnosis..."
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
              <>
                Confirm Admission
                <CheckCircle2 size={18} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients');
      setPatients(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleUpdateSeverity = async (id, severity) => {
    try {
      await api.post('/update_patient_status', { patient_id: id, new_severity: severity });
      fetchPatients();
    } catch (err) {
      alert('Failed to update severity');
    }
  };

  const handleDischarge = async (id) => {
    if (!window.confirm('Are you sure you want to discharge this patient?')) return;
    try {
      await api.post('/discharge_patient', { patient_id: id, discharge_reason: 'Recovered' });
      fetchPatients();
    } catch (err) {
      alert('Failed to discharge patient');
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <AdmitModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchPatients} 
      />
      
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">Patient Registry</h2>
          <p className="text-slate-400 mt-2 font-medium">Manage hospital admissions and patient status.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all"
        >
          <UserPlus size={20} /> Admit Patient
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
        <button className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-colors">
          <Filter size={20} />
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/30">
              <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Patient</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Location</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Severity</th>
              <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredPatients.map((patient) => (
                <motion.tr 
                  key={patient.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group"
                >
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 font-bold">
                        {patient.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-white">{patient.name}</p>
                        <p className="text-xs text-slate-500 font-mono uppercase">{patient.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      patient.status === 'admitted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-sm font-medium text-slate-300">
                    {patient.department} <span className="text-slate-600 ml-1">({patient.assigned_bed})</span>
                  </td>
                  <td className="px-6 py-6">
                    <select 
                      value={patient.triage}
                      onChange={(e) => handleUpdateSeverity(patient.id, e.target.value)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:outline-none focus:border-blue-500 transition-all ${
                        patient.triage === 'critical' ? 'text-red-500' : 
                        patient.triage === 'moderate' ? 'text-amber-500' : 'text-emerald-500'
                      }`}
                    >
                      <option value="low">LOW</option>
                      <option value="moderate">MODERATE</option>
                      <option value="critical">CRITICAL</option>
                    </select>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDischarge(patient.id)}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filteredPatients.length === 0 && !loading && (
          <div className="p-20 text-center">
            <Users className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-500 font-medium">No patients found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Patients;
