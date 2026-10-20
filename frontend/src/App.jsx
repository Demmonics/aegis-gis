import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import AuthGate from './components/AuthGate';
import TacticalMap from './components/TacticalMap';
import CorrelatorOscilloscope from './components/CorrelatorOscilloscope';
import DefenseMatrixHud from './components/DefenseMatrixHud';
import DiagnosticsView from './components/DiagnosticsView';
import IntegrityGisView from './components/IntegrityGisView';
import CopilotView from './components/CopilotView';
import PaperMatrixView from './components/PaperMatrixView';
import CinematicSimulationPlayer from './components/CinematicSimulationPlayer';

import {
  fetchHealth,
  fetchScenarios,
  runSimulation
} from './services/api';

import { Play, Pause, RotateCcw, Shield, Zap, AlertTriangle, Cpu, Film } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('command');

  // Simulation Controls State
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('baltic_maritime_c4ads');
  const [attackOverride, setAttackOverride] = useState('');
  const [powerAdvantageDb, setPowerAdvantageDb] = useState(3.0);
  const [enableEkf, setEnableEkf] = useState(true);

  // Playback Scrubber State
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Simulation Data State
  const [scenarioRun, setScenarioRun] = useState(null);
  const [loadingSim, setLoadingSim] = useState(false);

  const playbackTimerRef = useRef(null);

  // Load scenarios on mount
  useEffect(() => {
    fetchScenarios()
      .then(res => {
        setScenarios(res.scenarios || []);
      })
      .catch(err => console.error(err));
  }, []);

  // Trigger simulation whenever controls change
  const triggerSimulation = () => {
    setLoadingSim(true);
    runSimulation({
      scenario_id: selectedScenarioId,
      override_attack_type: attackOverride || null,
      spoof_power_advantage_db: powerAdvantageDb,
      enable_ekf_mitigation: enableEkf,
      total_epochs: 60
    })
      .then(data => {
        setScenarioRun(data);
        setCurrentEpoch(0);
        setLoadingSim(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingSim(false);
      });
  };

  useEffect(() => {
    triggerSimulation();
  }, [selectedScenarioId, attackOverride, powerAdvantageDb, enableEkf]);

  // Timeline playback loop
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setCurrentEpoch(prev => {
          if (prev >= 59) {
            setIsPlaying(false);
            return 59;
          }
          return prev + 1;
        });
      }, 350);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying]);

  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={(authData) => {
      setIsAuthenticated(true);
      setCurrentUser(authData.user);
    }} />;
  }

  const currentTelem = scenarioRun?.telemetry_epochs?.[currentEpoch] || null;
  const currentRecord = scenarioRun?.layered_defense_records?.[currentEpoch] || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={() => setIsAuthenticated(false)}
        user={currentUser}
      />

      <main className="flex-1 p-4 max-w-7xl mx-auto w-full flex flex-col">
        {activeTab === 'command' && (
          <div className="flex-1 flex flex-col space-y-3">
            {/* 1. Top Control Bar (Scenario, Attack Injector & Timeline Scrubber) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-3">
                {/* Scenario Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wider">
                    Incident Scenario (Sec 5)
                  </label>
                  <select
                    value={selectedScenarioId}
                    onChange={(e) => setSelectedScenarioId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="baltic_maritime_c4ads">Baltic Sea Tanker (C4ADS Runway Spoof - Sec 5.2)</option>
                    <option value="vilnius_aviation_adsb">Ryanair Vilnius ILS Approach (ADS-B Reset - Sec 5.1)</option>
                    <option value="uav_lidar_survey">UAV LiDAR Survey (RL Drift-Evasive - Sec 5.3)</option>
                    <option value="precision_ag_tractor">Nashik Vineyard RTK Tractor (Row Deviation - Sec 5.4)</option>
                  </select>
                </div>

                {/* Live Attack Override Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wider">
                    Attack Injection (Sec 4.2)
                  </label>
                  <select
                    value={attackOverride}
                    onChange={(e) => setAttackOverride(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Scenario Default</option>
                    <option value="AUTHENTIC">AUTHENTIC (Clean GNSS)</option>
                    <option value="SIMPLISTIC_NON_SYNC">SIMPLISTIC_NON_SYNC (Overpower)</option>
                    <option value="INTERMEDIATE_SYNC">INTERMEDIATE_SYNC (Pull-Off)</option>
                    <option value="SOPHISTICATED_RECEIVER_AWARE">SOPHISTICATED (Multi-Antenna)</option>
                    <option value="MEACONING">MEACONING (Replay Delay)</option>
                    <option value="NULLING_SUPPRESSION">NULLING_SUPPRESSION (Carrier Null)</option>
                    <option value="DRIFT_EVASIVE_UAV">DRIFT_EVASIVE_UAV (Sub-threshold)</option>
                  </select>
                </div>

                {/* Spoofer Power Slider */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                    Power Adv: <span className="text-cyan-400 font-bold">+{powerAdvantageDb} dB</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={powerAdvantageDb}
                    onChange={(e) => setPowerAdvantageDb(parseFloat(e.target.value))}
                    className="w-24 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                {/* EKF Mitigation Toggle */}
                <div className="flex items-center gap-1.5 pt-3">
                  <input
                    type="checkbox"
                    id="ekfToggle"
                    checked={enableEkf}
                    onChange={(e) => setEnableEkf(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="ekfToggle" className="text-xs text-slate-300 cursor-pointer select-none">
                    EKF Recovery
                  </label>
                </div>

                {/* Grand Finale Animated Simulation Launch Button */}
                <button
                  onClick={() => setActiveTab('cinematic')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/50 text-amber-300 hover:text-white hover:from-amber-500/30 hover:to-red-500/30 shadow-md transition-all font-mono text-xs font-bold animate-pulse"
                  title="Launch Baltic Sea Maritime Spoofing Cinematic Animation"
                >
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <span>🎬 Launch Baltic Sea Spoofing Animation</span>
                </button>
              </div>

              {/* Scrubber Playback Controls */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-1.5 rounded-md ${isPlaying ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'} hover:bg-cyan-500/30 transition-colors`}
                  title={isPlaying ? 'Pause' : 'Play Timeline'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setIsPlaying(false); setCurrentEpoch(0); }}
                  className="p-1.5 rounded-md bg-slate-800 text-slate-300 hover:text-white"
                  title="Reset to Epoch 0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="59"
                    value={currentEpoch}
                    onChange={(e) => setCurrentEpoch(parseInt(e.target.value))}
                    className="w-32 md:w-44 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[11px] font-bold text-cyan-300 min-w-[55px] text-right">
                    T={currentEpoch}s / 59s
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Main Middle Workspace: Tactical WebGIS (Left) & RF Oscilloscope (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[460px]">
              {/* Center-Left: Tactical WebGIS Map */}
              <div className="lg:col-span-7 h-[460px] lg:h-auto min-h-[400px]">
                <TacticalMap
                  scenarioRun={scenarioRun}
                  currentEpoch={currentEpoch}
                />
              </div>

              {/* Center-Right: RF Correlator Peak & Telemetry Oscilloscopes */}
              <div className="lg:col-span-5 flex flex-col min-h-[400px]">
                <CorrelatorOscilloscope
                  telemetryEpoch={currentTelem}
                  allTelemetry={scenarioRun?.telemetry_epochs || []}
                  currentEpoch={currentEpoch}
                />
              </div>
            </div>

            {/* 3. Bottom Strip: 5-Layer Defense Matrix HUD (Table 2 of Paper) */}
            <div>
              <DefenseMatrixHud currentRecord={currentRecord} />
            </div>
          </div>
        )}

        {activeTab === 'cinematic' && (
          <CinematicSimulationPlayer
            scenarioRun={scenarioRun}
            onClose={() => setActiveTab('command')}
          />
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticsView />
        )}

        {activeTab === 'gis' && (
          <IntegrityGisView
            scenarioRun={scenarioRun}
            currentEpoch={currentEpoch}
          />
        )}

        {activeTab === 'copilot' && (
          <CopilotView
            scenarioRun={scenarioRun}
            currentEpoch={currentEpoch}
          />
        )}

        {activeTab === 'paper' && (
          <PaperMatrixView
            onJumpTab={(tabId) => setActiveTab(tabId)}
          />
        )}
      </main>
    </div>
  );
}
