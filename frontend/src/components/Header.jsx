import React from 'react';
import { SlidersHorizontal, LogOut } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, onLogout, user, onOpenVivaPanel }) {
  const tabs = [
    { id: 'command', label: 'Tactical Cartography & RF Analysis' },
    { id: 'cinematic', label: 'Global Incident Simulations' },
    { id: 'diagnostics', label: 'Model Diagnostics (Table 2)' },
    { id: 'gis', label: 'GIS Topology & PyQGIS (Sec 8.4)' },
    { id: 'paper', label: 'Research Paper & Poster Matrix' },
    { id: 'copilot', label: 'Forensic Copilot' },
  ];

  return (
    <header className="bg-[#fcfbf9] border-b border-[#dfdbd1] sticky top-0 z-50">
      {/* Top Banner: Instrument Metadata and Status */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#eae7de]">
        <div>
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-semibold text-lg text-[#191c1d] tracking-tight">
              AEGIS-GIS
            </h1>
            <span className="text-xs text-[#5e6265]">
              GNSS Spoofing Detection, Sensor Fusion & Integrity-Aware GIS Pipeline
            </span>
          </div>
          <p className="text-xs text-[#707477] mt-0.5">
            Department of Artificial Intelligence & Data Science, K.J. Somaiya College of Engineering • Batch B2
          </p>
        </div>

        {/* Quiet Cartographic Telemetry & Expert Console Button */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-[#f0eee7] text-[#2d3133] border border-[#dfdbd1] tabular-nums">
            <span className="inline-block w-2 h-2 rounded-full bg-[#1d4e3e] mr-1.5 align-middle"></span>
            GNSS L1 C/A locked
          </span>
          <span className="px-2.5 py-1 rounded bg-[#f0eee7] text-[#2d3133] border border-[#dfdbd1] tabular-nums">
            Ensemble: 99.93%
          </span>
          <button
            onClick={onOpenVivaPanel}
            title="Open Expert View & Evaluator Console (Ctrl+Shift+P)"
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#f0eee7] hover:bg-[#e6e3da] text-[#191c1d] border border-[#dfdbd1] font-medium transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#16697a]" />
            <span>Expert view</span>
          </button>
          <button
            onClick={onLogout}
            title="Sign Out to Evaluator Selection"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#fcfbf9] hover:bg-[#f0eee7] border border-[#dfdbd1] text-[#5e6265] hover:text-[#191c1d] transition-colors"
          >
            <LogOut className="w-3 h-3" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs with Underline Bar & Zero Overflow Clipping */}
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-1 pt-1.5 pb-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium transition-colors relative whitespace-nowrap ${
                isActive
                  ? 'text-[#191c1d] font-semibold'
                  : 'text-[#5e6265] hover:text-[#191c1d]'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#16697a] rounded-t-sm" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
