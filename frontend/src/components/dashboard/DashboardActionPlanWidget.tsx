import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarCheck, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActionPlan, ActionPlannerTask } from '../../types/opportunity';
import { fetchUserActionPlan, updateActionPlanTask } from '../../services/api';
import { TrustCheckBadge } from '../trustcheck/TrustCheckBadge';

export const DashboardActionPlanWidget: React.FC = () => {
  const { setActiveTab, setSelectedOpportunity, opportunities, showToast, updateApplicationStatus } = useApp();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadPlan = async () => {
      setLoading(true);
      const res = await fetchUserActionPlan(1);
      if (isMounted) {
        if (res) setPlan(res);
        setLoading(false);
      }
    };
    loadPlan();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenPlanner = () => {
    setActiveTab('planner');
    navigate('/planner');
  };

  const handleCompleteTask = async (task: ActionPlannerTask, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    if (plan) {
      setPlan({
        ...plan,
        tasks: plan.tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
      });
    }

    const updated = await updateActionPlanTask(task.id, {
      status: newStatus,
      sync_to_tracker: newStatus === 'completed',
    });

    if (updated && newStatus === 'completed') {
      showToast('Task marked complete & synced to Application Tracker!', 'success');
      updateApplicationStatus(task.opportunity_id, 'applied');
    }
  };

  const handleCardClick = (oppId: string) => {
    const found = opportunities.find(o => o.id === oppId);
    if (found) {
      setSelectedOpportunity(found);
    }
  };

  const tasks = plan?.tasks || [];
  const pendingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 3);
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-[#122A14]/70 via-[#0B100D] to-[#0A160D]/90 border border-[#5DD62C]/30 shadow-[0_0_30px_rgba(93,214,44,0.08)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#5DD62C]/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Widget Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#5DD62C]/15 border border-[#5DD62C]/40 text-[#5DD62C]">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Hirely Action Planner
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#5DD62C]/15 text-[#5DD62C] px-1.5 py-0.2 rounded border border-[#5DD62C]/30">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {tasks.length > 0 
                ? `${completedCount} of ${tasks.length} weekly tasks completed` 
                : 'Personalized study schedule ready'}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenPlanner}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white transition-all cursor-pointer group shrink-0"
        >
          <span>Open Planner</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#5DD62C]" />
        </button>
      </div>

      {/* Quick Task List Preview */}
      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400 font-mono">
          Loading scheduled actions...
        </div>
      ) : pendingTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pendingTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleCardClick(task.opportunity_id)}
              className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-[#5DD62C]/40 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span className="capitalize font-semibold text-slate-200">{task.scheduled_day}</span>
                  <span className="text-[#5DD62C]">{task.estimated_hours}h (est)</span>
                </div>
                <h4 className="text-xs font-semibold text-white group-hover:text-[#5DD62C] transition-colors line-clamp-1">
                  {task.opportunity_title}
                </h4>
                <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                  {task.organization}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                <TrustCheckBadge status={task.trust_status} />
                <button
                  onClick={(e) => handleCompleteTask(task, e)}
                  className="text-[10px] font-mono text-slate-400 hover:text-[#5DD62C] flex items-center gap-1 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Done</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-xs text-slate-400">
          All weekly tasks completed! Open the planner to schedule additional opportunities.
        </div>
      )}
    </div>
  );
};
