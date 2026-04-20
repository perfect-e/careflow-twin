import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { motion } from 'framer-motion';
import { Activity, User, Key, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(username, password, role);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-10 shadow-2xl">
          <Link to="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest mb-8 transition-colors">
            <ArrowLeft size={16} /> Back to Login
          </Link>

          <div className="text-left mb-10">
            <h1 className="text-3xl font-black text-white tracking-tight">Create Account</h1>
            <p className="text-slate-400 mt-2 font-medium">CareFlow Twin access is provisioned by an administrator.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm font-bold"
            >
              Registration successful! Redirecting to login...
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-4">Username</label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">
                  <User size={18} />
                </div>
                <input 
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  placeholder="Choose a username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-4">Password</label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">
                  <Key size={18} />
                </div>
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-4">Role</label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">
                  <ShieldCheck size={18} />
                </div>
                <select 
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium appearance-none"
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading || success}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
