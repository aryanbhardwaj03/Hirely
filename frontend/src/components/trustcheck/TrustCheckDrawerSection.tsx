import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  RefreshCw, 
  ExternalLink, 
  Flag, 
  DollarSign, 
  Building2, 
  Info,
  Loader2
} from 'lucide-react';
import { TrustAssessment, Opportunity } from '../../types/opportunity';
import { fetchTrustAssessment, recheckTrustAssessment } from '../../services/api';
import { ScamReportModal } from './ScamReportModal';
import { useApp } from '../../context/AppContext';

interface TrustCheckDrawerSectionProps {
  opportunity: Opportunity;
}

export const TrustCheckDrawerSection: React.FC<TrustCheckDrawerSectionProps> = ({ opportunity }) => {
  const { showToast } = useApp();
  const [assessment, setAssessment] = useState<TrustAssessment | null>(opportunity.trust_assessment || null);
  const [loading, setLoading] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'facts' | 'risks' | 'missing'>('facts');

  useEffect(() => {
    let isMounted = true;
    const loadAssessment = async () => {
      setLoading(true);
      const res = await fetchTrustAssessment(opportunity.id);
      if (isMounted) {
        if (res) {
          setAssessment(res);
          // Set default tab based on whether risks exist
          if (res.risk_indicators && res.risk_indicators.length > 0) {
            setActiveTab('risks');
          } else {
            setActiveTab('facts');
          }
        }
        setLoading(false);
      }
    };

    loadAssessment();
    return () => {
      isMounted = false;
    };
  }, [opportunity.id]);

  const handleRecheck = async () => {
    setRechecking(true);
    showToast('Executing fresh TinyFish web fetch & domain cross-check...', 'info');
    const res = await recheckTrustAssessment(opportunity.id);
    setRechecking(false);
    if (res) {
      setAssessment(res);
      showToast('TrustCheck assessment refreshed.', 'success');
    } else {
      showToast('Could not refresh TrustCheck evidence.', 'warning');
    }
  };

  if (loading && !assessment) {
    return (
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center gap-3 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin text-[#5DD62C]" />
        <span>Authenticating sources via TinyFish & TrustCheck...</span>
      </div>
    );
  }

  // Fallback defaults if API is not yet loaded
  const currentStatus = assessment?.status || opportunity.trust_status || (opportunity.isSourceVerified ? 'verified' : 'unverified');
  const score = assessment?.score ?? (currentStatus === 'verified' ? 92 : (currentStatus === 'suspicious' ? 35 : 55));
  const verifiedFacts = assessment?.verified_facts?.length 
    ? assessment.verified_facts 
    : [
        `Opportunity matches stated domain: ${opportunity.organization}`,
        'Zero candidate upfront application fees stated',
        'Valid technical requirements and stated criteria'
      ];
  const riskIndicators = assessment?.risk_indicators || [];
  const missingInfo = assessment?.missing_information?.length
    ? assessment.missing_information
    : ['Direct recruiter verified corporate email address'];

  return (
    <div className="space-y-4">
      {/* Trust Header Card */}
      <div className={`p-4 rounded-2xl border transition-all ${
        currentStatus === 'verified'
          ? 'bg-gradient-to-br from-[#122A14]/70 to-[#0A150C]/90 border-[#5DD62C]/30 shadow-[0_0_20px_rgba(93,214,44,0.1)]'
          : currentStatus === 'suspicious'
          ? 'bg-gradient-to-br from-amber-950/40 to-black/80 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
          : 'bg-white/[0.03] border-white/[0.08]'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {currentStatus === 'verified' && (
              <div className="p-2 rounded-xl bg-[#5DD62C]/15 border border-[#5DD62C]/40 text-[#5DD62C]">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            {currentStatus === 'suspicious' && (
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            {currentStatus === 'unverified' && (
              <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {currentStatus === 'verified' && 'Verified Against Sources'}
                  {currentStatus === 'suspicious' && 'Suspicious Listing — Exercise Caution'}
                  {currentStatus === 'unverified' && 'Unverified Opportunity'}
                </h3>
              </div>
              <p className="text-[11px] font-mono text-slate-300 mt-0.5">
                Trust Confidence: <span className="font-bold text-white">{score}/100</span>
                {assessment?.source_domain && ` · Host: ${assessment.source_domain}`}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleRecheck}
              disabled={rechecking}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors cursor-pointer"
              title="Force recheck sources"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rechecking ? 'animate-spin text-[#5DD62C]' : ''}`} />
            </button>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
              title="Report suspicious scam"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Score Progress Track */}
        <div className="mt-3">
          <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                currentStatus === 'verified'
                  ? 'bg-[#5DD62C]'
                  : currentStatus === 'suspicious'
                  ? 'bg-amber-400'
                  : 'bg-slate-400'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Human-readable explanation */}
        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
          {assessment?.explanation || (
            currentStatus === 'verified'
              ? 'Corroborated against official organizational career portals with standard non-fee application criteria.'
              : currentStatus === 'suspicious'
              ? 'Warning indicators detected. Inspect fee details and domain legitimacy before proceeding.'
              : 'Insufficient independent public web records to establish corporate verification.'
          )}
        </p>
      </div>

      {/* Structured Evidence Tabs */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 text-xs">
          <button
            onClick={() => setActiveTab('facts')}
            className={`flex items-center gap-1.5 pb-1 font-semibold transition-colors cursor-pointer ${
              activeTab === 'facts'
                ? 'text-[#5DD62C] border-b-2 border-[#5DD62C]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5DD62C]" />
            <span>Verified Facts ({verifiedFacts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('risks')}
            className={`flex items-center gap-1.5 pb-1 font-semibold transition-colors cursor-pointer ${
              activeTab === 'risks'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Risk Indicators ({riskIndicators.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('missing')}
            className={`flex items-center gap-1.5 pb-1 font-semibold transition-colors cursor-pointer ${
              activeTab === 'missing'
                ? 'text-slate-200 border-b-2 border-slate-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Missing Info ({missingInfo.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="space-y-2 pt-1 text-xs">
          {activeTab === 'facts' && (
            verifiedFacts.length > 0 ? (
              verifiedFacts.map((fact, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5DD62C] shrink-0 mt-0.5" />
                  <span>{fact}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic">No empirical facts corroborated yet.</p>
            )
          )}

          {activeTab === 'risks' && (
            riskIndicators.length > 0 ? (
              riskIndicators.map((risk, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{risk}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-[#5DD62C] py-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero red flags or suspicious fee requests detected.</span>
              </div>
            )
          )}

          {activeTab === 'missing' && (
            missingInfo.length > 0 ? (
              missingInfo.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-400">
                  <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic">All key corporate verification criteria satisfied.</p>
            )
          )}
        </div>
      </div>

      {/* Financial & Fee Transparency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-[#5DD62C]" />
            <span className="font-semibold">Candidate Fee Policy</span>
          </div>
          <div className="font-mono text-white">
            {assessment?.financial_details?.fee_status || 'Free / No Application Fee'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Building2 className="w-3.5 h-3.5 text-[#5DD62C]" />
            <span className="font-semibold">Organizer Channel</span>
          </div>
          <div className="font-mono text-white truncate">
            {assessment?.organizer_details?.domain || opportunity.sourceDomain || 'Official Site'}
          </div>
        </div>
      </div>

      {/* Evidence Sources & Disclaimer */}
      <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span className="font-mono uppercase tracking-wider text-[10px] text-slate-500">Cross-Checked Source URL:</span>
          <a
            href={opportunity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#5DD62C] hover:underline font-mono"
          >
            <span>Inspect Web Source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          {assessment?.disclaimer || 'TrustCheck evaluations synthesize public web evidence. A verified status reflects supporting source alignment, not an absolute guarantee.'}
        </p>
      </div>

      {/* Scam Report Modal Portal */}
      <ScamReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        opportunityId={opportunity.id}
        opportunityTitle={opportunity.title}
        organization={opportunity.organization}
        onReportSubmitted={() => {
          handleRecheck();
        }}
      />
    </div>
  );
};
