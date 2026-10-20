import React, { useState } from 'react';
import { Shield, Lock, Terminal, Cpu, CheckCircle2, ChevronRight, UserCheck } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default function AuthGate({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDemoBypass = () => {
    onAuthenticated({
      user: { email: 'evaluator@somaiya.edu', role: 'KJSCE Professor / Evaluator' },
      isDemo: true
    });
  };

  const handleSupabaseAuth = async (isSignUp = false) => {
    if (!supabase) {
      handleDemoBypass();
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      onAuthenticated({ user: data.user, isDemo: false });
    } catch (err) {
      setErrorMsg(err.message || 'Authentication error. Use 1-Click Evaluator Mode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 bg-slate-900/90 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
        {/* Emblem & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 animate-radar">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-mono flex items-center justify-center gap-2">
            AEGIS-GIS <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">v1.0</span>
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mt-1">When Location Lies</p>
          <p className="text-xs text-slate-400 mt-2">
            K.J. Somaiya College of Engineering • Dept. of AI & DS<br />
            <span className="text-slate-500 text-[11px]">Batch B2: Yoosha, Yash, Parth, Tanishq</span>
          </p>
        </div>

        {/* 1-Click Professor Evaluator Mode (Top Glowing Button) */}
        <div className="mb-6 p-1 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 shadow-lg shadow-cyan-500/20">
          <button
            onClick={handleDemoBypass}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 group text-sm"
          >
            <UserCheck className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Launch KJSCE Professor / Evaluator Mode</span>
            <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-[10px] text-center text-slate-400 py-1 bg-slate-900/60 rounded-b-lg">
            ⚡ 1-Click Instant Access • Bypasses Email Confirmation
          </p>
        </div>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-xs uppercase tracking-wider text-slate-500 font-mono">Or Supabase Auth</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Standard Form */}
        <div className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Somaiya Email / User ID</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yoosha@somaiya.edu"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Defense Clearance Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleSupabaseAuth(false)}
              disabled={loading}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => handleSupabaseAuth(true)}
              disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 rounded-lg text-xs transition-colors"
            >
              Register
            </button>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 5-Layer Defense
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-purple-400" /> Local Qwen-4B
          </span>
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-cyan-400" /> PyQGIS Ready
          </span>
        </div>
      </div>
    </div>
  );
}
