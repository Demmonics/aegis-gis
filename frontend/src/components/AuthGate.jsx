import React, { useState } from 'react';
import { Compass, Lock, ChevronRight, UserCheck } from 'lucide-react';
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
    <div className="min-h-screen bg-[#f6f5f0] text-[#191c1d] flex flex-col justify-center items-center p-4 font-sans">
      <div className="max-w-md w-full bg-[#ffffff] border border-[#dfdbd1] rounded p-6 relative">
        {/* Emblem & Title */}
        <div className="text-center mb-6 border-b border-[#eae7de] pb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-[#edf4f0] text-[#1d4e3e] mb-3 border border-[#dfdbd1]">
            <Compass className="w-6 h-6 text-[#16697a]" />
          </div>
          <h1 className="text-lg font-semibold text-[#191c1d] flex items-center justify-center gap-2">
            AEGIS-GIS Instrument
            <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-[#f0eee7] text-[#5e6265] border border-[#dfdbd1]">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-[#5e6265] mt-1">Geodetic and GNSS Signal Authenticity Framework</p>
          <p className="text-[11px] text-[#707477] mt-1">
            Department of AI & Data Science • K.J. Somaiya College of Engineering
          </p>
        </div>

        {/* 1-Click Professor Evaluator Mode */}
        <div className="mb-5">
          <button
            onClick={handleDemoBypass}
            className="w-full bg-[#16697a] hover:bg-[#125361] text-white font-medium py-2.5 px-4 rounded text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            <span>Launch KJSCE evaluator console</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
          <div className="flex items-center justify-between text-[11px] text-[#707477] mt-1.5 px-0.5">
            <span>Direct evaluation bypass</span>
            <span className="text-[#1d4e3e] font-medium">Ready for demonstration</span>
          </div>
        </div>

        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-[#eae7de]"></div>
          <span className="flex-shrink mx-3 text-[11px] text-[#707477]">Or sign in with Somaiya credentials</span>
          <div className="flex-grow border-t border-[#eae7de]"></div>
        </div>

        {/* Standard Form */}
        <div className="space-y-3">
          {errorMsg && (
            <div className="p-2.5 rounded bg-[#fbf0ef] border border-[#f5c6cb] text-[#b82e2b] text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#2d3133] mb-1">Institutional email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="evaluator@somaiya.edu"
              className="w-full bg-[#f4f6f8] border border-[#dfdbd1] rounded px-3 py-2 text-xs text-[#191c1d] placeholder-[#8a8e91] focus:outline-none focus:border-[#16697a] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#2d3133] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#f4f6f8] border border-[#dfdbd1] rounded px-3 py-2 text-xs text-[#191c1d] placeholder-[#8a8e91] focus:outline-none focus:border-[#16697a] transition-colors"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleSupabaseAuth(false)}
              disabled={loading}
              className="flex-1 bg-[#1d4e3e] hover:bg-[#163d30] text-white font-medium py-2 rounded text-xs transition-colors flex items-center justify-center gap-1"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign in</span>
            </button>
            <button
              onClick={() => handleSupabaseAuth(true)}
              disabled={loading}
              className="flex-1 bg-[#f0eee7] hover:bg-[#e6e3da] text-[#191c1d] border border-[#dfdbd1] font-medium py-2 rounded text-xs transition-colors"
            >
              Register
            </button>
          </div>
        </div>

        {/* Feature Attribution */}
        <div className="mt-5 pt-3 border-t border-[#eae7de] flex justify-between items-center text-[11px] text-[#5e6265]">
          <span>5-Layer defense</span>
          <span>Local Qwen-4B RAG</span>
          <span>PyQGIS export</span>
        </div>
      </div>
    </div>
  );
}
