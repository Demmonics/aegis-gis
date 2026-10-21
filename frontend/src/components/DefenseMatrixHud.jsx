import React from 'react';

function DefenseMatrixHudComponent({ currentRecord }) {
  if (!currentRecord) return null;

  const l1 = currentRecord.layer1_sqm || {};
  const l2 = currentRecord.layer2_doa || {};
  const l3 = currentRecord.layer3_osnma || {};
  const l4_ekf = currentRecord.layer4_ekf || {};
  const l5_ml = currentRecord.layer5_ml || {};

  const layers = [
    {
      id: 'L1',
      title: 'Layer 1: SQM correlator',
      section: 'Paper §6.1',
      triggered: l1.triggered,
      metricLabel: 'Peak asymmetry M_Δ',
      metricVal: l1.metrics?.sqm_delta_asymmetry?.toFixed(3) || '0.000',
      anomalyScore: (l1.anomaly_score * 100).toFixed(0)
    },
    {
      id: 'L2',
      title: 'Layer 2: Multi-antenna DoA',
      section: 'Paper §6.2',
      triggered: l2.triggered,
      metricLabel: 'Azimuth variance',
      metricVal: `${l2.metrics?.doa_azimuth_variance_deg?.toFixed(1) || '65.0'}°`,
      anomalyScore: (l2.anomaly_score * 100).toFixed(0)
    },
    {
      id: 'L3',
      title: 'Layer 3: Galileo OS-NMA',
      section: 'Paper §6.3',
      triggered: l3.triggered,
      metricLabel: 'Cryptographic tag',
      metricVal: l3.triggered ? 'Replay / Mismatch' : 'Authenticated',
      anomalyScore: (l3.anomaly_score * 100).toFixed(0)
    },
    {
      id: 'L4',
      title: 'Layer 4: INS/GNSS EKF',
      section: 'Paper §6.4',
      triggered: l4_ekf.spoofing_rejected,
      metricLabel: 'Mahalanobis residual γ',
      metricVal: l4_ekf.innovation_mahalanobis?.toFixed(1) || '1.2',
      anomalyScore: Math.min(100, Math.round(((l4_ekf.innovation_mahalanobis || 1.0) / 45.0) * 100))
    },
    {
      id: 'L5',
      title: 'Layer 5: ML & GIS topology',
      section: 'Paper §6.5 & §9',
      triggered: l5_ml.is_spoofed,
      metricLabel: 'Predicted class',
      metricVal: l5_ml.predicted_attack_type ? l5_ml.predicted_attack_type.replace(/_/g, ' ') : 'Authentic',
      anomalyScore: Math.round((l5_ml.confidence_score || 0.98) * 100)
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
      {layers.map((layer) => {
        const isAlert = layer.triggered;
        return (
          <div
            key={layer.id}
            className={`border p-2.5 rounded transition-colors ${
              isAlert
                ? 'bg-[#fdf2f2] border-[#e8b5b5]'
                : 'bg-[#ffffff] border-[#dfdbd1]'
            }`}
          >
            <div className="flex items-baseline justify-between mb-1">
              <div>
                <span className="text-xs font-semibold text-[#191c1d] block">
                  {layer.title}
                </span>
                <span className="text-[11px] text-[#5e6265]">
                  {layer.section}
                </span>
              </div>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                  isAlert
                    ? 'bg-[#b82e2b] text-white'
                    : 'bg-[#f0eee7] text-[#1d4e3e]'
                }`}
              >
                {isAlert ? 'Alert' : 'Pass'}
              </span>
            </div>

            <div className="mt-2 pt-1.5 border-t border-[#eae7de] space-y-1 text-xs">
              <div className="flex justify-between items-center text-[#5e6265]">
                <span className="text-[11px]">{layer.metricLabel}</span>
                <span className="text-[#191c1d] font-medium tabular-nums truncate max-w-[100px]">
                  {layer.metricVal}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#5e6265]">
                <span className="text-[11px]">Anomaly score</span>
                <span className="text-[#191c1d] font-medium tabular-nums">
                  {layer.anomalyScore}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const DefenseMatrixHud = React.memo(DefenseMatrixHudComponent);
export default DefenseMatrixHud;
