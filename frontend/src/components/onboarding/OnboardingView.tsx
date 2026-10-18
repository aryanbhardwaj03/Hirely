import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { OpportunityCategory } from '../../types/opportunity';
import { GraduationCap, MapPin, Wrench, Plus, X, Sparkles, ArrowRight } from 'lucide-react';

export const OnboardingView: React.FC = () => {
  const { currentUser, profile, updateProfile, logout } = useApp();
  const [name, setName] = useState(profile.name || currentUser?.displayName || '');
  const email = currentUser?.email || profile.email || '';
  const [university, setUniversity] = useState(profile.university);
  const [degree, setDegree] = useState(profile.degree);
  const [fieldOfStudy, setFieldOfStudy] = useState(profile.fieldOfStudy);
  const [year, setYear] = useState(profile.year ? String(profile.year) : '');
  const [location, setLocation] = useState(profile.location);
  const [skills, setSkills] = useState<string[]>(profile.skills);
  const [skillInput, setSkillInput] = useState('');
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [interestInput, setInterestInput] = useState('');
  const [categories, setCategories] = useState<OpportunityCategory[]>(profile.preferredCategories);
  const [error, setError] = useState('');

  const addItem = (value: string, items: string[], setter: (value: string[]) => void, clear: () => void) => {
    const cleaned = value.trim();
    if (cleaned && !items.some(item => item.toLowerCase() === cleaned.toLowerCase())) setter([...items, cleaned]);
    clear();
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !university.trim() || !degree.trim() || !fieldOfStudy.trim() || !year || !location.trim() || skills.length === 0) {
      setError('Please complete all required fields and add at least one skill.'); return;
    }
    updateProfile({ name: name.trim(), email, university: university.trim(), degree: degree.trim(), fieldOfStudy: fieldOfStudy.trim(), year: Number(year), location: location.trim(), skills, interests, preferredCategories: categories });
  };
  const categoryOptions: { id: OpportunityCategory; label: string }[] = [
    { id: 'job', label: 'Jobs' }, { id: 'internship', label: 'Internships' }, { id: 'scholarship', label: 'Scholarships' }, { id: 'hackathon', label: 'Hackathons' }, { id: 'fellowship', label: 'Fellowships' }, { id: 'competition', label: 'Competitions' },
  ];
  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#5DD62C]/60';
  const labelClass = 'mb-1.5 block text-xs font-medium text-slate-300';
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto bg-[#0F0F0F] px-4 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(93,214,44,0.12),transparent_55%)]" />
      <form onSubmit={submit} className="relative w-full max-w-3xl space-y-7 rounded-3xl border border-white/10 bg-[#141714]/95 p-5 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#5DD62C]/25 bg-[#5DD62C]/10 px-3 py-1.5 text-xs font-semibold text-[#8BE66A]"><Sparkles size={14} /> YOUR HIRELY PROFILE</div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Let's personalize your opportunities.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Tell us about your education, location, and skills so we can find opportunities relevant to you. You can edit these details later.</p></div><button type="button" onClick={() => void logout()} className="shrink-0 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white">Sign out</button></div>
        <section className="space-y-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><GraduationCap size={17} className="text-[#5DD62C]" /> Personal and academic details</h2><div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelClass}>Full name *</label><input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" autoComplete="name" required /></div>
          <div><label className={labelClass}>Email</label><input className={`${inputClass} opacity-70`} value={email} readOnly /></div>
          <div><label className={labelClass}>College / University *</label><input className={inputClass} value={university} onChange={e => setUniversity(e.target.value)} placeholder="Your institution" required /></div>
          <div><label className={labelClass}>Degree *</label><input className={inputClass} value={degree} onChange={e => setDegree(e.target.value)} placeholder="e.g. B.Tech, BSc, MBA" required /></div>
          <div><label className={labelClass}>Field of study / Major *</label><input className={inputClass} value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} placeholder="e.g. Computer Science" required /></div>
          <div><label className={labelClass}>Current year of study *</label><select className={inputClass} value={year} onChange={e => setYear(e.target.value)} required><option value="">Select year</option><option value="1">1st year</option><option value="2">2nd year</option><option value="3">3rd year</option><option value="4">4th year</option><option value="5">Graduate / Master's / PhD</option></select></div>
          <div className="sm:col-span-2"><label className={labelClass}><MapPin size={13} className="mr-1 inline" />Current city / location *</label><input className={inputClass} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Delhi, India" required /></div>
        </div></section>
        <section className="space-y-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Wrench size={17} className="text-[#5DD62C]" /> Skills and tools *</h2><p className="text-xs text-slate-400">Add at least one skill. More skills usually improve matching.</p><div className="flex gap-2"><input className={inputClass} value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="e.g. Python, React, UI design" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(skillInput, skills, setSkills, () => setSkillInput('')); } }} /><button type="button" onClick={() => addItem(skillInput, skills, setSkills, () => setSkillInput(''))} className="rounded-xl bg-white/10 px-4 text-sm hover:bg-white/15"><Plus size={17} /></button></div><div className="flex flex-wrap gap-2">{skills.map(skill => <span key={skill} className="inline-flex items-center gap-2 rounded-lg border border-[#5DD62C]/20 bg-[#5DD62C]/10 px-3 py-1.5 text-xs text-[#B8F5A4]">{skill}<button type="button" aria-label={`Remove ${skill}`} onClick={() => setSkills(skills.filter(s => s !== skill))}><X size={13} /></button></span>)}</div></section>
        <section className="space-y-3"><h2 className="text-sm font-semibold">Interests (optional)</h2><div className="flex gap-2"><input className={inputClass} value={interestInput} onChange={e => setInterestInput(e.target.value)} placeholder="e.g. AI, product design, research" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(interestInput, interests, setInterests, () => setInterestInput('')); } }} /><button type="button" onClick={() => addItem(interestInput, interests, setInterests, () => setInterestInput(''))} className="rounded-xl bg-white/10 px-4 text-sm hover:bg-white/15"><Plus size={17} /></button></div><div className="flex flex-wrap gap-2">{interests.map(item => <span key={item} className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-slate-300">{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => setInterests(interests.filter(i => i !== item))}><X size={13} /></button></span>)}</div></section>
        <section className="space-y-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={17} className="text-[#5DD62C]" /> What opportunities interest you?</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{categoryOptions.map(option => { const selected = categories.includes(option.id); return <button type="button" key={option.id} onClick={() => setCategories(prev => selected ? prev.filter(c => c !== option.id) : [...prev, option.id])} className={`rounded-xl border px-3 py-3 text-sm transition-colors ${selected ? 'border-[#5DD62C]/50 bg-[#5DD62C]/10 text-[#8BE66A]' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.06]'}`}>{option.label}</button>; })}</div></section>
        {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5DD62C] px-5 py-3.5 text-sm font-bold text-black transition hover:bg-[#79e64d]">Save profile and continue <ArrowRight size={17} /></button><p className="text-center text-[11px] text-slate-500">Your profile is saved separately for this signed-in account.</p>
      </form>
    </div>
  );
};
