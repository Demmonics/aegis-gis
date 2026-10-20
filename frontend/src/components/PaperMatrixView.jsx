import React, { useState, useEffect } from 'react';
import { FileText, Users, Award, ExternalLink, BookOpen, CheckCircle, Navigation, BarChart3, Database } from 'lucide-react';
import { fetchPaperKnowledge } from '../services/api';

export default function PaperMatrixView({ onJumpTab }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchPaperKnowledge()
      .then(res => setData(res))
      .catch(err => console.error(err));
  }, []);

  const team = [
    {
      name: "Yoosha",
      roll: "16014224101",
      sections: "Abstract, Section 1 (Introduction), Section 2 (Trilateration, WGS-84 & UTM Projections), Section 3 (Structural Vulnerabilities)",
      role: "GNSS Physics Engine & Master System Architecture",
      moduleTarget: "command",
      actionLabel: "Demonstrate WGS-84 / UTM & RF Physics"
    },
    {
      name: "Yash",
      roll: "16014224077",
      sections: "Section 4.1 (Historical Antecedents: Todd Humphreys & RQ-170), Section 4.2 (Taxonomy of 6 Spoofing Attack Types)",
      role: "6-Attack RF Physics Simulator & Correlator Modeling",
      moduleTarget: "command",
      actionLabel: "Demonstrate 6-Attack Correlator Taps"
    },
    {
      name: "Parth",
      roll: "16014224095",
      sections: "Section 5.1 (Ryanair Vilnius Aviation ADS-B), Section 5.2 (Baltic Sea C4ADS Maritime), Section 5.3 (UAV LiDAR Survey), Section 5.4 (Precision Ag RTK)",
      role: "4 Real-World Case Studies & Geospatial Scenarios",
      moduleTarget: "command",
      actionLabel: "Demonstrate 4 Real-World Case Studies"
    },
    {
      name: "Tanishq",
      roll: "16014224099",
      sections: "Section 6 (5 Detection Families & Table 2), Section 6.4 (EKF Trajectory Recovery), Section 8.4 (Integrity Schema), Section 9 (GIS-Assisted Detection)",
      role: "5-Layer Defense Engine, ML Ensemble & PyQGIS Pipeline",
      moduleTarget: "diagnostics",
      actionLabel: "Demonstrate 5-Layer Defense & PyQGIS"
    }
  ];

  const posterStats = [
    { label: "Daily Flights Spoofed", value: "1,500+", citation: "Stanford GPS Lab ADS-B (Late 2025) / Paper Sec 5.1" },
    { label: "Baltic Sea Interference Events", value: "45,000+", citation: "C4ADS August 2023 - April 2024 / Paper Sec 5.2" },
    { label: "Spoofing Attack Classes", value: "6 Types", citation: "Section 4.2 Attack Taxonomy (Yoosha & Yash)" },
    { label: "Detection Families in Defense", value: "5 Layers", citation: "Table 2 Comparative Analysis (Tanishq)" },
    { label: "ML Classification Accuracy", value: "98.8%", citation: "TEXBAT-Grade Multi-Class Ensemble / Paper Sec 6.5" },
    { label: "Integrity Metadata Attributes", value: "12 Fields", citation: "Section 8.4 Standardized Schema Extension" }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white font-mono">
              Research Paper & Poster Presentation Alignment
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            <strong>Paper:</strong> <em>"When Location Lies: GNSS Spoofing and the Vulnerability of Geographic Positioning Systems"</em><br />
            K.J. Somaiya College of Engineering • Department of Artificial Intelligence & Data Science • Batch B2
          </p>
        </div>

        <div className="text-right font-mono text-xs text-cyan-400">
          Academic Year 2025-2026<br />
          <span className="text-slate-400 text-[11px]">KJSCE AI & DS Dept.</span>
        </div>
      </div>

      {/* 2. Team Member Contributions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {team.map((member, i) => (
          <div key={`member-${i}`} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-white font-mono">{member.name}</h3>
                  <span className="text-xs font-mono text-cyan-400">Roll No: {member.roll}</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {member.role}
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                <strong>Assigned Paper Sections:</strong><br />
                <span className="text-slate-400">{member.sections}</span>
              </p>
            </div>

            <button
              onClick={() => onJumpTab(member.moduleTarget)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-950 hover:bg-cyan-950 text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono transition-colors"
            >
              <span>{member.actionLabel}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* 3. Poster Key Statistics Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <span>Poster Key Statistics & Empirical Findings Matrix</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono">
          {posterStats.map((stat, idx) => (
            <div key={`stat-${idx}`} className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-xs block mb-1">{stat.label}</span>
              <span className="text-xl font-bold text-cyan-400 block">{stat.value}</span>
              <span className="text-[10px] text-slate-500 block mt-1">{stat.citation}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
