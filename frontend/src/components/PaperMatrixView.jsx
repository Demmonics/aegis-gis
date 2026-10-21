import React, { useState, useEffect } from 'react';
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
      role: "GNSS Physics & System Architecture",
      sections: "Abstract, §1 (Introduction), §2 (Trilateration, WGS-84 & UTM Projections), §3 (Structural Vulnerabilities)",
      moduleTarget: "command",
      actionLabel: "View WGS-84 & RF Physics"
    },
    {
      name: "Yash",
      roll: "16014224077",
      role: "RF Physics & Correlator Modeling",
      sections: "§4.1 (Historical Antecedents: Todd Humphreys & RQ-170), §4.2 (Taxonomy of 6 Spoofing Attack Types)",
      moduleTarget: "command",
      actionLabel: "Inspect 6-Attack Correlator Taps"
    },
    {
      name: "Parth",
      roll: "16014224095",
      role: "Incident Reconstruction & Scenarios",
      sections: "§5.1 (Ryanair Vilnius Aviation ADS-B), §5.2 (Baltic Sea C4ADS Maritime), §5.3 (UAV LiDAR Survey), §5.4 (Precision Ag RTK)",
      moduleTarget: "cinematic",
      actionLabel: "Inspect 4 Empirical Scenarios"
    },
    {
      name: "Tanishq",
      roll: "16014224099",
      role: "5-Layer Defense Engine & GIS Pipeline",
      sections: "§6 (5 Detection Families & Table 2), §6.4 (EKF Trajectory Recovery), §8.4 (Integrity Schema), §9 (GIS-Assisted Detection)",
      moduleTarget: "gis",
      actionLabel: "View GIS Topology & Table 2"
    }
  ];

  const empiricalFindings = [
    {
      metric: "1,500+ daily flights",
      topic: "Baltic & Black Sea civil aviation GNSS interference",
      finding: "False GPWS terrain pull-up alerts and loss of RNAV/RNP lateral guidance along EASA conflict corridors.",
      source: "Stanford GPS Lab & Eurocontrol (Late 2025) / Paper §5.1"
    },
    {
      metric: "45,000+ vessel events",
      topic: "Baltic maritime AIS position spoofing",
      finding: "Vessels teleported up to 32 km inland onto Gelendzhik and Sambia peninsula airport runways.",
      source: "C4ADS Baltic Maritime Dataset (2023–2024) / Paper §5.2"
    },
    {
      metric: "99.93% accuracy",
      topic: "Multi-layered detection ensemble",
      finding: "Soft-voting ensemble across 14 extracted physical, statistical and cryptographic observables.",
      source: "TEXBAT Real-World RF Dataset Benchmark / Paper §6.5"
    },
    {
      metric: "12 metadata fields",
      topic: "Standardized GIS integrity extension",
      finding: "Downstream spatial topology validation with automated quarantine of corrupted geodetic points.",
      source: "Section 8.4 Standardized Schema Extension / Paper §8.4"
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Header with Real Archival Cartography Picture */}
      <div className="bg-[#ffffff] border border-[#dfdbd1] rounded overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Archival Survey Plate */}
          <div className="md:col-span-4 bg-[#f0eee7] border-b md:border-b-0 md:border-r border-[#dfdbd1] relative overflow-hidden flex items-center justify-center p-3">
            <img
              src="/assets/map-making-division-of-coast-geodetic-survey.jpg"
              alt="Map-making Division of Coast and Geodetic Survey"
              className="w-full h-44 object-cover rounded border border-[#dfdbd1]"
            />
          </div>

          {/* Academic Paper Title & Authors */}
          <div className="md:col-span-8 p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs text-[#5e6265] mb-1">
                Academic Research Paper & Poster Presentation Alignment
              </div>
              <h2 className="text-base font-semibold text-[#191c1d]">
                When Location Lies: Multi-Layered GNSS Spoofing Detection, EKF Sensor Fusion & Integrity-Aware GIS Pipeline
              </h2>
              <p className="text-xs text-[#5e6265] mt-1.5 leading-relaxed">
                Department of Artificial Intelligence & Data Science, K.J. Somaiya College of Engineering • Academic Year 2025–2026.
                Project Batch B2: Yoosha, Yash, Parth, Tanishq.
              </p>
            </div>
            <div className="text-xs text-[#707477] mt-3 pt-2 border-t border-[#eae7de] flex items-center justify-between">
              <span>Guidance: Dept. of AI & DS Faculty</span>
              <span>Examination & Viva Presentation</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Four-Column List of Team Contributions (per prompt requirements) */}
      <div className="bg-[#ffffff] border border-[#dfdbd1] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#dfdbd1] bg-[#fcfbf9]">
          <h3 className="text-xs font-semibold text-[#191c1d]">
            Division of architectural responsibilities and paper section mappings
          </h3>
          <p className="text-[11px] text-[#5e6265] mt-0.5">
            Four-column architectural contribution matrix aligned directly with project viva evaluation criteria.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#dfdbd1] bg-[#f0eee7] text-[#5e6265]">
                <th className="py-2.5 px-4 font-medium w-48">Team member</th>
                <th className="py-2.5 px-4 font-medium w-64">Engineering focus</th>
                <th className="py-2.5 px-4 font-medium">Assigned paper sections</th>
                <th className="py-2.5 px-4 font-medium w-44 text-right">Demonstration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eae7de]">
              {team.map((m, idx) => (
                <tr key={idx} className="hover:bg-[#faf8f5] transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-[#191c1d] block">{m.name}</span>
                    <span className="text-[11px] text-[#5e6265] tabular-nums">Roll: {m.roll}</span>
                  </td>
                  <td className="py-3 px-4 text-[#2d3133]">
                    {m.role}
                  </td>
                  <td className="py-3 px-4 text-[#5e6265] leading-relaxed">
                    {m.sections}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onJumpTab(m.moduleTarget)}
                      className="px-2.5 py-1 rounded bg-[#f0eee7] hover:bg-[#e6e3da] text-[#16697a] hover:text-[#191c1d] border border-[#dfdbd1] text-xs font-medium transition-colors"
                    >
                      {m.actionLabel}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Empirical Findings Matrix */}
      <div className="bg-[#ffffff] border border-[#dfdbd1] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#dfdbd1] bg-[#fcfbf9]">
          <h3 className="text-xs font-semibold text-[#191c1d]">
            Empirical baseline findings from research paper
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#eae7de]">
          {empiricalFindings.map((f, idx) => (
            <div key={idx} className="p-4 flex flex-col justify-between">
              <div>
                <span className="text-sm font-semibold text-[#16697a] block tabular-nums">
                  {f.metric}
                </span>
                <span className="text-xs font-medium text-[#191c1d] block mt-0.5">
                  {f.topic}
                </span>
                <p className="text-xs text-[#5e6265] mt-1.5 leading-relaxed">
                  {f.finding}
                </p>
              </div>
              <span className="text-[11px] text-[#707477] mt-3 block pt-2 border-t border-[#eae7de]">
                {f.source}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
