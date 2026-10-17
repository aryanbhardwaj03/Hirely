import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentProfile, OpportunityCategory } from '../../types/opportunity';
import { 
  User, 
  Mail, 
  GraduationCap, 
  BookOpen, 
  MapPin, 
  Wrench, 
  Plus, 
  X, 
  Check, 
  Sparkles,
  Save,
  FileText,
  UploadCloud,
  Loader2
} from 'lucide-react';
import { parseResumeText } from '../../services/api';

export const ProfileView: React.FC = () => {
  const { profile, updateProfile, showToast } = useApp();

  const [formData, setFormData] = useState<StudentProfile>(profile);
  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Resume parse state
  const [resumeText, setResumeText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);

  const categories: { id: OpportunityCategory; label: string }[] = [
    { id: 'internship', label: 'Internships' },
    { id: 'scholarship', label: 'Scholarships' },
    { id: 'hackathon', label: 'Hackathons' },
    { id: 'fellowship', label: 'Fellowships' },
    { id: 'competition', label: 'Competitions' },
  ];

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData(prev => ({ ...prev, interests: [...prev.interests, newInterest.trim()] }));
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interestToRemove)
    }));
  };

  const toggleCategory = (cat: OpportunityCategory) => {
    setFormData(prev => {
      const exists = prev.preferredCategories.includes(cat);
      const updated = exists 
        ? prev.preferredCategories.filter(c => c !== cat)
        : [...prev.preferredCategories, cat];
      return { ...prev, preferredCategories: updated };
    });
  };

  const handleSave = () => {
    updateProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleParseResume = async () => {
    if (!resumeText.trim()) return;
    setIsParsing(true);
    const parsed = await parseResumeText(resumeText);
    setIsParsing(false);

    if (parsed) {
      const mergedSkills = Array.from(new Set([...formData.skills, ...parsed.extracted_skills]));
      const mergedInterests = Array.from(new Set([...formData.interests, ...parsed.suggested_interests]));
      
      setFormData(prev => ({
        ...prev,
        skills: mergedSkills,
        interests: mergedInterests,
        fieldOfStudy: parsed.suggested_target_role || prev.fieldOfStudy,
      }));
      showToast(`Resume parsed! Extracted ${parsed.extracted_skills.length} skills.`, 'success');
      setShowResumeModal(false);
      setResumeText('');
    } else {
      showToast('Could not parse resume text; check backend connection.', 'warning');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Talent Profile & Calibration
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Personalize your skills, education, and target categories to recalibrate semantic matching.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowResumeModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#00E676]" />
            <span>Parse Resume</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-bold shadow-xl transition-all cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Saved & Calibrated!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save & Recalibrate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Academic & Contact Profile */}
        <div className="space-y-5">
          <div className="rounded-2xl p-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-[0_0_40px_rgba(0,230,118,0.08)] space-y-4 glass-inner-highlight">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-white/[0.08]">
              <GraduationCap className="w-4 h-4 text-[#00E676]" />
              Academic Credentials
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#00E676]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  University Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#00E676]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Degree Program
                </label>
                <input
                  type="text"
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  placeholder="e.g. B.Tech / B.S."
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#00E676]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Current Year of Study
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-xl bg-[#090C0E] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#00E676]/50"
                >
                  <option value={1}>1st Year (Freshman)</option>
                  <option value={2}>2nd Year (Sophomore)</option>
                  <option value={3}>3rd Year (Junior)</option>
                  <option value={4}>4th Year (Senior)</option>
                  <option value={5}>Graduate / Masters / PhD</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Field of Study / Major
                </label>
                <input
                  type="text"
                  value={formData.fieldOfStudy}
                  onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                  placeholder="e.g. Computer Science & AI"
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#00E676]/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Institution / University
                </label>
                <input
                  type="text"
                  value={formData.university}
                  onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#00E676]/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Base Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#00E676]/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Skills, Categories, and Preferences */}
        <div className="space-y-5">
          {/* Skills Chips */}
          <div className="rounded-2xl p-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-[0_0_40px_rgba(0,230,118,0.08)] space-y-3 glass-inner-highlight">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-white/[0.08]">
              <Wrench className="w-4 h-4 text-[#00E676]" />
              Verified Skills & Tools
            </h2>

            {/* Input to add skill */}
            <form onSubmit={handleAddSkill} className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add skill (e.g. Next.js, Rust, Docker)..."
                className="flex-1 h-9 px-3 rounded-xl bg-white/[0.03] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#00E676]/50"
              />
              <button
                type="submit"
                className="px-3 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Chips List */}
            <div className="flex flex-wrap gap-2 pt-1">
              {formData.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs font-mono text-slate-200"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Target Opportunity Channels */}
          <div className="rounded-2xl p-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-[0_0_40px_rgba(0,230,118,0.08)] space-y-3 glass-inner-highlight">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-white/[0.08]">
              <Sparkles className="w-4 h-4 text-[#00E676]" />
              Preferred Opportunity Channels
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const isSelected = formData.preferredCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#00E676]/20 border-[#00E676]/50 text-[#00E676]'
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-300 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Remote Work Preference */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">
                Prioritize Remote-Eligible Opportunities
              </span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, remotePreference: !formData.remotePreference })}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  formData.remotePreference ? 'bg-[#00E676]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform ${
                    formData.remotePreference ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Parse Modal Shortcut */}
      {showResumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#090E0B] border border-white/[0.14] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00E676]" />
                <h3 className="text-base font-semibold text-white">Auto-Extract Skills from Resume / Bio</h3>
              </div>
              <button onClick={() => setShowResumeModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Paste your resume text or LinkedIn summary below. Hirely's resume parser will extract your top skills, target role, and suggested interests.
            </p>

            <textarea
              rows={6}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste raw resume text or candidate bio here (e.g. Alex Chen - Software Engineer with experience in Python, React, PyTorch, Docker, building distributed AI workflows...)"
              className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#00E676]/50 placeholder:text-slate-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResumeModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleParseResume}
                disabled={isParsing || !resumeText.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
              >
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>{isParsing ? 'Parsing...' : 'Extract & Apply to Profile'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
