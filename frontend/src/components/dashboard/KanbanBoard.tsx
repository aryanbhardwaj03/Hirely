import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApplicationColumnId } from '../../types/opportunity';
import { 
  Kanban, 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  ArrowDown,
  ExternalLink,
  Trash2,
  CheckCircle2,
  ArrowUpRight,
  Compass
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
    dotColor: 'bg-[#5DD62C]',
    badgeBg: 'bg-[#5DD62C]/15',
    badgeText: 'text-[#5DD62C]'
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
    removeFromPipeline,
    setSelectedOpportunity,
    setActiveTab,
    runDiscovery
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
    <div className="flex-1 rounded-2xl p-6 bg-[#202020]/90 backdrop-blur-2xl border border-white/[0.1] shadow-[0_0_40px_rgba(93,214,44,0.08)] flex flex-col justify-between overflow-hidden glass-inner-highlight">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.08] mb-4">
        <div className="flex items-center gap-2">
          <Kanban className="w-4 h-4 text-[#5DD62C]" />
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Application Pipeline
          </h2>
          <span className="font-mono text-[11px] text-[#5DD62C] bg-[#5DD62C]/10 border border-[#5DD62C]/30 px-2 py-0.5 rounded-full font-bold">
            {applications.length} Active
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Drag & drop across stages · Open verified URLs to apply
        </span>
      </div>

      {/* Empty State Banner if no applications added */}
      {applications.length === 0 && (
        <div className="mb-4 p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-semibold text-white flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="w-4 h-4 text-[#5DD62C]" />
              <span>Your pipeline is ready to track real opportunities</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Browse verified internships, research labs, and hackathons in your feed. Click <strong className="text-white">"Add to Pipeline"</strong> on any opportunity to track your application milestones here.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('discover')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5DD62C] text-black text-xs font-bold hover:shadow-[0_0_20px_rgba(93,214,44,0.4)] transition-all cursor-pointer whitespace-nowrap"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Opportunities</span>
          </button>
        </div>
      )}

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
                  ? 'border-[#5DD62C] bg-[#5DD62C]/8 shadow-[0_0_25px_rgba(93,214,44,0.15)]'
                  : 'border-white/[0.08]'
              }`}
            >
              <div>
                {/* Column Header */}
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
                        className="group relative rounded-xl p-3 bg-[#202020] hover:bg-[#282828] border border-white/[0.1] hover:border-[#5DD62C]/60 transition-all cursor-grab active:cursor-grabbing shadow-sm space-y-2"
                      >
                        {/* Title and Remove button */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-semibold text-white group-hover:text-[#5DD62C] transition-colors line-clamp-1 leading-snug">
                            {opp.title}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromPipeline(opp.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 rounded transition-all cursor-pointer"
                            title="Remove from pipeline"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Organization */}
                        <div className="text-[11px] text-slate-400 truncate">
                          {opp.organization}
                        </div>

                        {/* Animated Match-% Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                            <span>Fit</span>
                            <span className="text-[#5DD62C] font-bold">{opp.match_score}%</span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-white/[0.1] overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-[#337418] to-[#5DD62C] rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${opp.match_score}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                          </div>
                        </div>

                        {/* Deadline & Actions */}
                        <div className="flex items-center justify-between pt-1.5 text-[11px] text-slate-400 border-t border-white/[0.05]">
                          <span className="font-mono truncate max-w-[95px] text-[10px]">
                            {opp.deadlineFormatted}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Open Real Listing Link */}
                            <a
                              href={opp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Open verified employer listing"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            {/* Backward Stage Button */}
                            {column.id !== 'matched' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const prevCols: Record<ApplicationColumnId, ApplicationColumnId> = {
                                    matched: 'matched',
                                    applied: 'matched',
                                    in_review: 'applied',
                                    offers: 'in_review',
                                  };
                                  updateApplicationStatus(opp.id, prevCols[column.id]);
                                }}
                                className="p-1 rounded bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Move to previous stage"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}

                            {/* Forward Stage Button */}
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
                                className="p-1 rounded bg-[#5DD62C]/15 hover:bg-[#5DD62C]/30 text-[#5DD62C] transition-colors cursor-pointer"
                                title="Advance to next stage"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Special Prompt for Matched Column: Mark as Applied */}
                        {column.id === 'matched' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateApplicationStatus(opp.id, 'applied');
                            }}
                            className="w-full py-1 px-2 rounded-lg bg-white/[0.04] hover:bg-[#5DD62C]/20 border border-white/[0.08] hover:border-[#5DD62C]/40 text-[10px] text-slate-300 hover:text-[#5DD62C] font-mono transition-colors text-center cursor-pointer flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-[#5DD62C]" />
                            <span>Mark Applied</span>
                          </button>
                        )}
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
                      ? 'border-[#5DD62C] bg-[#5DD62C]/15 text-[#5DD62C]' 
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
