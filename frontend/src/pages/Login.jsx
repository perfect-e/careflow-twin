import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { motion } from 'framer-motion';
import { Activity, Lock, User, Key } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-10 shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20">
              <Activity className="text-white" size={32} />
            </div>
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-white tracking-tight">Welcome Back</h1>
            <p className="text-slate-400 mt-2 font-medium">CareFlow Twin Surge Command</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold flex items-center gap-3"
            >
              <Lock size={18} />
              {error}
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
                  placeholder="admin"
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

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <Activity size={18} className="group-hover:animate-pulse" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center space-y-4">
            <p className="text-sm text-slate-400 font-medium">Accounts are provisioned by a CareFlow administrator.</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Operational planning prototype v2.0</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
