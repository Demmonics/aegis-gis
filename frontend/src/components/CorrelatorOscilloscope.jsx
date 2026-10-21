import React, { useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

function CorrelatorOscilloscopeComponent({
  telemetryEpoch,
  allTelemetry = [],
  currentEpoch = 0
}) {
  const taps = telemetryEpoch?.correlator_taps || {};
  const delays = taps.delays_chips || [];
  const auth = taps.authentic_profile || [];
  const spoof = taps.spoofer_profile || [];
  const composite = taps.composite_profile || [];

  // Memoize 41 taps transform (called unconditionally to respect Hook rules)
  const correlatorData = useMemo(() => {
    return delays.map((d, i) => ({
      delay: d,
      authentic: auth[i] || 0,
      spoofer: spoof[i] || 0,
      composite: composite[i] || 0
    }));
  }, [delays, auth, spoof, composite]);

  // Memoize time series data from allTelemetry so it doesn't re-map on every epoch tick
  const timeSeriesData = useMemo(() => {
    return (allTelemetry || []).map((t, idx) => ({
      epoch: idx,
      cn0: t.features_14d?.cn0_mean_dbhz || 44.0,
      clock_bias: t.features_14d?.clock_bias_jump_m || 0.0,
      residual_rms: t.features_14d?.pseudorange_residual_rms || 1.5,
      ekf_innov: t.features_14d?.ekf_innovation_mahalanobis || 1.0,
    }));
  }, [allTelemetry]);

  if (!telemetryEpoch) {
    return (
      <div className="h-full flex items-center justify-center text-[#5e6265] text-xs bg-[#ffffff] border border-[#dfdbd1]">
        Connecting RF correlator oscilloscope...
      </div>
    );
  }

  const asymmetryDelta = telemetryEpoch.features_14d?.sqm_delta_asymmetry || 0;
  const isDistorted = asymmetryDelta > 0.12;

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* 1. RF Correlator Peak Triangle (I/Q Taps) */}
      <div className="flex-1 bg-[#ffffff] border border-[#dfdbd1] p-3 flex flex-col">
        <div className="flex items-baseline justify-between pb-2 mb-2 border-b border-[#eae7de]">
          <div>
            <h3 className="text-xs font-semibold text-[#191c1d]">
              RF correlator tap response
            </h3>
            <p className="text-[11px] text-[#5e6265] mt-0.5">
              {isDistorted
                ? `Peak asymmetry Δ=${asymmetryDelta.toFixed(3)} indicates intermediate synchronized pull-off`
                : 'Symmetric triangular correlation peak indicates authentic signal structure'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#1d4e3e] font-medium">Authentic</span>
            <span className="text-[#b82e2b] font-medium">Spoofed</span>
            <span className="text-[#16697a] font-medium">Composite</span>
          </div>
        </div>

        <div className="flex-1 min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={correlatorData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eae7de" vertical={false} />
              <XAxis
                dataKey="delay"
                tick={{ fontSize: 11, fill: '#707477' }}
                tickFormatter={(v) => `${v.toFixed(1)}τ`}
                stroke="#dfdbd1"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#707477' }}
                domain={[0, 1.4]}
                stroke="#dfdbd1"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#dfdbd1',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#191c1d'
                }}
                formatter={(val, name) => [Number(val).toFixed(3), name === 'authentic' ? 'Authentic' : name === 'spoofer' ? 'Spoofed' : 'Composite']}
                labelFormatter={(l) => `Code delay: ${Number(l).toFixed(2)} chips`}
              />
              <Area
                type="monotone"
                dataKey="authentic"
                stroke="#1d4e3e"
                strokeWidth={2}
                fill="#1d4e3e"
                fillOpacity={0.08}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="spoofer"
                stroke="#b82e2b"
                strokeWidth={2}
                fill="#b82e2b"
                fillOpacity={0.10}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="composite"
                stroke="#16697a"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Receiver RF Telemetry: Carrier-to-Noise Ratio & EKF Innovation */}
      <div className="flex-1 bg-[#ffffff] border border-[#dfdbd1] p-3 flex flex-col">
        <div className="flex items-baseline justify-between pb-2 mb-2 border-b border-[#eae7de]">
          <div>
            <h3 className="text-xs font-semibold text-[#191c1d]">
              Carrier-to-noise ratio and filter innovation
            </h3>
            <p className="text-[11px] text-[#5e6265] mt-0.5">
              C/N0 mean = {telemetryEpoch.features_14d?.cn0_mean_dbhz?.toFixed(1) || '44.0'} dB-Hz, Mahalanobis innovation = {telemetryEpoch.features_14d?.ekf_innovation_mahalanobis?.toFixed(2) || '1.00'}
            </p>
          </div>
          <span className="text-[11px] text-[#5e6265] tabular-nums">
            T={currentEpoch}s of 59s
          </span>
        </div>

        <div className="flex-1 min-h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eae7de" vertical={false} />
              <XAxis
                dataKey="epoch"
                tick={{ fontSize: 11, fill: '#707477' }}
                stroke="#dfdbd1"
                tickFormatter={(v) => `T${v}`}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#707477' }}
                stroke="#dfdbd1"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#dfdbd1',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#191c1d'
                }}
              />
              <ReferenceLine x={currentEpoch} stroke="#16697a" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="cn0"
                name="C/N0 (dB-Hz)"
                stroke="#1d4e3e"
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="ekf_innov"
                name="EKF innovation"
                stroke="#16697a"
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const CorrelatorOscilloscope = React.memo(CorrelatorOscilloscopeComponent);
export default CorrelatorOscilloscope;
