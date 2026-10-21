import React, { useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Activity, Radio, Cpu, BarChart2 } from 'lucide-react';

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
      <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
        Connecting RF Correlator Oscilloscope...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* 1. RF Correlator Peak Distortion Oscilloscope */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col shadow-lg">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              RF Correlator Peak Triangle (I/Q Taps)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-emerald-400">● Authentic</span>
            <span className="text-red-400">● Spoofer</span>
            <span className="text-amber-400 font-bold">● Composite</span>
          </div>
        </div>

        {/* Live SQM Metrics Badges */}
        <div className="grid grid-cols-3 gap-2 mb-2 text-center text-[10px] font-mono">
          <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block">Peak Ratio (M_ratio)</span>
            <span className="font-bold text-white text-xs">{taps.ratio_metric?.toFixed(3) || '1.020'}</span>
          </div>
          <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block">Delta Asymmetry (M_Δ)</span>
            <span className={`font-bold text-xs ${Math.abs(taps.delta_asymmetry || 0) > 0.15 ? 'text-red-400' : 'text-emerald-400'}`}>
              {taps.delta_asymmetry?.toFixed(3) || '0.000'}
            </span>
          </div>
          <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block">Prompt Amplitude</span>
            <span className="font-bold text-cyan-400 text-xs">{taps.prompt_tap?.toFixed(3) || '1.000'}</span>
          </div>
        </div>

        {/* 41-Tap Oscilloscope Chart */}
        <div className="flex-1 min-h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={correlatorData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="delay" stroke="#64748b" tick={{ fontSize: 9 }} unit="τ" />
              <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={[0, 2.5]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', borderRadius: '6px' }}
                formatter={(val, name) => [Number(val).toFixed(3), name]}
              />
              <ReferenceLine x={-0.5} stroke="#3b82f6" strokeDasharray="2 2" label={{ value: 'E', fill: '#3b82f6', fontSize: 10 }} />
              <ReferenceLine x={0.0} stroke="#06b6d4" strokeDasharray="2 2" label={{ value: 'P', fill: '#06b6d4', fontSize: 10 }} />
              <ReferenceLine x={0.5} stroke="#3b82f6" strokeDasharray="2 2" label={{ value: 'L', fill: '#3b82f6', fontSize: 10 }} />
              <Area type="monotone" dataKey="authentic" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={1.5} name="Authentic" />
              <Area type="monotone" dataKey="spoofer" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={1.5} strokeDasharray="3 3" name="Spoofer" />
              <Area type="monotone" dataKey="composite" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} strokeWidth={2} name="Composite" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Synchronized Telemetry Sparkline (C/N0 & EKF Innovations) */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col shadow-lg">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Synchronized Multi-Parameter Time Series
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-cyan-400">● C/N0 (dB-Hz)</span>
            <span className="text-purple-400">● EKF Innovation (γ)</span>
          </div>
        </div>

        <div className="flex-1 min-h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="epoch" stroke="#64748b" tick={{ fontSize: 9 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', borderRadius: '6px' }}
              />
              <ReferenceLine x={currentEpoch} stroke="#ffffff" strokeDasharray="3 3" label={{ value: `T=${currentEpoch}`, fill: '#ffffff', fontSize: 9 }} />
              <Line type="monotone" dataKey="cn0" stroke="#06b6d4" strokeWidth={2} dot={false} name="C/N0 (dB-Hz)" />
              <Line type="monotone" dataKey="ekf_innov" stroke="#a855f7" strokeWidth={2} dot={false} name="EKF Innovation γ" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const CorrelatorOscilloscope = React.memo(CorrelatorOscilloscopeComponent);
export default CorrelatorOscilloscope;
