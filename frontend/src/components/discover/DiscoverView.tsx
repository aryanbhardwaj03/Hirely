import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { OpportunityCategory, Opportunity } from '../../types/opportunity';
import { OpportunityCard } from '../opportunity/OpportunityCard';
import { 
  Search, 
  Filter, 
  Sparkles, 
  MapPin, 
  Globe, 
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { searchBackendOpportunities } from '../../services/api';

export const DiscoverView: React.FC = () => {
  const { opportunities, runDiscovery, isDiscovering, fastapiHealth } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<OpportunityCategory[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'match' | 'deadline' | 'title'>('match');
  const [minMatch, setMinMatch] = useState(80);
  const [backendResults, setBackendResults] = useState<Opportunity[] | null>(null);

  const categories: { id: OpportunityCategory; label: string }[] = [
    { id: 'internship', label: 'Internships' },
    { id: 'scholarship', label: 'Scholarships' },
    { id: 'hackathon', label: 'Hackathons' },
    { id: 'fellowship', label: 'Fellowships' },
    { id: 'job', label: 'Jobs' },
    { id: 'competition', label: 'Competitions' },
  ];

  const toggleCategory = (cat: OpportunityCategory) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Live search call to backend if connected and user types
  useEffect(() => {
    if (!fastapiHealth?.is_connected || !search.trim()) {
      setBackendResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      const typeParam = selectedCategories.length === 1 ? selectedCategories[0] : 'all';
      const results = await searchBackendOpportunities({
        query: search,
        opportunity_type: typeParam,
        remote_only: remoteOnly,
        limit: 25,
      });
      if (results && results.length > 0) {
        setBackendResults(results);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search, selectedCategories, remoteOnly, fastapiHealth?.is_connected]);

  const sourceList = backendResults || opportunities;

  const filteredOpportunities = useMemo(() => {
    return sourceList.filter(opp => {
      // Search text
      if (search.trim() && !backendResults) {
        const q = search.toLowerCase();
        const matchesTitle = opp.title.toLowerCase().includes(q);
        const matchesOrg = opp.organization.toLowerCase().includes(q);
        const matchesSkill = opp.required_skills.some(s => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesOrg && !matchesSkill) return false;
      }
      // Categories
      if (selectedCategories.length > 0 && !selectedCategories.includes(opp.category)) {
        return false;
      }
      // Remote only
      if (remoteOnly && !opp.isRemote) {
        return false;
      }
      // Min match
      if (opp.match_score < minMatch) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'match') return b.match_score - a.match_score;
      if (sortBy === 'deadline') return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
      return a.title.localeCompare(b.title);
    });
  }, [sourceList, search, selectedCategories, remoteOnly, minMatch, sortBy, backendResults]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategories([]);
    setRemoteOnly(false);
    setMinMatch(80);
    setSortBy('match');
    setBackendResults(null);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Opportunity Intelligence Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Explore live scholarships, fellowships, internships, and hackathons calibrated to your academic path.
          </p>
        </div>

        <button
          onClick={() => runDiscovery(selectedCategories)}
          disabled={isDiscovering}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00E676]/20 hover:bg-[#00E676]/30 border border-[#00E676]/50 text-[#00E676] text-xs font-bold shadow-[0_0_20px_rgba(0,230,118,0.18)] transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
          <span>{isDiscovering ? 'Scanning...' : 'Rerun Live Scan'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl p-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-[0_0_40px_rgba(0,230,118,0.08)] space-y-4 glass-inner-highlight">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title, company, skills (e.g. PyTorch, React, AnitaB)..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00E676]/50 transition-colors"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-300 uppercase font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 px-3 rounded-xl bg-[#090C0E] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#00E676]/50"
            >
              <option value="match">Relevance Match %</option>
              <option value="deadline">Approaching Deadlines</option>
              <option value="title">Alphabetical Title</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips & Remote Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-300 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#00E676]" />
              Type:
            </span>
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#00E676] text-black shadow-md'
                      : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {/* Remote Only Toggle */}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="rounded accent-[#00E676] w-3.5 h-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-[#00E676]" />
                Remote Only
              </span>
            </label>

            {/* Reset Filters */}
            <button
              onClick={resetFilters}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-300 px-1 font-mono">
        <span>
          Showing <span className="text-[#00E676] font-bold">{filteredOpportunities.length}</span> opportunities
        </span>
        <span className="text-[11px] text-slate-400">
          Source: Verified TinyFish Portals
        </span>
      </div>

      {/* Grid of Opportunities */}
      {filteredOpportunities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOpportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} layout="grid" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl p-12 bg-white/[0.02] border border-white/[0.08] text-center space-y-3">
          <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-white">No opportunities match current criteria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search terms, lowering the minimum match threshold, or toggling remote filters.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
