import React from 'react';
import { Shield, Navigation, BarChart3, Database, MessageSquareCode, FileText, Film, LogOut, CheckCircle, Cpu } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, onLogout, user }) {
  const tabs = [
    { id: 'command', label: 'Tactical GIS & RF Command', icon: Navigation },
    { id: 'cinematic', label: '🎬 Baltic Spoofing Cinema', icon: Film },
    { id: 'diagnostics', label: 'ML & Table 2 Diagnostics', icon: BarChart3 },
    { id: 'gis', label: 'Section 8.4 GIS & PyQGIS', icon: Database },
    { id: 'copilot', label: 'Qwen-4B RAG Copilot', icon: MessageSquareCode },
    { id: 'paper', label: 'KJSCE Paper & Poster Matrix', icon: FileText },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      {/* Top Banner with Brand and Telemetry Pills */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base text-white tracking-wider">AEGIS-GIS</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                When Location Lies
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              K.J. Somaiya College of Engineering • Dept. of AI & DS • Batch B2 (Yoosha, Yash, Parth, Tanishq)
            </p>
          </div>
        </div>

        {/* Live System Status Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-purple-500/30 text-purple-300">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Qwen-4B Local Edge AI</span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-cyan-500/30 text-cyan-300">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Qdrant: 2 Collections</span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-emerald-500/30 text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>ML Accuracy: 98.8%</span>
          </span>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            <span className="text-[10px]">Exit</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto space-x-1 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
