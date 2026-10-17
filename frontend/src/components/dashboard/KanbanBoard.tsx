import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApplicationColumnId } from '../../types/opportunity';
import { 
  Kanban, 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  ArrowDown
} from 'lucide-react';
import { motion } from 'motion/react';

interface ColumnConfig {
  id: ApplicationColumnId;
  title: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
}

const COLUMNS: ColumnConfig[] = [
  { 
    id: 'matched', 
    title: 'Matched', 
    dotColor: 'bg-slate-400', 
    badgeBg: 'bg-white/[0.08]', 
    badgeText: 'text-slate-300' 
  },
  { 
    id: 'applied', 
    title: 'Applied', 
    dotColor: 'bg-[#00E676]', 
    badgeBg: 'bg-[#00E676]/15', 
    badgeText: 'text-[#00E676]' 
  },
  { 
    id: 'in_review', 
    title: 'In Review', 
    dotColor: 'bg-cyan-400', 
    badgeBg: 'bg-cyan-400/15', 
    badgeText: 'text-cyan-300' 
  },
  { 
    id: 'offers', 
    title: 'Offers', 
    dotColor: 'bg-amber-400', 
    badgeBg: 'bg-amber-400/15', 
    badgeText: 'text-amber-300' 
  },
];

export const KanbanBoard: React.FC = () => {
  const { 
    applications, 
    opportunities, 
    updateApplicationStatus, 
    setSelectedOpportunity 
  } = useApp();

  const [draggedOpportunityId, setDraggedOpportunityId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<ApplicationColumnId | null>(null);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    e.dataTransfer.setData('text/plain', oppId);
    setDraggedOpportunityId(oppId);
  };

  const handleDragOver = (e: React.DragEvent, colId: ApplicationColumnId) => {
    e.preventDefault();
    setActiveDropColumn(colId);
  };

  const handleDragLeave = () => {
    setActiveDropColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColId: ApplicationColumnId) => {
    e.preventDefault();
    const oppId = e.dataTransfer.getData('text/plain') || draggedOpportunityId;
    if (oppId) {
      updateApplicationStatus(oppId, targetColId);
    }
    setDraggedOpportunityId(null);
    setActiveDropColumn(null);
  };

  return (
    <div className="flex-1 rounded-2xl p-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-[0_0_40px_rgba(0,230,118,0.08)] flex flex-col justify-between overflow-hidden glass-inner-highlight">
      {/* Top Header - Tight layout, no empty gap */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
        <div className="flex items-center gap-2">
          <Kanban className="w-4 h-4 text-[#00E676]" />
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Application Pipeline
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Drag & drop to advance stages
        </span>
      </div>

      {/* 4 Equal Height & Width Kanban Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 items-stretch flex-1">
        {COLUMNS.map((column) => {
          const colApps = applications.filter((app) => app.status === column.id);
          const isOver = activeDropColumn === column.id;
          const isDragging = draggedOpportunityId !== null;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`rounded-xl p-3 bg-white/[0.025] backdrop-blur-xl border transition-all flex flex-col justify-between min-h-[380px] ${
                isOver
                  ? 'border-[#00E676] bg-[#00E676]/8 shadow-[0_0_25px_rgba(0,230,118,0.15)]'
                  : 'border-white/[0.08]'
              }`}
            >
              <div>
                {/* Column Header: Status Dot, Title, Count Badge */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${column.dotColor}`} />
                    <span className="text-xs font-semibold text-white tracking-wide">
                      {column.title}
                    </span>
                  </div>
                  <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${column.badgeBg} ${column.badgeText}`}>
                    {colApps.length}
                  </span>
                </div>

                {/* Cards List in Column */}
                <div className="space-y-2.5">
                  {colApps.map((app) => {
                    const opp = opportunities.find((o) => o.id === app.opportunityId);
                    if (!opp) return null;

                    return (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                        onClick={() => setSelectedOpportunity(opp)}
                        className="group relative rounded-xl p-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-[#00E676]/40 transition-all cursor-grab active:cursor-grabbing shadow-sm"
                      >
                        {/* Title (Single line truncated) */}
                        <div className="text-xs font-semibold text-white group-hover:text-[#00E676] transition-colors truncate mb-0.5">
                          {opp.title}
                        </div>
                        {/* Organization */}
                        <div className="text-[11px] text-slate-400 truncate mb-2">
                          {opp.organization}
                        </div>

                        {/* Thin Animated Match-% Progress Bar */}
                        <div className="space-y-1 mb-2">
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                            <span>Fit</span>
                            <span className="text-[#00E676] font-bold">{opp.match_score}%</span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-white/[0.1] overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-[#122A14] to-[#00E676] rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${opp.match_score}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                          </div>
                        </div>

                        {/* Bottom Deadline & Stage Controls */}
                        <div className="flex items-center justify-between pt-1.5 text-[11px] text-slate-400 border-t border-white/[0.05]">
                          <span className="font-mono truncate max-w-[110px] text-[11px]">
                            {opp.deadlineFormatted}
                          </span>

                          {/* Quick Advance Button for Keyboard/Touch */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {column.id !== 'offers' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextCols: Record<ApplicationColumnId, ApplicationColumnId> = {
                                    matched: 'applied',
                                    applied: 'in_review',
                                    in_review: 'offers',
                                    offers: 'offers',
                                  };
                                  updateApplicationStatus(opp.id, nextCols[column.id]);
                                }}
                                className="p-1 rounded bg-[#00E676]/15 hover:bg-[#00E676]/30 text-[#00E676] transition-colors cursor-pointer"
                                title="Advance to next column"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dashed "Drop here" Zone appearing while dragging */}
              {isDragging && (
                <div
                  className={`mt-2 py-4 px-2 rounded-xl border border-dashed transition-all flex items-center justify-center gap-1.5 text-[11px] font-mono ${
                    isOver 
                      ? 'border-[#00E676] bg-[#00E676]/15 text-[#00E676]' 
                      : 'border-white/20 text-slate-400 bg-white/[0.01]'
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                  <span>Drop into {column.title}</span>
                </div>
              )}

              {colApps.length === 0 && !isDragging && (
                <div className="flex-1 flex items-center justify-center p-4 text-center">
                  <span className="text-xs text-slate-400 italic">
                    No items in {column.title}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
