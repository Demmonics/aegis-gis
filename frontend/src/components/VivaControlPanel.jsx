import React, { useState } from 'react';
import { SlidersHorizontal, X, RotateCcw, Shield, ShieldAlert, BookOpen } from 'lucide-react';

export default function VivaControlPanel({
  isOpen,
  onClose,
  onInjectSpoofing,
  onTriggerFusion,
  onResetSystem
}) {
  const [activeTab, setActiveTab] = useState('controls');

  if (!isOpen) return null;

  const vivaQuestions = [
    {
      q: 'Why does commercial GNSS fail to prevent intermediate spoofing?',
      a: 'Civil L1 C/A uses public PRN codes (Gold codes 1023 bits) without cryptographic authentication. An attacker broadcasting with +3dB power advantage pulls the DLL tracking loop without causing a loss-of-lock alert unless multi-layer integrity monitoring is deployed.'
    },
    {
      q: 'How does Layer 4 EKF detect spoofing?',
      a: 'The Extended Kalman Filter fuses GNSS pseudoranges with IMU/INS dead-reckoning. During spoofing, innovation residuals jump abruptly. When the Mahalanobis distance γ = νᵀ S⁻¹ ν exceeds the chi-square threshold (9.21 for p=0.01), GNSS is rejected and INS dead reckoning takes over.'
    },
    {
      q: 'What is the function of the Section 8.4 GIS integrity pipeline?',
      a: 'Standard GIS pipelines blindly ingest reported coordinates. AEGIS attaches 12 integrity metadata attributes (integrity_flags, covariance_ellipse, quarantine_status) to GeoJSON/Shapefiles, allowing PyQGIS and spatial databases to automatically isolate and quarantine corrupted observations.'
    }
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#ffffff] border border-[#dfdbd1] rounded max-w-xl w-full overflow-hidden flex flex-col font-sans text-[#191c1d]">
        {/* Modal Header */}
        <div className="bg-[#fcfbf9] border-b border-[#dfdbd1] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#16697a]" />
            <div>
              <h2 className="text-sm font-semibold text-[#191c1d]">
                Expert view: Evaluator console
              </h2>
              <p className="text-[11px] text-[#5e6265]">
                Direct presentation triggers and technical oral defense reference (Ctrl+Shift+P)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#5e6265] hover:text-[#191c1d] hover:bg-[#f0eee7] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quiet Sub-Navigation */}
        <div className="flex border-b border-[#dfdbd1] bg-[#fcfbf9] text-xs">
          <button
            onClick={() => setActiveTab('controls')}
            className={`flex-1 py-2 font-medium text-center transition-colors ${
              activeTab === 'controls'
                ? 'text-[#191c1d] border-b-2 border-[#16697a] bg-[#ffffff]'
                : 'text-[#5e6265] hover:text-[#191c1d]'
            }`}
          >
            Demonstration triggers
          </button>
          <button
            onClick={() => setActiveTab('viva')}
            className={`flex-1 py-2 font-medium text-center transition-colors ${
              activeTab === 'viva'
                ? 'text-[#191c1d] border-b-2 border-[#16697a] bg-[#ffffff]'
                : 'text-[#5e6265] hover:text-[#191c1d]'
            }`}
          >
            Viva defense reference
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {activeTab === 'controls' ? (
            <>
              <p className="text-[#5e6265] leading-relaxed">
                Use these direct triggers to demonstrate real-time physical layer spoofing attacks and automatic EKF sensor fusion recovery in front of the viva examiners.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                {/* 1. Inject Spoofing Attack */}
                <button
                  onClick={() => {
                    onInjectSpoofing();
                    onClose();
                  }}
                  className="p-3 rounded border border-[#e8b5b5] bg-[#fdf2f2] hover:bg-[#fbe4e4] text-left transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 mb-2 text-[#b82e2b]">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="font-semibold text-xs">Inject spoofing attack</span>
                  </div>
                  <p className="text-[11px] text-[#5e6265] leading-tight">
                    Overrides current receiver state into intermediate synchronized pull-off.
                  </p>
                </button>

                {/* 2. Trigger Sensor Fusion Recovery */}
                <button
                  onClick={() => {
                    onTriggerFusion();
                    onClose();
                  }}
                  className="p-3 rounded border border-[#dfdbd1] bg-[#f0eee7] hover:bg-[#e6e3da] text-left transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 mb-2 text-[#16697a]">
                    <Shield className="w-4 h-4" />
                    <span className="font-semibold text-xs">Trigger EKF recovery</span>
                  </div>
                  <p className="text-[11px] text-[#5e6265] leading-tight">
                    Activates Layer 4 EKF Mahalanobis innovation gating to reject false GNSS.
                  </p>
                </button>

                {/* 3. Reset System */}
                <button
                  onClick={() => {
                    onResetSystem();
                    onClose();
                  }}
                  className="p-3 rounded border border-[#dfdbd1] bg-[#ffffff] hover:bg-[#f0eee7] text-left transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 mb-2 text-[#191c1d]">
                    <RotateCcw className="w-4 h-4" />
                    <span className="font-semibold text-xs">Reset to nominal</span>
                  </div>
                  <p className="text-[11px] text-[#5e6265] leading-tight">
                    Clears injected anomalies and resets simulation timeline to epoch 0.
                  </p>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#191c1d] pb-1 border-b border-[#eae7de]">
                <BookOpen className="w-4 h-4 text-[#16697a]" />
                <span>Examiner questions and technical answers</span>
              </div>
              {vivaQuestions.map((q, idx) => (
                <div key={idx} className="bg-[#fcfbf9] border border-[#dfdbd1] p-3 rounded">
                  <h4 className="font-semibold text-xs text-[#191c1d] mb-1">
                    {idx + 1}. {q.q}
                  </h4>
                  <p className="text-[11px] text-[#5e6265] leading-relaxed">
                    {q.a}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#fcfbf9] border-t border-[#dfdbd1] px-4 py-2.5 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#f0eee7] hover:bg-[#e6e3da] text-[#191c1d] text-xs font-medium border border-[#dfdbd1] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
