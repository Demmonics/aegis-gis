import React from 'react';
import { ShieldCheck, AlertTriangle, Radio, Navigation, Key, Cpu, MapPin } from 'lucide-react';

function DefenseMatrixHudComponent({ currentRecord }) {
  if (!currentRecord) return null;

  const l1 = currentRecord.layer1_sqm || {};
  const l2 = currentRecord.layer2_doa || {};
  const l3 = currentRecord.layer3_osnma || {};
  const l4_raim = currentRecord.layer4_raim || {};
  const l4_ekf = currentRecord.layer4_ekf || {};
  const l5_ml = currentRecord.layer5_ml || {};

  const layers = [
    {
      id: 'L1',
      name: 'L1: SQM Correlator',
      section: 'Sec 6.1 (Table 2)',
      icon: Radio,
      triggered: l1.triggered,
      score: l1.anomaly_score,
      metricLabel: 'Peak Asymmetry M_Δ',
      metricVal: l1.metrics?.sqm_delta_asymmetry?.toFixed(3) || '0.000',
      color: l1.triggered ? 'text-red-400 border-red-500/40 bg-red-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    },
    {
      id: 'L2',
      name: 'L2: Multi-Antenna DoA',
      section: 'Sec 6.2 (Table 2)',
      icon: Navigation,
      triggered: l2.triggered,
      score: l2.anomaly_score,
      metricLabel: 'Azimuth Dispersion',
      metricVal: `${l2.metrics?.doa_azimuth_variance_deg?.toFixed(1) || '65.0'}°`,
      color: l2.triggered ? 'text-red-400 border-red-500/40 bg-red-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    },
    {
      id: 'L3',
      name: 'L3: Galileo OS-NMA',
      section: 'Sec 6.3 (Table 2)',
      icon: Key,
      triggered: l3.triggered,
      score: l3.anomaly_score,
      metricLabel: 'TESLA Digital Auth',
      metricVal: l3.triggered ? 'FAILED / REPLAY' : 'AUTHENTICATED',
      color: l3.triggered ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    },
    {
      id: 'L4',
      name: 'L4: INS/GNSS EKF',
      section: 'Sec 6.4 (Table 2)',
      icon: ShieldCheck,
      triggered: l4_ekf.spoofing_rejected,
      score: Math.min(1.0, (l4_ekf.innovation_mahalanobis || 1.0) / 45.0),
      metricLabel: 'Innovation Mahalanobis γ',
      metricVal: l4_ekf.innovation_mahalanobis?.toFixed(1) || '1.2',
      color: l4_ekf.spoofing_rejected ? 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    },
    {
      id: 'L5',
      name: 'L5: ML Ensemble & GIS',
      section: 'Sec 6.5 & 9',
      icon: Cpu,
      triggered: l5_ml.is_spoofed,
      score: l5_ml.confidence_score || 0.98,
      metricLabel: 'Predicted Attack Class',
      metricVal: l5_ml.predicted_attack_type || 'AUTHENTIC',
      color: l5_ml.is_spoofed ? 'text-purple-400 border-purple-500/40 bg-purple-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 font-mono">
      {layers.map((layer) => {
        const Icon = layer.icon;
        return (
          <div
            key={layer.id}
            className={`border rounded-xl p-2.5 backdrop-blur-sm transition-all duration-200 ${layer.color}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {layer.name}
              </span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-950/60 font-semibold">
                {layer.triggered ? 'ALERT' : 'PASS'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>{layer.metricLabel}:</span>
                <span className="font-bold text-white truncate max-w-[100px]">{layer.metricVal}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Anomaly Score:</span>
                <span className="font-bold text-slate-200">{(layer.score * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Micro progress bar */}
            <div className="w-full bg-slate-950 h-1 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${layer.triggered ? 'bg-red-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, layer.score * 100)}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const DefenseMatrixHud = React.memo(DefenseMatrixHudComponent);
export default DefenseMatrixHud;
