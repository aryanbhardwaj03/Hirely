import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  RotateCcw, 
  Sliders, 
  CalendarCheck, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  ExternalLink,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { 
  ActionPlan, 
  ActionPlannerTask, 
  Commitment, 
  RankedOpportunityItem, 
  ExcludedOpportunityItem 
} from '../../types/opportunity';
import { 
  fetchUserActionPlan, 
  generateActionPlan, 
  updateActionPlanTask, 
  deleteActionPlanTask 
} from '../../services/api';
import { TrustCheckBadge } from '../trustcheck/TrustCheckBadge';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const ActionPlannerView: React.FC = () => {
  const { 
    currentUser, 
    profile, 
    opportunities, 
    setSelectedOpportunity, 
    showToast,
    updateApplicationStatus
  } = useApp();

  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const [showShortlist, setShowShortlist] = useState(false);

  // Editable availability settings
  const [dailyHours, setDailyHours] = useState<Record<string, number>>({
    monday: 2.5,
    tuesday: 2.5,
    wednesday: 3.0,
    thursday: 2.5,
    friday: 3.0,
    saturday: 4.5,
    sunday: 4.5,
  });

  const [commitments, setCommitments] = useState<Commitment[]>([
    { day: 'wednesday', title: 'Algorithms Midterm Review', hours: 2.0, time_range: '14:00 - 16:00' },
  ]);

  // New commitment form state
  const [newCommitmentDay, setNewCommitmentDay] = useState('monday');
  const [newCommitmentTitle, setNewCommitmentTitle] = useState('');
  const [newCommitmentHours, setNewCommitmentHours] = useState(2.0);

  // Preferred categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    profile.preferredCategories || ['job', 'internship', 'hackathon']
  );

  // Load active plan on mount
  useEffect(() => {
    let isMounted = true;
    const loadPlan = async () => {
      setLoading(true);
      const res = await fetchUserActionPlan(1);
      if (isMounted) {
        if (res) {
          setPlan(res);
          if (res.available_hours_per_day) {
            setDailyHours(res.available_hours_per_day);
          }
          if (res.commitments) {
            setCommitments(res.commitments);
          }
        }
        setLoading(false);
      }
    };
    loadPlan();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    showToast('Synthesizing conflict-free weekly schedule...', 'info');
    const newPlan = await generateActionPlan({
      userId: 1,
      planningPeriodDays: 7,
      availableHoursPerDay: dailyHours,
      commitments: commitments,
      preferredCategories: selectedCategories,
      targetSkills: profile.skills,
    });
    setGenerating(false);

    if (newPlan) {
      setPlan(newPlan);
      showToast('Weekly action plan successfully generated!', 'success');
      setIsAvailabilityOpen(false);
    } else {
      showToast('Could not generate plan. Please try again.', 'warning');
    }
  };

  const handleToggleTaskComplete = async (task: ActionPlannerTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    // Optimistic local update
    if (plan) {
      setPlan({
        ...plan,
        tasks: plan.tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t),
      });
    }

    const updated = await updateActionPlanTask(task.id, {
      status: newStatus,
      sync_to_tracker: newStatus === 'completed',
    });

    if (updated) {
      if (newStatus === 'completed') {
        showToast(`Task completed! Synced to Application Tracker as Applied.`, 'success');
        updateApplicationStatus(task.opportunity_id, 'applied');
      } else {
        showToast('Task marked as pending.', 'info');
      }
    }
  };

  const handleRescheduleTask = async (taskId: number, newDay: string) => {
    const updated = await updateActionPlanTask(taskId, {
      status: 'rescheduled',
      scheduled_day: newDay,
      time_slot: '18:00 - 20:00',
    });

    if (updated && plan) {
      setPlan({
        ...plan,
        tasks: plan.tasks.map(t => t.id === taskId ? updated : t),
      });
      showToast(`Task rescheduled to ${newDay.toUpperCase()}.`, 'success');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    const success = await deleteActionPlanTask(taskId);
    if (success && plan) {
      setPlan({
        ...plan,
        tasks: plan.tasks.filter(t => t.id !== taskId),
      });
      showToast('Task removed from weekly plan.', 'info');
    }
  };

  const handleAddCommitment = () => {
    if (!newCommitmentTitle.trim()) {
      showToast('Please enter a commitment title.', 'warning');
      return;
    }
    const newItem: Commitment = {
      day: newCommitmentDay,
      title: newCommitmentTitle.trim(),
      hours: Number(newCommitmentHours),
      time_range: 'Busy Block',
    };
    setCommitments([...commitments, newItem]);
    setNewCommitmentTitle('');
    showToast('Commitment added. Click Regenerate Plan to adjust tasks.', 'info');
  };

  const handleRemoveCommitment = (index: number) => {
    const updated = commitments.filter((_, i) => i !== index);
    setCommitments(updated);
  };

  const handleOpenOpportunity = (opportunityId: string) => {
    const found = opportunities.find(o => o.id === opportunityId);
    if (found) {
      setSelectedOpportunity(found);
    } else {
      showToast(`Opening details for ${opportunityId}`, 'info');
    }
  };

  // Group tasks by scheduled day
  const tasksByDay: Record<string, ActionPlannerTask[]> = {};
  for (const day of WEEKDAYS) {
    tasksByDay[day] = [];
  }
  if (plan?.tasks) {
    for (const task of plan.tasks) {
      const d = task.scheduled_day.toLowerCase();
      if (tasksByDay[d]) {
        tasksByDay[d].push(task);
      }
    }
  }

  const totalAllocated = plan?.total_hours_allocated ?? 0;
  const totalAvailable = plan?.total_hours_available ?? 22.5;
  const capacityPercent = Math.min(100, Math.round((totalAllocated / (totalAvailable || 1)) * 100));

  return (
    <div className="space-y-6 pb-12 w-full min-w-0">
      {/* 1. Header & Controls */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#122A14]/80 via-[#050A08] to-[#0A160D]/90 border border-[#5DD62C]/30 shadow-[0_0_40px_rgba(93,214,44,0.12)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#5DD62C]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5DD62C]/15 border border-[#5DD62C]/40 text-[#5DD62C] font-mono text-xs font-semibold tracking-wide">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>HIRELY ACTION PLANNER</span>
              <span className="text-[10px] bg-[#5DD62C]/25 px-1.5 py-0.2 rounded font-bold">SMART DISPATCH</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Personalized Weekly Action Plan
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Stop browsing through endless listings. Hirely prioritizes verified opportunities, filters out scam risks, estimates preparation effort, and generates a conflict-free study schedule tailored to your available time.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAvailabilityOpen(!isAvailabilityOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.14] text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-[#5DD62C]" />
              <span>Availability & Commitments</span>
              {isAvailabilityOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleGeneratePlan}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5DD62C] hover:bg-[#6ee73b] text-black font-bold text-xs shadow-[0_0_25px_rgba(93,214,44,0.4)] transition-all cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Optimizing Plan...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-black" />
                  <span>Regenerate Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Availability & Commitments Accordion */}
        <AnimatePresence>
          {isAvailabilityOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 pt-6 border-t border-white/[0.1] space-y-5"
            >
              {/* Daily Hours Sliders */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#5DD62C]" />
                  <span>Daily Study & Application Hours (Monday – Sunday)</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="p-3 rounded-xl bg-black/40 border border-white/[0.08] space-y-1.5 text-center">
                      <span className="block font-mono text-[11px] uppercase text-slate-400 font-semibold">{day.slice(0, 3)}</span>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        step="0.5"
                        value={dailyHours[day]}
                        onChange={(e) => setDailyHours({ ...dailyHours, [day]: parseFloat(e.target.value) || 0 })}
                        className="w-full text-center py-1 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white font-mono text-sm font-bold focus:outline-none focus:border-[#5DD62C]"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">hours</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commitments & Busy Blocks Manager */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-3">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                    <span>Existing Commitments / Unavailable Blocks</span>
                  </h4>

                  {commitments.length > 0 ? (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {commitments.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs">
                          <div>
                            <span className="font-semibold text-white">{c.title}</span>
                            <span className="text-slate-400 font-mono text-[11px] block capitalize">{c.day} · {c.hours}h ({c.time_range || 'Busy'})</span>
                          </div>
                          <button
                            onClick={() => handleRemoveCommitment(i)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                            title="Remove commitment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No busy blocks configured. Full daily study hours available.</p>
                  )}
                </div>

                {/* Add Commitment Form */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-3">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#5DD62C]" />
                    <span>Add Busy Commitment</span>
                  </h4>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newCommitmentDay}
                        onChange={(e) => setNewCommitmentDay(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/[0.1] text-xs text-white capitalize focus:outline-none"
                      >
                        {WEEKDAYS.map(d => (
                          <option key={d} value={d} className="bg-[#121613] capitalize">{d}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.5"
                        max="8"
                        step="0.5"
                        value={newCommitmentHours}
                        onChange={(e) => setNewCommitmentHours(parseFloat(e.target.value) || 1)}
                        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                        className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/[0.1] text-xs text-white font-mono focus:outline-none"
                        placeholder="Hours"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCommitmentTitle}
                        onChange={(e) => setNewCommitmentTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCommitment();
                          }
                        }}
                        placeholder="e.g. Distributed Systems Lab Exam"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCommitment}
                        className="px-4 py-1.5 rounded-lg bg-[#5DD62C]/20 hover:bg-[#5DD62C]/30 text-[#5DD62C] border border-[#5DD62C]/40 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferred Category Focus */}
              <div>
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">Priority Focus Categories:</span>
                <div className="flex flex-wrap gap-2">
                  {['job', 'internship', 'hackathon', 'scholarship', 'fellowship'].map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategories(selectedCategories.filter(c => c !== cat));
                          } else {
                            setSelectedCategories([...selectedCategories, cat]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono capitalize transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#5DD62C]/20 text-[#5DD62C] border border-[#5DD62C]/50 font-bold'
                            : 'bg-white/[0.03] text-slate-400 border border-white/[0.08] hover:text-white'
                        }`}
                      >
                        {isSelected ? `✓ ${cat}` : `+ ${cat}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Capacity & Intelligence Summary Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric: Allocated vs Available */}
        <div className="p-5 rounded-2xl bg-[#0B100D] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono uppercase tracking-wider">Weekly Workload Capacity</span>
            <Clock className="w-4 h-4 text-[#5DD62C]" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold font-mono text-white">
              {totalAllocated}h <span className="text-slate-400 text-sm font-normal">/ {totalAvailable}h available</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  capacityPercent > 90 ? 'bg-amber-400' : 'bg-[#5DD62C]'
                }`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {totalAvailable - totalAllocated > 0 
              ? `Buffer remaining: ${(totalAvailable - totalAllocated).toFixed(1)}h for rest/review` 
              : 'Daily schedule operating at 100% capacity limit'}
          </div>
        </div>

        {/* Metric: Task Distribution */}
        <div className="p-5 rounded-2xl bg-[#0B100D] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono uppercase tracking-wider">Dispatched Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-[#5DD62C]" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold font-mono text-white">
              {plan?.tasks.length ?? 0} <span className="text-slate-400 text-sm font-normal">opportunities scheduled</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#5DD62C]/10 text-[#5DD62C] border border-[#5DD62C]/30">
                {plan?.tasks.filter(t => t.status === 'completed').length ?? 0} Completed
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/[0.05] text-slate-300 border border-white/[0.1]">
                {plan?.tasks.filter(t => t.status === 'pending').length ?? 0} Pending
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Conflict-free time slots across 7 calendar days
          </div>
        </div>

        {/* Metric: Safety Filtering */}
        <div className="p-5 rounded-2xl bg-[#0B100D] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono uppercase tracking-wider">TrustCheck Gate</span>
            <ShieldCheck className="w-4 h-4 text-[#5DD62C]" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold font-mono text-white">
              {plan?.excluded_opportunities.length ?? 0} <span className="text-slate-400 text-sm font-normal">excluded / protected</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
              Suspicious listings, expired deadlines & experience mismatches automatically filtered.
            </p>
          </div>
          <button
            onClick={() => setShowExcluded(!showExcluded)}
            className="text-[11px] font-mono text-[#5DD62C] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showExcluded ? 'Hide filtered items' : 'Inspect filtered listings'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Plan Rationale Banner */}
      {plan?.summary_explanation && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-start gap-3 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-[#5DD62C] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-white block mb-0.5">Planning Logic & Scheduling Rationale:</span>
            {plan.summary_explanation}
          </div>
        </div>
      )}

      {/* 4. Weekly Calendar / 7-Day Action View */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#5DD62C]" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Weekly Action Schedule
            </h2>
            <span className="text-xs font-mono text-slate-400">
              ({plan?.planning_period_start} – {plan?.planning_period_end})
            </span>
          </div>

          <button
            onClick={() => setShowShortlist(!showShortlist)}
            className="text-xs font-mono text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Ranked Shortlist ({plan?.shortlist_ranked?.length ?? 0})</span>
            {showShortlist ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 7 Columns / Grid of Days */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 items-stretch">
          {WEEKDAYS.map((day) => {
            const dayTasks = tasksByDay[day] || [];
            const dayLimit = dailyHours[day] || 2.5;
            const dayUsed = plan?.used_hours_per_day?.[day] || 0;
            const dayCommitment = commitments.find(c => c.day.toLowerCase() === day);

            return (
              <div
                key={day}
                className="flex flex-col justify-between rounded-2xl p-3.5 bg-[#0F1411]/90 border border-white/[0.08] hover:border-[#5DD62C]/40 transition-all space-y-3 min-h-[360px]"
              >
                {/* Day Header */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">{day}</span>
                    <span className="font-mono text-[11px] text-slate-400">{dayUsed}h / {dayLimit}h</span>
                  </div>

                  {/* Day capacity progress bar */}
                  <div className="w-full h-1 rounded-full bg-white/[0.08] overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${
                        dayUsed > dayLimit ? 'bg-red-400' : 'bg-[#5DD62C]'
                      }`}
                      style={{ width: `${Math.min(100, (dayUsed / (dayLimit || 1)) * 100)}%` }}
                    />
                  </div>

                  {/* Commitment badge if busy */}
                  {dayCommitment && (
                    <div className="mb-2.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-mono flex items-center gap-1 truncate" title={dayCommitment.title}>
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="truncate">{dayCommitment.title}</span>
                    </div>
                  )}

                  {/* Task Cards inside Day */}
                  <div className="space-y-2.5">
                    {dayTasks.length > 0 ? (
                      dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`p-3 rounded-xl border transition-all text-xs space-y-2 group ${
                            task.status === 'completed'
                              ? 'bg-[#122A14]/30 border-[#5DD62C]/20 opacity-70'
                              : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] hover:border-[#5DD62C]/50 shadow-md'
                          }`}
                        >
                          {/* Time Slot & Effort */}
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#5DD62C]" />
                              {task.time_slot}
                            </span>
                            <span className="text-[#5DD62C] font-semibold">
                              {task.estimated_hours}h <span className="text-slate-400">(est)</span>
                            </span>
                          </div>

                          {/* Title & Organization */}
                          <div
                            onClick={() => handleOpenOpportunity(task.opportunity_id)}
                            className="cursor-pointer"
                          >
                            <h4 className={`font-semibold text-white group-hover:text-[#5DD62C] transition-colors leading-snug line-clamp-2 ${
                              task.status === 'completed' ? 'line-through text-slate-400' : ''
                            }`}>
                              {task.opportunity_title}
                            </h4>
                            <span className="text-[11px] text-slate-400 block truncate mt-0.5 font-medium">
                              {task.organization}
                            </span>
                          </div>

                          {/* Trust Badge & Category */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <TrustCheckBadge status={task.trust_status} />
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-white/[0.06] text-slate-300">
                              {task.opportunity_type}
                            </span>
                          </div>

                          {/* Task Action Bar */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                            <button
                              onClick={() => handleToggleTaskComplete(task)}
                              className={`flex items-center gap-1 text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                                task.status === 'completed' ? 'text-[#5DD62C]' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <CheckCircle2 className={`w-3.5 h-3.5 ${task.status === 'completed' ? 'text-[#5DD62C]' : ''}`} />
                              <span>{task.status === 'completed' ? 'Done' : 'Complete'}</span>
                            </button>

                            {/* Reschedule Dropdown */}
                            <select
                              value={day}
                              onChange={(e) => handleRescheduleTask(task.id, e.target.value)}
                              className="text-[10px] font-mono bg-black/60 border border-white/[0.1] rounded px-1 py-0.5 text-slate-400 hover:text-white focus:outline-none cursor-pointer"
                              title="Reschedule to another day"
                            >
                              {WEEKDAYS.map(d => (
                                <option key={d} value={d} className="bg-[#121613] capitalize">{d.slice(0, 3)}</option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                              title="Remove from plan"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-slate-500 text-xs font-mono space-y-1">
                        <span>No tasks scheduled</span>
                        <span className="block text-[10px] text-slate-600">Free focus time</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Day Footer */}
                <div className="pt-2 border-t border-white/[0.06] text-[10px] font-mono text-slate-500 flex justify-between">
                  <span>{dayTasks.length} task(s)</span>
                  <span className="capitalize">{day.slice(0, 3)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Collapsible Ranked Shortlist Inspection */}
      <AnimatePresence>
        {showShortlist && plan?.shortlist_ranked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 rounded-3xl bg-[#0B100D] border border-white/[0.08] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Transparent Scoring & Prioritization Rationale
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Formula: Composite Rank (0-100) = Skill & Role Match (0-45) + Trust Verification (0-25) + Deadline Urgency (0-20) + Category Preference (0-10)
                </p>
              </div>
              <button
                onClick={() => setShowShortlist(false)}
                className="text-xs font-mono text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="divide-y divide-white/[0.06] text-xs">
              {plan.shortlist_ranked.map((item, idx) => (
                <div key={item.opportunity_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#5DD62C]">#{idx + 1}</span>
                      <span className="font-semibold text-white">{item.title}</span>
                      <span className="text-slate-400">· {item.organization}</span>
                      <TrustCheckBadge status={item.trust_status} />
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {item.ranking_rationale}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono">
                      <span className="text-sm font-bold text-[#5DD62C]">{item.composite_rank_score} pts</span>
                      <span className="block text-[10px] text-slate-500">Est: {item.estimated_hours}h</span>
                    </div>
                    <button
                      onClick={() => handleOpenOpportunity(item.opportunity_id)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs text-white font-medium transition-all"
                    >
                      View Listing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Collapsible Safety Excluded Opportunities Panel */}
      <AnimatePresence>
        {showExcluded && plan?.excluded_opportunities && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 rounded-3xl bg-[#140D0B] border border-amber-500/30 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Safety & Eligibility Exclusions Log ({plan.excluded_opportunities.length})
                </h3>
              </div>
              <button
                onClick={() => setShowExcluded(false)}
                className="text-xs font-mono text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-300">
              The following listings were identified by Hirely but excluded from your weekly schedule to protect you from fraudulent fees, expired links, or confirmed qualification mismatches:
            </p>

            <div className="divide-y divide-white/[0.06] text-xs">
              {plan.excluded_opportunities.map((item) => (
                <div key={item.opportunity_id} className="py-2.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">{item.title} <span className="text-slate-400 font-normal">({item.organization})</span></div>
                    <div className="text-amber-300 text-[11px] mt-0.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{item.exclusion_reason}</span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase text-slate-400 px-2 py-0.5 rounded bg-black/40 border border-white/[0.08] shrink-0">
                    {item.trust_status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
