import React, { useState } from 'react';
import { MessageSquareCode, Cpu, Send, Sparkles, BookOpen, Database, CheckCircle2, Terminal } from 'lucide-react';
import { analyzeForensics } from '../services/api';

export default function CopilotView({ scenarioRun, currentEpoch = 0 }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const scenarioTitle = scenarioRun?.scenario_metadata?.title || 'Active GNSS Incident';
  const attackType = scenarioRun?.telemetry_epochs?.[currentEpoch]?.attack_type || 'INTERMEDIATE_SYNC';
  const currentTelem = scenarioRun?.telemetry_epochs?.[currentEpoch]?.features_14d || {};
  const featureVector = scenarioRun?.telemetry_epochs?.[currentEpoch]?.feature_vector || null;

  const quickPrompts = [
    "Generate Full Forensic Incident Report for Active Scenario",
    "Explain How Intermediate Synchronized Spoofing Distorts SQM Correlation Peaks (Sec 4.2 & 6.1)",
    "Why Does Legacy RAIM Fail Against Coordinated Spoofing & How Does Our EKF + GIS Layer Fix It?",
    "Evaluate Downstream Impact on UAV LiDAR Orthomosaics & Precision Agriculture (Sec 8.2 & 8.3)"
  ];

  const handleAsk = async (promptText) => {
    const q = promptText || query;
    if (!q) return;
    setLoading(true);
    try {
      const res = await analyzeForensics({
        scenario_title: scenarioTitle,
        attack_type: attackType,
        query: q,
        telemetry_features: currentTelem,
        feature_vector_14d: featureVector
      });
      setReport(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Header Banner & Model Telemetry */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                <Cpu className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white font-mono">
                Local Qwen-4B + Qdrant RAG Forensic Copilot
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous Edge AI Assistant running quantized inference locally or via zero-crash hybrid routing.
              Retrieves paper sections and nearest-neighbor attack vectors from Qdrant Vector DB.
            </p>
          </div>

          {/* Telemetry Pills */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="px-2.5 py-1 bg-slate-950 rounded-lg border border-purple-500/30 text-purple-300">
              Model: Qwen-4B-GNSS-Instruct
            </span>
            <span className="px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
              Quant: Q4_K_M (4-bit)
            </span>
            <span className="px-2.5 py-1 bg-slate-950 rounded-lg border border-cyan-500/30 text-cyan-300">
              RAG: Qdrant Vector DB
            </span>
          </div>
        </div>

        {/* 1-Click Quick Prompts */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <span className="text-[11px] font-mono text-slate-400 block mb-2">
            💡 Recommended Professor Demo Prompts (1-Click Trigger):
          </span>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((p, i) => (
              <button
                key={`qp-${i}`}
                onClick={() => handleAsk(p)}
                disabled={loading}
                className="text-xs font-mono bg-slate-800/80 hover:bg-purple-900/40 hover:border-purple-500/50 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors text-left"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Custom Query Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder="Ask the local Qwen-4B Copilot anything about GNSS spoofing, EKF sensor fusion, or GIS integrity..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
        <button
          onClick={() => handleAsk()}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-5 rounded-xl text-sm transition-colors flex items-center gap-2 shadow-lg shadow-purple-600/20"
        >
          {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>{loading ? 'Analyzing...' : 'Ask Copilot'}</span>
        </button>
      </div>

      {/* 3. Copilot Results View */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main AI Forensic Analysis Report */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-mono text-xs text-purple-400 font-bold">
                <Terminal className="w-4 h-4" />
                <span>Forensic Incident Report</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                Latency: {report.model_telemetry?.latency_ms} ms • {report.model_telemetry?.active_tier}
              </span>
            </div>

            <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
              {report.analysis_markdown}
            </div>
          </div>

          {/* RAG Context & Similar TEXBAT Signatures */}
          <div className="space-y-4">
            {/* Qdrant Citations */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Qdrant Paper Chunks Retrieved</span>
              </h4>
              <div className="space-y-2">
                {(report.qdrant_citations || []).map((c, i) => (
                  <div key={`cite-${i}`} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                    <div className="font-bold text-cyan-300 font-mono">{c.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono mb-1">{c.section} • {c.authors}</div>
                    <div className="text-slate-300 line-clamp-3">{c.text}</div>
                    <div className="mt-1 text-[10px] text-purple-400 font-mono">
                      Citations: {(c.citations || []).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Qdrant TEXBAT Vector Signatures */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Matched TEXBAT Signatures</span>
              </h4>
              <div className="space-y-2">
                {(report.similar_signatures || []).map((s, i) => (
                  <div key={`sig-${i}`} className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono">
                    <div className="flex justify-between items-center text-emerald-400 font-bold">
                      <span>{s.signature_id}</span>
                      <span className="text-[10px] bg-emerald-500/20 px-1 py-0.5 rounded">{s.similarity_pct} Match</span>
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">{s.attack_class}</div>
                    <div className="text-slate-400 text-[10px]">C/N0: {s.cn0_mean_dbhz} dB-Hz | Clock Jump: {s.clock_bias_jump_m}m</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
