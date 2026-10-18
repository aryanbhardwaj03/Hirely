import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { OpportunityCategory, Opportunity, OpportunitySortOption, LocationScope } from '../../types/opportunity';
import { OpportunityCard } from '../opportunity/OpportunityCard';
import {
  Search,
  Filter,
  Sparkles,
  MapPin,
  Globe,
  RotateCcw,
  RefreshCw,
  ArrowUpDown,
  Building
} from 'lucide-react';
import { searchBackendOpportunities } from '../../services/api';
import { matchesLocationScope, sortOpportunities, isTrustworthySource } from '../../utils/opportunityFilters';

export const DiscoverView: React.FC = () => {
  const {
    opportunities,
    runDiscovery,
    isDiscovering,
    fastapiHealth,
    profile,
    locationScope,
    setLocationScope,
    sortBy,
    setSortBy
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<OpportunityCategory[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [backendResults, setBackendResults] = useState<Opportunity[] | null>(null);

  const categories: { id: OpportunityCategory; label: string }[] = [
    { id: 'internship', label: 'Internships' },
    { id: 'scholarship', label: 'Scholarships' },
    { id: 'hackathon', label: 'Hackathons' },
    { id: 'fellowship', label: 'Fellowships' },
    { id: 'job', label: 'Jobs' },
    { id: 'competition', label: 'Competitions' },
  ];

  const locationOptions: { id: LocationScope; label: string }[] = [
    { id: 'delhi_ncr', label: 'Delhi/NCR, India' },
    { id: 'india', label: 'Anywhere in India' },
    { id: 'remote_worldwide', label: 'Remote Worldwide' },
    { id: 'all', label: 'All Global Locations' },
  ];

  const toggleCategory = (cat: OpportunityCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Live search call to backend if connected
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
    const filtered = sourceList.filter(opp => {
      // Trustworthy source filter
      if (!isTrustworthySource(opp.url, opp.source)) return false;

      // Location scope filter
      if (!matchesLocationScope(opp, locationScope)) return false;

      // Search text
      if (search.trim() && !backendResults) {
        const q = search.toLowerCase();
        const matchesTitle = opp.title.toLowerCase().includes(q);
        const matchesOrg = opp.organization.toLowerCase().includes(q);
        const matchesSkill = opp.required_skills.some(s => s.toLowerCase().includes(q));
        const matchesLocation = opp.location.toLowerCase().includes(q);
        if (!matchesTitle && !matchesOrg && !matchesSkill && !matchesLocation) return false;
      }

      // Categories
      if (selectedCategories.length > 0 && !selectedCategories.includes(opp.category)) {
        return false;
      }

      // Remote only
      if (remoteOnly && !opp.isRemote) {
        return false;
      }

      return true;
    });

    return sortOpportunities(filtered, sortBy, profile.location);
  }, [sourceList, search, selectedCategories, remoteOnly, locationScope, sortBy, profile.location, backendResults]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategories([]);
    setRemoteOnly(false);
    setLocationScope('delhi_ncr');
    setSortBy('newest');
    setBackendResults(null);
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Opportunity Intelligence Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Explore verified scholarships, internships, hackathons, and fellowships calibrated to your academic path.
          </p>
        </div>

        <button
          onClick={() => runDiscovery(selectedCategories)}
          disabled={isDiscovering}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5DD62C]/20 hover:bg-[#5DD62C]/30 border border-[#5DD62C]/50 text-[#5DD62C] text-xs font-bold shadow-[0_0_20px_rgba(93,214,44,0.2)] transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
          <span>{isDiscovering ? 'Scanning...' : 'Rerun Live Scan'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl p-5 sm:p-6 bg-[#202020]/90 backdrop-blur-2xl border border-white/[0.1] shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, organization, skills (e.g. Python, PyTorch, Delhi, MIT)..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#0F0F0F] border border-white/[0.1] text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#5DD62C]/60 transition-colors"
            />
          </div>

          {/* Location Scope Selector */}
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#5DD62C] shrink-0" />
            <select
              value={locationScope}
              onChange={(e) => setLocationScope(e.target.value as LocationScope)}
              className="h-10 px-3 rounded-xl bg-[#0F0F0F] border border-white/[0.1] text-xs font-mono text-white focus:outline-none focus:border-[#5DD62C]/60 cursor-pointer"
            >
              {locationOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#5DD62C] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as OpportunitySortOption)}
              className="h-10 px-3 rounded-xl bg-[#0F0F0F] border border-white/[0.1] text-xs font-mono text-white focus:outline-none focus:border-[#5DD62C]/60 cursor-pointer"
            >
              <option value="newest">Newest published date</option>
              <option value="highest_paying">Highest compensation</option>
              <option value="nearest">Nearest to my location</option>
              <option value="best_match">Best profile match</option>
              <option value="deadline_soonest">Deadline soonest</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips & Remote Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-300 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#5DD62C]" />
              Category:
            </span>
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#5DD62C] text-[#0F0F0F] shadow-[0_0_12px_rgba(93,214,44,0.3)] font-bold'
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
                className="rounded accent-[#5DD62C] w-3.5 h-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-[#5DD62C]" />
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
          Showing <span className="text-[#5DD62C] font-bold">{filteredOpportunities.length}</span> verified opportunities
        </span>
        <span className="text-[11px] text-slate-400">
          Source: Verified Employer & Competition Portals
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
        <div className="rounded-2xl p-12 bg-[#202020]/60 border border-white/[0.08] text-center space-y-4">
          <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-white">No opportunities match current criteria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try broadening your location filter, clearing category selections, or adjusting your search keywords.
          </p>
          <button
            onClick={() => {
              setLocationScope('all');
              setSelectedCategories([]);
              setSearch('');
            }}
            className="px-4 py-2 rounded-xl bg-[#5DD62C] text-[#0F0F0F] text-xs font-bold hover:shadow-[0_0_15px_rgba(93,214,44,0.4)] transition-all cursor-pointer"
          >
            Show All Opportunities
          </button>
        </div>
      )}
    </div>
  );
};
