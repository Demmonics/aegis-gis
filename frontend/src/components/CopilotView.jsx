import React, { useState } from 'react';
import { Cpu, Send, Sparkles, BookOpen, Database, Terminal } from 'lucide-react';
import { analyzeForensics } from '../services/api';
import CyberTypewriter from './CyberTypewriter';

export default function CopilotView({ scenarioRun, currentEpoch = 0 }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const scenarioTitle = scenarioRun?.scenario_metadata?.title || 'Active GNSS incident';
  const attackType = scenarioRun?.telemetry_epochs?.[currentEpoch]?.attack_type || 'INTERMEDIATE_SYNC';
  const currentTelem = scenarioRun?.telemetry_epochs?.[currentEpoch]?.features_14d || {};
  const featureVector = scenarioRun?.telemetry_epochs?.[currentEpoch]?.feature_vector || null;

  const quickPrompts = [
    "Generate full forensic incident report for active scenario",
    "Explain how intermediate synchronized spoofing distorts SQM correlation peaks (Sec 4.2 & 6.1)",
    "Why does legacy RAIM fail against coordinated spoofing and how does our EKF + GIS layer fix it?",
    "Evaluate downstream impact on UAV LiDAR orthomosaics and precision agriculture (Sec 8.2 & 8.3)"
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
    <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Header Banner & Model Telemetry */}
      <div className="bg-[#ffffff] border border-[#dfdbd1] rounded p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-[#edf4f0] text-[#1d4e3e]">
                <Cpu className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-semibold text-[#191c1d]">
                Local Qwen-4B + Qdrant RAG forensic copilot
              </h2>
            </div>
            <p className="text-xs text-[#5e6265] mt-1 max-w-3xl">
              Edge AI assistant running quantized local inference with paper section retrieval and nearest-neighbor attack vectors from Qdrant vector database.
            </p>
          </div>

          {/* Telemetry Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-[#f0eee7] rounded border border-[#dfdbd1] text-[#191c1d]">
              Model: Qwen-4B-GNSS-Instruct
            </span>
            <span className="px-2.5 py-1 bg-[#f0eee7] rounded border border-[#dfdbd1] text-[#5e6265]">
              Quant: Q4_K_M (4-bit)
            </span>
            <span className="px-2.5 py-1 bg-[#edf4f0] rounded border border-[#dfdbd1] text-[#1d4e3e]">
              RAG: Qdrant vector DB
            </span>
          </div>
        </div>

        {/* 1-Click Quick Prompts */}
        <div className="mt-4 pt-3 border-t border-[#eae7de]">
          <span className="text-xs text-[#5e6265] block mb-2 font-medium">
            Evaluator presentation prompts:
          </span>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((p, i) => (
              <button
                key={`qp-${i}`}
                onClick={() => handleAsk(p)}
                disabled={loading}
                className="text-xs bg-[#f0eee7] hover:bg-[#e6e3da] text-[#191c1d] px-3 py-1.5 rounded border border-[#dfdbd1] transition-colors text-left"
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
          placeholder="Ask the local Qwen-4B copilot about GNSS spoofing, EKF sensor fusion, or GIS integrity..."
          className="flex-1 bg-[#ffffff] border border-[#dfdbd1] rounded px-4 py-2.5 text-xs text-[#191c1d] placeholder-[#8a8e91] focus:outline-none focus:border-[#16697a] transition-colors"
        />
        <button
          onClick={() => handleAsk()}
          disabled={loading}
          className="bg-[#16697a] hover:bg-[#125361] text-white font-medium px-4 rounded text-xs transition-colors flex items-center gap-2"
        >
          {loading ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>{loading ? 'Analyzing...' : 'Ask copilot'}</span>
        </button>
      </div>

      {/* 3. Copilot Results View */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main AI Forensic Analysis Report */}
          <div className="lg:col-span-2 bg-[#ffffff] border border-[#dfdbd1] rounded p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#eae7de]">
              <div className="flex items-center gap-2 text-xs text-[#16697a] font-semibold">
                <Terminal className="w-4 h-4" />
                <span>Forensic incident analysis</span>
              </div>
              <span className="text-[11px] text-[#5e6265] bg-[#f4f6f8] px-2 py-0.5 rounded border border-[#eae7de] tabular-nums">
                Latency: {report.model_telemetry?.latency_ms} ms • {report.model_telemetry?.active_tier}
              </span>
            </div>

            <div className="text-xs text-[#191c1d] leading-relaxed whitespace-pre-wrap">
              <CyberTypewriter text={report.analysis_markdown} speedMs={8} />
            </div>
          </div>

          {/* RAG Context & Similar TEXBAT Signatures */}
          <div className="space-y-4">
            {/* Qdrant Citations */}
            <div className="bg-[#ffffff] border border-[#dfdbd1] rounded p-4">
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-[#eae7de]">
                <BookOpen className="w-4 h-4 text-[#16697a]" />
                <h4 className="text-xs font-semibold text-[#191c1d]">
                  Qdrant paper sections retrieved
                </h4>
              </div>
              <div className="space-y-2">
                {(report.qdrant_citations || []).map((c, i) => (
                  <div key={`cite-${i}`} className="p-2.5 rounded bg-[#f4f6f8] border border-[#eae7de] text-xs">
                    <div className="font-semibold text-[#191c1d]">{c.title}</div>
                    <div className="text-[11px] text-[#5e6265] mb-1">{c.section} • {c.authors}</div>
                    <div className="text-[#2d3133] line-clamp-3 text-[11px]">{c.text}</div>
                    <div className="mt-1 text-[11px] text-[#16697a]">
                      Citations: {(c.citations || []).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Qdrant TEXBAT Vector Signatures */}
            <div className="bg-[#ffffff] border border-[#dfdbd1] rounded p-4">
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-[#eae7de]">
                <Database className="w-4 h-4 text-[#1d4e3e]" />
                <h4 className="text-xs font-semibold text-[#191c1d]">
                  Matched TEXBAT signatures
                </h4>
              </div>
              <div className="space-y-2">
                {(report.similar_signatures || []).map((s, i) => (
                  <div key={`sig-${i}`} className="p-2 bg-[#f4f6f8] rounded border border-[#eae7de] text-xs">
                    <div className="flex justify-between items-center text-[#1d4e3e] font-medium">
                      <span>{s.signature_id}</span>
                      <span className="text-[11px] bg-[#edf4f0] px-1.5 py-0.5 rounded tabular-nums">{s.similarity_pct} match</span>
                    </div>
                    <div className="text-[#5e6265] text-[11px] mt-0.5">{s.attack_class}</div>
                    <div className="text-[#5e6265] text-[11px] tabular-nums">C/N0: {s.cn0_mean_dbhz} dB-Hz • Clock jump: {s.clock_bias_jump_m}m</div>
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
