import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  Radio,
  Cpu,
  Sparkles,
  Terminal,
  X,
  Play,
  Pause,
  Key,
  Compass,
  CheckCircle,
  HelpCircle,
  GraduationCap
} from 'lucide-react';

// Web Audio API Sound Synthesizer (Zero external assets required)
const playTone = (freq, type = 'sine', duration = 0.15, vol = 0.1) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
};

const playCyberAlert = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
};

const playRecoveryChime = () => {
  try {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => playTone(freq, 'sine', 0.25, 0.15), idx * 80);
    });
  } catch (e) {}
};

export default function VivaControlPanel({
  isOpen,
  onClose,
  onInjectAttack,
  onTriggerRecovery,
  onResetSystem,
  currentEpoch = 0,
  setCurrentEpoch = () => {},
  attackActive = false,
  ekfActive = true,
  selectedScenario = 'baltic_maritime_c4ads',
  onSelectScenario = () => {},
  activeTab = 'command',
  setActiveTab = () => {}
}) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeSubView, setActiveSubView] = useState('godmode'); // 'godmode' or 'cheatsheet'

  // Viva Defense Cheat Sheet talking points (KJSCE Viva Q&A)
  const vivaTalkingPoints = [
    {
      author: 'Yoosha (16014224101)',
      topic: 'Section 2 & 3: WGS-84 / ECEF & Why GIS Lies',
      answer:
        'Civilian GNSS L1 C/A (1575.42 MHz) has no cryptographic authentication. An attacker broadcasting with +3 dB advantage forces the tracking loops to lock onto false code phase. Reprojecting to UTM simply projects a false coordinate into another coordinate system.'
    },
    {
      author: 'Yash (16014224077)',
      topic: 'Section 4: 6-Attack Taxonomy & Correlator Distortion',
      answer:
        'Simplistic non-coherent attacks create sudden 450m clock jumps detectable by SQM. Intermediate synchronous attacks subtly shift the cross-correlation peak triangle, producing asymmetry ratio M_Δ > 0.15.'
    },
    {
      author: 'Parth (16014224095)',
      topic: 'Section 5: Real-World Case Studies (Aviation, Maritime, UAV, Ag)',
      answer:
        'Baltic Sea C4ADS (2024): 100k DWT tanker teleported 14.8km inland onto airport runway. Vilnius (2025): B737 ILS descent aborted due to false GPWS pull-up alarm.'
    },
    {
      author: 'Tanishq (16014224099)',
      topic: 'Section 6 & 8: 5-Layer Defense & PyQGIS Integrity Pipeline',
      answer:
        'Defense uses Layer 1 SQM (<1ms), Layer 2 DoA (azimuth collapse <12°), Layer 3 Galileo OS-NMA, Layer 4 INS/GNSS EKF (Mahalanobis innovation gating γ > 9.21), and Layer 5 ML (98.8% accuracy).'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-950 border-2 border-cyan-500/80 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(6,182,212,0.5)] overflow-hidden flex flex-col font-mono text-slate-100">
        {/* Header Bar */}
        <div className="bg-slate-900/90 border-b border-cyan-500/40 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/50">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-widest text-cyan-300">
                  AEGIS-GIS // PROFESSOR VIVA GOD MODE
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Ctrl+Shift+P
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Department of AI & DS • K.J. Somaiya College of Engineering
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playTone(880, 'sine', 0.1);
              }}
              className={`p-1.5 rounded border transition text-xs ${
                soundEnabled
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
              title="Toggle Audio Feedback"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: God Mode vs Viva Cheat Sheet */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
          <button
            onClick={() => setActiveSubView('godmode')}
            className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeSubView === 'godmode'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>INSTANT DEMO TRIGGERS</span>
          </button>
          <button
            onClick={() => setActiveSubView('cheatsheet')}
            className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeSubView === 'cheatsheet'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>VIVA CHEAT SHEET & ANSWERS</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {activeSubView === 'godmode' ? (
            <>
              {/* Top Warning Banner */}
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-[11px] text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">Current Simulation State:</span>
                <span className={`font-bold px-2 py-0.5 rounded border text-[10px] ${
                  attackActive
                    ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {attackActive ? '⚠️ ATTACK ACTIVE (EPOCH ' + currentEpoch + ')' : 'AUTHENTIC (EPOCH ' + currentEpoch + ')'}
                </span>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Inject Attack NOW */}
                <button
                  onClick={() => {
                    if (soundEnabled) playCyberAlert();
                    onInjectAttack();
                  }}
                  className="p-3 rounded-xl bg-red-950/80 hover:bg-red-900 border-2 border-red-500/80 text-red-200 flex flex-col items-center justify-center text-center gap-2 transition shadow-[0_0_20px_rgba(239,68,68,0.4)] group active:scale-95 cursor-pointer"
                >
                  <ShieldAlert className="w-7 h-7 text-red-400 group-hover:scale-110 transition" />
                  <div>
                    <div className="font-bold text-xs uppercase tracking-wider text-red-300">
                      [INJECT SPOOFING ATTACK NOW]
                    </div>
                    <div className="text-[10px] text-red-400/80 mt-0.5">
                      Overrides physics into active pull-off
                    </div>
                  </div>
                </button>

                {/* 2. Trigger Sensor Fusion Recovery */}
                <button
                  onClick={() => {
                    if (soundEnabled) playRecoveryChime();
                    onTriggerRecovery();
                  }}
                  className="p-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border-2 border-emerald-500/80 text-emerald-200 flex flex-col items-center justify-center text-center gap-2 transition shadow-[0_0_20px_rgba(16,185,129,0.4)] group active:scale-95 cursor-pointer"
                >
                  <Shield className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition" />
                  <div>
                    <div className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                      [TRIGGER SENSOR FUSION RECOVERY]
                    </div>
                    <div className="text-[10px] text-emerald-400/80 mt-0.5">
                      Activates Layer 4 EKF + INS Backup
                    </div>
                  </div>
                </button>

                {/* 3. Reset System */}
                <button
                  onClick={() => {
                    if (soundEnabled) playTone(440, 'triangle', 0.2);
                    onResetSystem();
                  }}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-slate-200 flex flex-col items-center justify-center text-center gap-2 transition group active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-7 h-7 text-cyan-400 group-hover:rotate-180 transition duration-300" />
                  <div>
                    <div className="font-bold text-xs uppercase tracking-wider text-slate-300">
                      [RESET SYSTEM]
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Clears anomalies & resets to Epoch 0
                    </div>
                  </div>
                </button>
              </div>

              {/* Fast Jump Matrix */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Presenter Fast-Jump Matrix</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    onClick={() => {
                      onSelectScenario('vilnius_aviation_adsb');
                      setActiveTab('cinematic');
                      setCurrentEpoch(25);
                      onClose();
                    }}
                    className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-left transition"
                  >
                    <div className="font-bold text-white">✈️ Aviation</div>
                    <div className="text-[10px] text-slate-400">Vilnius Go-Around</div>
                  </button>
                  <button
                    onClick={() => {
                      onSelectScenario('baltic_maritime_c4ads');
                      setActiveTab('cinematic');
                      setCurrentEpoch(30);
                      onClose();
                    }}
                    className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-left transition"
                  >
                    <div className="font-bold text-white">⚓ Maritime</div>
                    <div className="text-[10px] text-slate-400">Baltic Sea Teleport</div>
                  </button>
                  <button
                    onClick={() => {
                      onSelectScenario('uav_lidar_survey');
                      setActiveTab('cinematic');
                      setCurrentEpoch(20);
                      onClose();
                    }}
                    className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-left transition"
                  >
                    <div className="font-bold text-white">🛸 UAV Drone</div>
                    <div className="text-[10px] text-slate-400">Drift Evasion</div>
                  </button>
                  <button
                    onClick={() => {
                      onSelectScenario('precision_ag_tractor');
                      setActiveTab('cinematic');
                      setCurrentEpoch(25);
                      onClose();
                    }}
                    className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-left transition"
                  >
                    <div className="font-bold text-white">🚜 Precision Ag</div>
                    <div className="text-[10px] text-slate-400">Vine Row Breach</div>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Viva Cheat Sheet Subview */
            <div className="space-y-3">
              <div className="text-[11px] text-slate-400 pb-1 border-b border-slate-800">
                Key technical answers matched to the KJSCE Research Paper sections for instant recall during viva examination:
              </div>
              {vivaTalkingPoints.map((tp, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-cyan-400">{tp.author}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{tp.topic}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {tp.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info strip */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400">
          <span>Press <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-bold">Esc</kbd> or <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-bold">Ctrl+Shift+P</kbd> to toggle</span>
          <span className="text-emerald-400 font-bold">● VIVA READY SYSTEM ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
