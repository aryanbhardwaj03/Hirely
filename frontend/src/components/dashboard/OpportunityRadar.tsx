import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, RefreshCw, Radio, Check, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RadarBlip {
  id: string;
  oppIndex: number;
  cx: number;
  cy: number;
  cluster: 'ai' | 'hackathon' | 'fellowship';
}

export const OpportunityRadar: React.FC = () => {
  const { 
    radarFilters, 
    setRadarFilters, 
    opportunities, 
    setSelectedOpportunity,
    runDiscovery, 
    isDiscovering 
  } = useApp();

  const [hoveredOppId, setHoveredOppId] = useState<string | null>(null);
  const [activeFilterPill, setActiveFilterPill] = useState<'match' | 'skills' | 'location' | null>(null);

  // 10 blips arranged in 3 realistic high-density clusters
  const blips: RadarBlip[] = [
    // Cluster 1: AI & ML Systems (Top-Right quadrant)
    { id: 'b1', oppIndex: 0, cx: 195, cy: 90, cluster: 'ai' },
    { id: 'b2', oppIndex: 4, cx: 215, cy: 110, cluster: 'ai' },
    { id: 'b3', oppIndex: 7, cx: 180, cy: 70, cluster: 'ai' },
    { id: 'b4', oppIndex: 11, cx: 228, cy: 125, cluster: 'ai' },

    // Cluster 2: Hackathons & Open Source (Bottom-Left quadrant)
    { id: 'b5', oppIndex: 1, cx: 90, cy: 190, cluster: 'hackathon' },
    { id: 'b6', oppIndex: 6, cx: 110, cy: 215, cluster: 'hackathon' },
    { id: 'b7', oppIndex: 10, cx: 75, cy: 175, cluster: 'hackathon' },

    // Cluster 3: Fellowships & Merit Grants (Bottom-Right quadrant)
    { id: 'b8', oppIndex: 2, cx: 195, cy: 200, cluster: 'fellowship' },
    { id: 'b9', oppIndex: 3, cx: 220, cy: 185, cluster: 'fellowship' },
    { id: 'b10', oppIndex: 5, cx: 175, cy: 225, cluster: 'fellowship' },
  ];

  // Outer ring tick marks (16 ticks)
  const tickMarks = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * 360) / 16;
    const rad = (angle * Math.PI) / 180;
    const x1 = 150 + 138 * Math.cos(rad);
    const y1 = 150 + 138 * Math.sin(rad);
    const x2 = 150 + 144 * Math.cos(rad);
    const y2 = 150 + 144 * Math.sin(rad);
    return { x1, y1, x2, y2, angle };
  });

  const toggleFilter = (key: keyof typeof radarFilters) => {
    setRadarFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePillClick = (type: 'match' | 'skills' | 'location') => {
    setActiveFilterPill(prev => prev === type ? null : type);
  };

  const activeOpp = hoveredOppId ? opportunities.find(o => o.id === hoveredOppId) : null;

  return (
    <div className="w-full lg:w-[350px] shrink-0 rounded-2xl p-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-[0_0_40px_rgba(0,230,118,0.08)] flex flex-col justify-between space-y-6 glass-inner-highlight">
      {/* Panel Title & Status */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#5DD62C] shadow-[0_0_10px_#5DD62C]" />
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
              Radar Command Center
            </h2>
          </div>
          <span className="font-mono text-[11px] text-[#5DD62C] bg-[#5DD62C]/10 px-2.5 py-0.5 rounded-full border border-[#5DD62C]/30 font-medium">
            360° LIVE SWEEP
          </span>
        </div>

        {/* Big Animated SVG Radar with Halo & Floating Chips (~300px) */}
        <div className="relative w-[300px] h-[300px] mx-auto my-4 flex items-center justify-center select-none">
          {/* Soft Green Ambient Glow Halo */}
          <div className="absolute inset-4 rounded-full bg-[#5DD62C]/10 blur-[45px] pointer-events-none" />

          {/* SVG Canvas */}
          <svg className="w-full h-full overflow-visible" viewBox="0 0 300 300">
            <defs>
              {/* Radial gradient for sweep cone */}
              <radialGradient id="radarSweepGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#5DD62C" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#5DD62C" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Pulsing Outer Ring */}
            <circle
              cx="150"
              cy="150"
              r="144"
              fill="none"
              stroke="#5DD62C"
              strokeWidth="1.2"
              className="animate-radar-pulse-ring"
            />

            {/* 4-5 Concentric Circles with Decreasing Opacity */}
            <circle cx="150" cy="150" r="136" fill="none" stroke="#5DD62C" strokeOpacity="0.25" strokeWidth="1" />
            <circle cx="150" cy="150" r="102" fill="none" stroke="#5DD62C" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx="150" cy="150" r="68" fill="none" stroke="#5DD62C" strokeOpacity="0.28" strokeWidth="1" />
            <circle cx="150" cy="150" r="34" fill="none" stroke="#5DD62C" strokeOpacity="0.35" strokeWidth="1.2" />

            {/* Crosshair Lines */}
            <line x1="150" y1="12" x2="150" y2="288" stroke="#5DD62C" strokeOpacity="0.16" strokeWidth="1" />
            <line x1="12" y1="150" x2="288" y2="150" stroke="#5DD62C" strokeOpacity="0.16" strokeWidth="1" />

            {/* Diagonal Target Lines */}
            <line x1="45" y1="45" x2="255" y2="255" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" strokeDasharray="3 4" />
            <line x1="45" y1="255" x2="255" y2="45" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" strokeDasharray="3 4" />

            {/* Tick Marks on outer ring */}
            {tickMarks.map((tick, idx) => (
              <line
                key={idx}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke="#5DD62C"
                strokeOpacity={idx % 4 === 0 ? '0.7' : '0.3'}
                strokeWidth={idx % 4 === 0 ? '1.5' : '1'}
              />
            ))}

            {/* Center Compass Point */}
            <circle cx="150" cy="150" r="5" fill="#5DD62C" className="shadow-[0_0_12px_#5DD62C]" />
            <circle cx="150" cy="150" r="2" fill="#FFFFFF" />

            {/* Connecting Lines to Floating Chips */}
            {/* Top-Left: Match % chip connection */}
            <polyline
              points="150,150 70,55 35,55"
              fill="none"
              stroke="#5DD62C"
              strokeOpacity="0.4"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            {/* Top-Right: Skills chip connection */}
            <polyline
              points="150,150 230,55 265,55"
              fill="none"
              stroke="#5DD62C"
              strokeOpacity="0.4"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            {/* Bottom-Center: Location chip connection */}
            <polyline
              points="150,150 150,265"
              fill="none"
              stroke="#5DD62C"
              strokeOpacity="0.4"
              strokeWidth="1"
              strokeDasharray="2 2"
            />

            {/* Clustered Blip Dots */}
            {blips.map((blip) => {
              const opp = opportunities[blip.oppIndex];
              if (!opp) return null;
              const isHovered = hoveredOppId === opp.id;
              const isHighlighted = !activeFilterPill ||
                (activeFilterPill === 'match' && opp.match_score >= 93) ||
                (activeFilterPill === 'location' && opp.isRemote) ||
                (activeFilterPill === 'skills' && opp.required_skills.includes('Python'));

              return (
                <g
                  key={blip.id}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredOppId(opp.id)}
                  onMouseLeave={() => setHoveredOppId(null)}
                  onClick={() => setSelectedOpportunity(opp)}
                >
                  {/* Outer pulse aura */}
                  <circle
                    cx={blip.cx}
                    cy={blip.cy}
                    r={isHovered ? 12 : 7}
                    fill="#5DD62C"
                    fillOpacity={isHovered ? 0.45 : isHighlighted ? 0.2 : 0.08}
                    className="transition-all duration-200"
                  />
                  {/* Core blip point */}
                  <circle
                    cx={blip.cx}
                    cy={blip.cy}
                    r={isHovered ? 4.5 : isHighlighted ? 3.5 : 2.5}
                    fill={isHovered ? '#FFFFFF' : '#5DD62C'}
                    className="transition-all duration-150"
                  />
                </g>
              );
            })}
          </svg>

          {/* Rotating Conic Gradient Sweep Wedge (4s linear loop) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-radar-sweep rounded-full overflow-hidden">
            {/* 60-degree conic gradient wedge with bright leading line */}
            <div
              className="w-full h-full rounded-full"
              style={{
                background: 'conic-gradient(from 0deg at 50% 50%, rgba(0, 230, 118, 0.38) 0deg, rgba(0, 230, 118, 0.12) 28deg, transparent 65deg)',
              }}
            />
            {/* Luminous Leading Edge Line */}
            <div className="absolute top-1/2 left-1/2 w-1/2 h-[1.5px] origin-left bg-gradient-to-r from-transparent via-[#5DD62C] to-[#FFFFFF] shadow-[0_0_10px_#5DD62C]" />
          </div>

          {/* Floating Filter Labels as glass chips around the radar */}
          {/* 1. Match % Chip (Top Left) */}
          <button
            onClick={() => handlePillClick('match')}
            className={`absolute top-1 left-0 -translate-x-2 px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wider transition-all cursor-pointer shadow-lg z-20 ${
              activeFilterPill === 'match'
                ? 'bg-[#5DD62C] text-black font-bold shadow-[0_0_15px_#5DD62C]'
                : 'bg-[#090E0B]/90 text-slate-200 border border-white/[0.12] hover:border-[#5DD62C]/50'
            }`}
          >
            Match 90%+
          </button>

          {/* 2. Skills Chip (Top Right) */}
          <button
            onClick={() => handlePillClick('skills')}
            className={`absolute top-1 right-0 translate-x-2 px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wider transition-all cursor-pointer shadow-lg z-20 ${
              activeFilterPill === 'skills'
                ? 'bg-[#5DD62C] text-black font-bold shadow-[0_0_15px_#5DD62C]'
                : 'bg-[#090E0B]/90 text-slate-200 border border-white/[0.12] hover:border-[#5DD62C]/50'
            }`}
          >
            Python / AI
          </button>

          {/* 3. Location Chip (Bottom Center) */}
          <button
            onClick={() => handlePillClick('location')}
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wider transition-all cursor-pointer shadow-lg z-20 ${
              activeFilterPill === 'location'
                ? 'bg-[#5DD62C] text-black font-bold shadow-[0_0_15px_#5DD62C]'
                : 'bg-[#090E0B]/90 text-slate-200 border border-white/[0.12] hover:border-[#5DD62C]/50'
            }`}
          >
            Remote Active
          </button>

          {/* Hover Glass Tooltip */}
          <AnimatePresence>
            {activeOpp && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3.5 py-2 rounded-xl bg-[#090E0B]/95 border border-[#5DD62C]/50 shadow-2xl text-center pointer-events-none z-30 max-w-[210px]"
              >
                <div className="font-mono text-xs text-[#5DD62C] font-bold">
                  {activeOpp.match_score}% MATCH
                </div>
                <div className="text-xs font-semibold text-white truncate mt-0.5">
                  {activeOpp.title}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {activeOpp.organization} · {activeOpp.category}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3 Toggle Switches */}
        <div className="space-y-2.5 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-300 font-medium">Scholarships</span>
            <button
              onClick={() => toggleFilter('scholarships')}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                radarFilters.scholarships ? 'bg-[#5DD62C]' : 'bg-white/10'
              }`}
              aria-label="Toggle scholarships filter"
            >
              <div
                className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform ${
                  radarFilters.scholarships ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-300 font-medium">Internships</span>
            <button
              onClick={() => toggleFilter('internships')}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                radarFilters.internships ? 'bg-[#5DD62C]' : 'bg-white/10'
              }`}
              aria-label="Toggle internships filter"
            >
              <div
                className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform ${
                  radarFilters.internships ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-300 font-medium">Remote Only</span>
            <button
              onClick={() => toggleFilter('remoteOnly')}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                radarFilters.remoteOnly ? 'bg-[#5DD62C]' : 'bg-white/10'
              }`}
              aria-label="Toggle remote only filter"
            >
              <div
                className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform ${
                  radarFilters.remoteOnly ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Two Stat Tiles & Run Live Discovery Button */}
      <div className="space-y-3 pt-3 border-t border-white/[0.08]">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="font-mono text-sm font-bold text-[#5DD62C] tabular-nums">
              +96%
            </div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-slate-300 mt-0.5 font-medium">
              Active Metrics
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="font-mono text-sm font-bold text-white tabular-nums">
              +75%
            </div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-slate-300 mt-0.5 font-medium">
              Match Filtering
            </div>
          </div>
        </div>

        <button
          onClick={() => runDiscovery()}
          disabled={isDiscovering}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#5DD62C]/20 hover:bg-[#5DD62C]/30 border border-[#5DD62C]/50 text-[#5DD62C] text-xs font-bold tracking-wide transition-all shadow-[0_0_25px_rgba(0,230,118,0.18)] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
          <span>{isDiscovering ? 'Scanning Web Agents...' : 'Run Live Discovery'}</span>
        </button>
      </div>
    </div>
  );
};
