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
import SimulationPlayer from './components/SimulationPlayer';
import VivaControlPanel from './components/VivaControlPanel';

import {
  fetchHealth,
  fetchScenarios,
  runSimulation
} from './services/api';

import { Play, Pause, RotateCcw } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('aegis_auth');
    return saved !== 'false';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('aegis_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { email: 'evaluator@somaiya.edu', role: 'KJSCE Professor / Evaluator' };
  });
  const [activeTab, setActiveTab] = useState('command');
  const [isVivaPanelOpen, setIsVivaPanelOpen] = useState(false);

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

  // Keyboard Shortcut: Ctrl+Shift+P for Expert Console
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setIsVivaPanelOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isVivaPanelOpen) {
        setIsVivaPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVivaPanelOpen]);

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

  const handleReset = () => {
    setCurrentEpoch(0);
    setIsPlaying(false);
  };

  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={(authData) => {
      localStorage.setItem('aegis_auth', 'true');
      if (authData?.user) {
        localStorage.setItem('aegis_user', JSON.stringify(authData.user));
        setCurrentUser(authData.user);
      }
      setIsAuthenticated(true);
    }} />;
  }

  const currentTelem = scenarioRun?.telemetry_epochs?.[currentEpoch] || null;
  const currentRecord = scenarioRun?.layered_defense_records?.[currentEpoch] || null;

  return (
    <div className="min-h-screen bg-[#f6f5f0] text-[#191c1d] flex flex-col font-sans antialiased">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={() => {
          localStorage.setItem('aegis_auth', 'false');
          setIsAuthenticated(false);
        }}
        user={currentUser}
        onOpenVivaPanel={() => setIsVivaPanelOpen(true)}
      />

      <main className="flex-1 p-4 max-w-7xl mx-auto w-full flex flex-col">
        {activeTab === 'command' && (
          <div className="flex-1 flex flex-col space-y-3">
            {/* 1. Quiet Cartographic Control Bar: Scenario, Attack Injection & Timeline */}
            <div className="bg-[#ffffff] border border-[#dfdbd1] p-3 rounded flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                {/* Scenario Selector */}
                <div>
                  <label className="text-[11px] text-[#5e6265] block mb-0.5 font-medium">
                    Incident scenario (§5)
                  </label>
                  <select
                    value={selectedScenarioId}
                    onChange={(e) => setSelectedScenarioId(e.target.value)}
                    className="bg-[#fcfbf9] border border-[#dfdbd1] rounded px-2.5 py-1 text-xs text-[#191c1d] focus:outline-none focus:border-[#16697a]"
                  >
                    <option value="baltic_maritime_c4ads">Baltic Sea tanker (C4ADS runway spoof — §5.2)</option>
                    <option value="vilnius_aviation_adsb">Ryanair Vilnius ILS approach (ADS-B reset — §5.1)</option>
                    <option value="uav_lidar_survey">UAV LiDAR survey (drift-evasive attack — §5.3)</option>
                    <option value="precision_ag_tractor">Nashik vineyard RTK tractor (row deviation — §5.4)</option>
                  </select>
                </div>

                {/* Attack Injection Selector */}
                <div>
                  <label className="text-[11px] text-[#5e6265] block mb-0.5 font-medium">
                    Attack mode (§4.2)
                  </label>
                  <select
                    value={attackOverride}
                    onChange={(e) => setAttackOverride(e.target.value)}
                    className="bg-[#fcfbf9] border border-[#dfdbd1] rounded px-2.5 py-1 text-xs text-[#191c1d] focus:outline-none focus:border-[#16697a]"
                  >
                    <option value="">Scenario default</option>
                    <option value="AUTHENTIC">Authentic GNSS signal</option>
                    <option value="SIMPLISTIC_NON_SYNC">Simplistic non-synchronized</option>
                    <option value="INTERMEDIATE_SYNC">Intermediate code pull-off</option>
                    <option value="SOPHISTICATED_RECEIVER_AWARE">Sophisticated multi-antenna</option>
                    <option value="MEACONING">Meaconing replay delay</option>
                    <option value="NULLING_SUPPRESSION">Nulling carrier suppression</option>
                    <option value="DRIFT_EVASIVE_UAV">Drift-evasive UAV spoofing</option>
                  </select>
                </div>

                {/* Spoofer Power Slider */}
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#5e6265] font-medium mb-0.5">
                    Power advantage: <span className="text-[#191c1d] font-semibold tabular-nums">+{powerAdvantageDb} dB</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={powerAdvantageDb}
                    onChange={(e) => setPowerAdvantageDb(parseFloat(e.target.value))}
                    className="w-24 h-1.5 bg-[#dfdbd1] rounded appearance-none cursor-pointer accent-[#16697a]"
                  />
                </div>

                {/* EKF Mitigation Toggle */}
                <div className="flex items-center gap-1.5 pt-2">
                  <input
                    type="checkbox"
                    id="ekfToggle"
                    checked={enableEkf}
                    onChange={(e) => setEnableEkf(e.target.checked)}
                    className="rounded border-[#dfdbd1] text-[#16697a] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="ekfToggle" className="text-xs text-[#2d3133] cursor-pointer select-none">
                    EKF sensor fusion mitigation
                  </label>
                </div>

                {/* Switch to Detailed Multi-Scenario Player */}
                <button
                  onClick={() => setActiveTab('cinematic')}
                  className="px-3 py-1 rounded bg-[#f0eee7] hover:bg-[#e6e3da] text-[#191c1d] border border-[#dfdbd1] font-medium text-xs transition-colors"
                >
                  Inspect global scenario tracks
                </button>
              </div>

              {/* Scrubber Playback Controls */}
              <div className="flex items-center gap-2 bg-[#f0eee7] px-3 py-1.5 rounded border border-[#dfdbd1]">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded hover:bg-[#e6e3da] text-[#191c1d] transition-colors"
                  title={isPlaying ? 'Pause' : 'Play trajectory timeline'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleReset}
                  className="p-1 rounded hover:bg-[#e6e3da] text-[#5e6265] hover:text-[#191c1d] transition-colors"
                  title="Reset to epoch 0"
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
                    className="w-28 md:w-36 h-1.5 bg-[#c8c5bc] rounded appearance-none cursor-pointer accent-[#16697a]"
                  />
                  <span className="text-[11px] font-semibold text-[#191c1d] min-w-[50px] text-right tabular-nums">
                    T={currentEpoch}s / 59s
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Main Middle Workspace: Tactical WebGIS (Hero ~60% Width) & RF Oscilloscope (~40% Width) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[460px]">
              {/* Hero Map View (~60% of Width) */}
              <div className="lg:col-span-7 h-[460px] lg:h-auto min-h-[420px]">
                <TacticalMap
                  scenarioRun={scenarioRun}
                  currentEpoch={currentEpoch}
                />
              </div>

              {/* RF Correlator Oscilloscope & Telemetry Charts (~40% of Width) */}
              <div className="lg:col-span-5 flex flex-col min-h-[420px]">
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
          <SimulationPlayer
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

        {activeTab === 'paper' && (
          <PaperMatrixView onJumpTab={(tabId) => setActiveTab(tabId)} />
        )}

        {activeTab === 'copilot' && (
          <CopilotView
            scenarioRun={scenarioRun}
            currentEpoch={currentEpoch}
          />
        )}
      </main>

      {/* Cartographic Survey Footer & Archival Source Credits */}
      <footer className="border-t border-[#dfdbd1] bg-[#fcfbf9] py-3 text-xs text-[#5e6265] mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[#191c1d] font-medium">AEGIS-GIS Instrument</span> — Department of AI & Data Science, K.J. Somaiya College of Engineering.
          </div>
          <p className="text-[11px] text-[#707477]">
            Historical cartography & geodetic references: <a href="https://commons.wikimedia.org/wiki/File:Carta_Marina.jpeg" target="_blank" rel="noreferrer" className="underline hover:text-[#191c1d]">Carta Marina (1539)</a>, <a href="https://commons.wikimedia.org/wiki/File:Map-making_Division_of_Coast_%26_Geodetic_Survey,_Dept_of_Commerce_LCCN2016877308.jpg" target="_blank" rel="noreferrer" className="underline hover:text-[#191c1d]">Coast & Geodetic Survey</a>, <a href="https://commons.wikimedia.org/wiki/File:(Frontispiece_to)_Ramsdens_great_theodolite_(Ordnance)._(to_accompanyV.1)_Account_of_the_observations_and_calculations_of_the_(IA_dr_frontispiece-to-ramsdens-great-theodolite-ordnance-to-accompanyv1-a-6877005).jpg" target="_blank" rel="noreferrer" className="underline hover:text-[#191c1d]">Ordnance Great Theodolite</a> (Public Domain).
          </p>
        </div>
      </footer>

      {/* Evaluator Expert View Panel */}
      <VivaControlPanel
        isOpen={isVivaPanelOpen}
        onClose={() => setIsVivaPanelOpen(false)}
        onInjectSpoofing={() => {
          setAttackOverride('INTERMEDIATE_SYNC');
          setPowerAdvantageDb(4.5);
        }}
        onTriggerFusion={() => {
          setEnableEkf(true);
        }}
        onResetSystem={() => {
          setAttackOverride('');
          setPowerAdvantageDb(3.0);
          setEnableEkf(true);
          handleReset();
        }}
      />
    </div>
  );
}
