import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, 
  Target, 
  Building2, 
  Globe2, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  BookOpen, 
  Award, 
  Code2, 
  BrainCircuit, 
  Layers, 
  Check, 
  Flame, 
  AlertCircle,
  HelpCircle,
  Sliders,
  Send
} from 'lucide-react';
import { PageLoader } from '@/components/ui/PageLoader';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';

// ─── Step Options Definition ──────────────────────────────────────────

const TARGET_ROLES = [
  { id: 'Software Engineer', title: 'Software Engineer', subtitle: 'General fullstack / backend SDE with strong DSA', icon: Code2 },
  { id: 'ML/AI Engineer', title: 'ML/AI Engineer', subtitle: 'Deep learning, NLP, LLM fine-tuning & ML pipelines', icon: BrainCircuit },
  { id: 'DevOps/SRE', title: 'DevOps/SRE', subtitle: 'CI/CD, Kubernetes, cloud reliability & observability', icon: Layers },
  { id: 'Mobile Engineer', title: 'Mobile Engineer', subtitle: 'React Native, Flutter, Swift/iOS, Kotlin/Android', icon: Sliders },
  { id: 'Data Engineer', title: 'Data Engineer', subtitle: 'Big data pipelines, Spark, Kafka, SQL & warehouse modeling', icon: Target },
  { id: 'Security Engineer', title: 'Security Engineer', subtitle: 'AppSec, cryptography, vulnerability testing & network audits', icon: Award }
];

const COMPANY_TYPES = [
  { id: 'FAANG/Big Tech', title: 'FAANG / Big Tech', subtitle: 'Google, Amazon, Meta, Microsoft (High DSA & Bar-Raiser focus)', tag: 'Tier-1' },
  { id: 'Unicorn/Late-stage', title: 'Unicorn / Late-stage', subtitle: 'High-growth startups (System design & velocity focus)', tag: 'High-Yield' },
  { id: 'Early Startup', title: 'Early Startup', subtitle: 'Seed to Series A (0-to-1 building, autonomy & execution)', tag: 'Fast-Track' },
  { id: 'Product Company', title: 'Product Company', subtitle: 'Established tech organizations with strong engineering culture', tag: 'Core SDE' },
  { id: 'IT Services/Consulting', title: 'IT Services / Prime', subtitle: 'TCS Prime, Infosys Specialist, Accenture, Cognizant', tag: 'High-Volume' },
  { id: 'Research/Academia', title: 'Research / Academia', subtitle: 'R&D labs, deep tech publications, masters / PhD tracks', tag: 'Deep-Tech' }
];

const REGIONS = [
  { id: 'India', title: 'India', subtitle: 'Bangalore, Hyderabad, NCR, Pune tech hubs' },
  { id: 'USA', title: 'USA', subtitle: 'Silicon Valley, Seattle, NYC (H1B/F1 or local)' },
  { id: 'Canada', title: 'Canada', subtitle: 'Toronto, Vancouver, Montreal tech ecosystem' },
  { id: 'Europe', title: 'Europe', subtitle: 'UK, Germany, Netherlands, Switzerland' },
  { id: 'APAC', title: 'APAC', subtitle: 'Singapore, Tokyo, Sydney technology corridors' },
  { id: 'Remote/Flexible', title: 'Remote / Flexible', subtitle: 'Global remote-first engineering organizations' }
];

const SKILLS_LIST = [
  'DSA',
  'System Design',
  'OS',
  'Networks',
  'DBMS',
  'OOP',
  'Git',
  'REST APIs',
  'Cloud',
  'Docker/K8s',
  'ML Basics',
  'Projects',
  'Competitive Programming',
  'Communication',
  'Open Source',
  'Internship Experience'
];

interface RoadmapStats {
  phases: number;
  topics: number;
  problems: number;
  interviews: number;
}

interface RoadmapPhase {
  name: string;
  timing: string;
  color: string;
  focus: string;
  tasks: string[];
  resources: string[];
}

interface RoadmapData {
  title: string;
  summary: string;
  stats: RoadmapStats;
  phases: RoadmapPhase[];
}

interface RoadmapRecord {
  id: string;
  studentId: string;
  updatedAt: string;
  roadmap: RoadmapData;
  inputs: {
    targetRole: string;
    companyType: string;
    region: string;
    timelineMonths: number;
    gradYear: string;
    skills: string[];
  };
}

export default function CareerPlanner() {
  const { user } = useAuth();

  // Step state (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form selections
  const [targetRole, setTargetRole] = useState<string>('Software Engineer');
  const [companyType, setCompanyType] = useState<string>('FAANG/Big Tech');
  const [region, setRegion] = useState<string>('India');
  const [timelineMonths, setTimelineMonths] = useState<number>(6);
  const [gradYear, setGradYear] = useState<'3rd year' | '4th year'>('3rd year');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['DSA', 'DBMS', 'OOP', 'REST APIs', 'Git']);

  // Saved Roadmap state
  const [savedRecord, setSavedRecord] = useState<RoadmapRecord | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({ 0: true, 1: true });

  // 1. Fetch existing saved roadmap on load
  useEffect(() => {
    fetch('/api/planner', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data && data.roadmapRecord) {
          setSavedRecord(data.roadmapRecord);
          // Restore selections if present
          if (data.roadmapRecord.inputs) {
            const inp = data.roadmapRecord.inputs;
            if (inp.targetRole) setTargetRole(inp.targetRole);
            if (inp.companyType) setCompanyType(inp.companyType);
            if (inp.region) setRegion(inp.region);
            if (inp.timelineMonths) setTimelineMonths(inp.timelineMonths);
            if (inp.gradYear) setGradYear(inp.gradYear as '3rd year' | '4th year');
            if (inp.skills) setSelectedSkills(inp.skills);
          }
        }
      })
      .catch(err => console.error("Could not load existing roadmap:", err))
      .finally(() => setLoadingInitial(false));
  }, []);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const togglePhaseAccordion = (idx: number) => {
    setExpandedPhases(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // 2. Submit form to generate personalized roadmap
  const handleGenerateRoadmap = async () => {
    setErrorMsg('');
    setGenerating(true);

    try {
      const res = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetRole,
          companyType,
          region,
          timelineMonths,
          gradYear,
          skills: selectedSkills
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        if (res.status === 401 || (data.error && data.error.toLowerCase().includes('unauthenticated'))) {
          throw new Error('Please sign in or create an account to generate and save your roadmap.');
        }
        throw new Error(data.error || 'Failed to generate roadmap.');
      }

      setSavedRecord(data.roadmapRecord);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate roadmap.';
      setErrorMsg(msg);
    } finally {
      setGenerating(false);
    }
  };

  // 3. Clear stored roadmap & Start Over
  const handleStartOver = async () => {
    try {
      await fetch('/api/planner/reset', {
        method: 'POST',
        credentials: 'include'
      });
      setSavedRecord(null);
      setCurrentStep(1);
    } catch (err) {
      console.error("Failed to reset roadmap:", err);
    }
  };

  if (loadingInitial) {
    return <PageLoader />;
  }

  return (
    <div className="flex-1 bg-[#0B1020] text-white min-h-[calc(100vh-5rem)] flex flex-col justify-start relative overflow-hidden py-8 px-4 sm:px-6 lg:px-8">
      {/* Background ambient gradient glow */}
      <div 
        aria-hidden="true" 
        className="absolute top-1/4 left-1/3 w-[36rem] h-[36rem] bg-[#6D5CFF]/15 blur-[140px] rounded-full pointer-events-none" 
      />
      <div 
        aria-hidden="true" 
        className="absolute bottom-1/4 right-1/4 w-[32rem] h-[32rem] bg-[#2DD4D0]/10 blur-[130px] rounded-full pointer-events-none" 
      />

      <div className="max-w-5xl mx-auto w-full relative z-10 space-y-8">
        
        {/* Header Title Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#2DD4D0] uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Autonomous Engineering Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-sans">
            Career Roadmap <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] via-[#818CF8] to-[#2DD4D0]">Planner</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Design a timeline-grounded placement blueprint tailored to your target company tier, technical readiness, and graduation sprint.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CASE A: ROADMAP DISPLAY (If student already has a roadmap saved)
           ══════════════════════════════════════════════════════════════════ */}
        {savedRecord ? (
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Top Tag Row & Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#10172D]/80 backdrop-blur-xl border border-white/10 shadow-lg">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">Target Profile:</span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#6D5CFF]/20 text-[#8B7BFF] border border-[#6D5CFF]/30">
                  {savedRecord.inputs.targetRole}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#2DD4D0]/15 text-[#2DD4D0] border border-[#2DD4D0]/30">
                  {savedRecord.inputs.companyType}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {savedRecord.inputs.region}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
                  {savedRecord.inputs.timelineMonths} Months ({savedRecord.inputs.gradYear})
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartOver}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#8B7BFF]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start Over</span>
              </button>
            </div>

            {(!user || savedRecord.studentId === 'guest') && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#6D5CFF]/15 to-[#2DD4D0]/15 border border-[#2DD4D0]/30 text-xs text-slate-200 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#2DD4D0] shrink-0" />
                  <span>
                    <strong>Guest Preview:</strong> Sign in to sync this personalized roadmap with your interview telemetry and track milestones.
                  </span>
                </div>
                <Link
                  to="/login?redirect=/planner"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#4A72FF] to-[#6D5CFF] text-white font-semibold text-xs hover:opacity-95 transition-opacity shrink-0 shadow-md"
                >
                  <span>Sign In to Save</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Strategic Summary Box */}
            <div className="p-6 rounded-3xl bg-[#10172D]/90 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {savedRecord.roadmap.title}
                </h2>
                <span className="text-xs font-mono text-[#2DD4D0] bg-[#2DD4D0]/10 border border-[#2DD4D0]/20 px-3 py-1 rounded-full">
                  AI Verified Blueprint
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {savedRecord.roadmap.summary}
              </p>

              {/* Summary Stat Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center space-y-1">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Roadmap Phases</p>
                  <p className="text-2xl font-extrabold text-white">{savedRecord.roadmap.stats.phases}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center space-y-1">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Core Topics</p>
                  <p className="text-2xl font-extrabold text-[#2DD4D0]">{savedRecord.roadmap.stats.topics}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center space-y-1">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Target Problems</p>
                  <p className="text-2xl font-extrabold text-[#8B7BFF]">{savedRecord.roadmap.stats.problems}+</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center space-y-1">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Mock Simulations</p>
                  <p className="text-2xl font-extrabold text-amber-400">{savedRecord.roadmap.stats.interviews}</p>
                </div>
              </div>
            </div>

            {/* Accordion / Timeline Phases */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white uppercase tracking-wider px-1">
                Phase-by-Phase Execution Schedule
              </h3>

              {savedRecord.roadmap.phases.map((phase, idx) => {
                const isOpen = !!expandedPhases[idx];
                return (
                  <div 
                    key={idx}
                    className="rounded-3xl bg-[#10172D]/80 backdrop-blur-xl border border-white/10 overflow-hidden shadow-md transition-colors hover:border-white/20"
                  >
                    <button
                      type="button"
                      onClick={() => togglePhaseAccordion(idx)}
                      className="w-full p-5 sm:p-6 text-left flex items-start sm:items-center justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:bg-white/5"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6D5CFF]/20 to-[#2DD4D0]/20 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 font-mono text-xs font-bold text-[#2DD4D0]">
                          0{idx + 1}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                              {phase.name}
                            </h4>
                            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                              {phase.timing}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-400">
                            {phase.focus}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 p-1 rounded-lg bg-white/5 text-slate-400 mt-1 sm:mt-0">
                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="px-5 sm:px-6 pb-6 pt-2 border-t border-white/5 space-y-4"
                        >
                          {/* Key Milestones Tasks */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                              Key Milestones & Deliverables
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                              {phase.tasks.map((task, tIdx) => (
                                <div key={tIdx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                  <CheckCircle2 className="w-4 h-4 text-[#2DD4D0] shrink-0 mt-0.5" />
                                  <span className="text-xs text-slate-200 leading-relaxed">{task}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Recommended Resources */}
                          {phase.resources && phase.resources.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Recommended InterviewX Modules
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {phase.resources.map((resItem, rIdx) => (
                                  <span key={rIdx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6D5CFF]/10 border border-[#6D5CFF]/20 text-xs font-medium text-[#8B7BFF]">
                                    <BookOpen className="w-3 h-3 text-[#2DD4D0]" />
                                    <span>{resItem}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════
              CASE B: 5-STEP ROADMAP GENERATOR WIZARD
             ══════════════════════════════════════════════════════════════════ */
          <div className="bg-[#10172D]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] space-y-8">
            
            {/* Wizard Step Progress Indicator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-400 font-mono">
                  STEP {currentStep} OF 5
                </span>
                <span className="text-[#2DD4D0] font-mono">
                  {currentStep === 1 && 'Target Engineering Role'}
                  {currentStep === 2 && 'Company Archetype & Tier'}
                  {currentStep === 3 && 'Regional Target Ecosystem'}
                  {currentStep === 4 && 'Timeline & College Year'}
                  {currentStep === 5 && 'Current Skill Self-Assessment'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#6D5CFF] to-[#2DD4D0] rounded-full"
                  animate={{ width: `${(currentStep / 5) * 100}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                {errorMsg.toLowerCase().includes('sign in') && (
                  <Link
                    to="/login?redirect=/planner"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#4A72FF] to-[#6D5CFF] text-white font-semibold text-xs hover:opacity-90 transition-opacity shrink-0"
                  >
                    <span>Sign In / Sign Up</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}

            {/* Step Card Views with Animations */}
            <AnimatePresence mode="wait">
              {/* ─────────────────────────────────────────────────────────────
                  STEP 1: TARGET ROLE
                 ───────────────────────────────────────────────────────────── */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                      What is your target engineering role?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400">
                      We calibrate problem difficulty, algorithmic depth, and architectural expectations to your chosen domain.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {TARGET_ROLES.map(role => {
                      const isSelected = targetRole === role.id;
                      const Icon = role.icon;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setTargetRole(role.id)}
                          className={`p-4 rounded-2xl text-left border transition-all duration-200 cursor-pointer flex items-start gap-3.5 focus-visible:outline-2 focus-visible:outline-[#8B7BFF] ${
                            isSelected
                              ? 'bg-[#182346] border-[#6D5CFF] shadow-[0_0_25px_rgba(109,92,255,0.25)]'
                              : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isSelected ? 'bg-[#6D5CFF]/30 border-[#6D5CFF] text-[#2DD4D0]' : 'bg-white/5 border-white/10 text-slate-400'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{role.title}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#2DD4D0]" />}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{role.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 2: COMPANY TYPE
                 ───────────────────────────────────────────────────────────── */}
              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                      Select your target company archetype
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400">
                      FAANG heavily weights algorithmic proofs; unicorns test system architecture; startups evaluate velocity and 0-to-1 building.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {COMPANY_TYPES.map(comp => {
                      const isSelected = companyType === comp.id;
                      return (
                        <button
                          key={comp.id}
                          type="button"
                          onClick={() => setCompanyType(comp.id)}
                          className={`p-4 rounded-2xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 focus-visible:outline-2 focus-visible:outline-[#8B7BFF] ${
                            isSelected
                              ? 'bg-[#182346] border-[#6D5CFF] shadow-[0_0_25px_rgba(109,92,255,0.25)]'
                              : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#2DD4D0]">
                              {comp.tag}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-[#2DD4D0]" />}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white block">{comp.title}</span>
                            <p className="text-xs text-slate-400 mt-1">{comp.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 3: REGION
                 ───────────────────────────────────────────────────────────── */}
              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                      Where is your target job market?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Hiring bars, on-campus drives, and compensation structures vary substantially by geographical region.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {REGIONS.map(reg => {
                      const isSelected = region === reg.id;
                      return (
                        <button
                          key={reg.id}
                          type="button"
                          onClick={() => setRegion(reg.id)}
                          className={`p-4 rounded-2xl text-left border transition-all duration-200 cursor-pointer flex items-start gap-3.5 focus-visible:outline-2 focus-visible:outline-[#8B7BFF] ${
                            isSelected
                              ? 'bg-[#182346] border-[#6D5CFF] shadow-[0_0_25px_rgba(109,92,255,0.25)]'
                              : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isSelected ? 'bg-[#6D5CFF]/30 border-[#6D5CFF] text-[#2DD4D0]' : 'bg-white/5 border-white/10 text-slate-400'
                          }`}>
                            <Globe2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{reg.title}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#2DD4D0]" />}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{reg.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 4: TIMELINE & YEAR
                 ───────────────────────────────────────────────────────────── */}
              {currentStep === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                      Timeline & Academic Year
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Specify how many months you have until placement drives or full-time graduation rounds begin.
                    </p>
                  </div>

                  {/* College Year Toggle */}
                  <fieldset className="space-y-3">
                    <legend className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Current Academic Status
                    </legend>
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                      <button
                        type="button"
                        onClick={() => setGradYear('3rd year')}
                        className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer font-medium text-sm focus-visible:outline-2 focus-visible:outline-[#8B7BFF] ${
                          gradYear === '3rd year'
                            ? 'bg-[#6D5CFF]/20 border-[#6D5CFF] text-white shadow-[0_0_20px_rgba(109,92,255,0.25)]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        3rd Year (Internship Track)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGradYear('4th year')}
                        className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer font-medium text-sm focus-visible:outline-2 focus-visible:outline-[#8B7BFF] ${
                          gradYear === '4th year'
                            ? 'bg-[#6D5CFF]/20 border-[#6D5CFF] text-white shadow-[0_0_20px_rgba(109,92,255,0.25)]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        4th Year (Full-Time SDE)
                      </button>
                    </div>
                  </fieldset>

                  {/* Timeline Slider */}
                  <div className="space-y-4 pt-2 max-w-xl">
                    <div className="flex items-center justify-between">
                      <label htmlFor="timeline-slider" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Preparation Window:
                      </label>
                      <span className="text-lg font-mono font-bold text-[#2DD4D0] bg-[#2DD4D0]/10 border border-[#2DD4D0]/20 px-3 py-1 rounded-xl">
                        {timelineMonths} {timelineMonths === 1 ? 'Month' : 'Months'}
                      </span>
                    </div>

                    <input
                      id="timeline-slider"
                      type="range"
                      min="1"
                      max="18"
                      value={timelineMonths}
                      onChange={e => setTimelineMonths(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#6D5CFF]"
                    />

                    <div className="flex justify-between text-xs text-slate-500 font-mono">
                      <span>1 Month (Intense Sprint)</span>
                      <span>6 Months (Balanced)</span>
                      <span>18 Months (Mastery)</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 5: SKILLS SELF-ASSESSMENT
                 ───────────────────────────────────────────────────────────── */}
              {currentStep === 5 && (
                <motion.div
                  key="step-5"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                      Current Skills Self-Assessment
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Select topics you have already touched. The AI coach will build accelerated milestones around your known concepts and emphasize your gaps.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {SKILLS_LIST.map(skill => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`px-4 py-2.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-[#8B7BFF] ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#6D5CFF]/30 to-[#2DD4D0]/30 border-[#2DD4D0] text-white shadow-[0_0_15px_rgba(45,212,208,0.2)]'
                              : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#2DD4D0]' : 'bg-slate-600'}`} />
                          <span>{skill}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <span>{selectedSkills.length} skills selected</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSkills(SKILLS_LIST)}
                      className="text-[#8B7BFF] hover:underline cursor-pointer"
                    >
                      Select all
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons (Back & Continue / Submit) */}
            <div className="flex items-center justify-between pt-6 border-t border-white/10">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : <div />}

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#4A72FF] via-[#6D5CFF] to-[#8B7BFF] hover:opacity-95 shadow-[0_0_20px_rgba(109,92,255,0.35)] transition-all cursor-pointer"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={generating}
                  onClick={handleGenerateRoadmap}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#2DD4D0] via-[#6D5CFF] to-[#8B7BFF] hover:opacity-95 shadow-[0_0_25px_rgba(45,212,208,0.4)] disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Synthesizing AI Blueprint...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#2DD4D0]" />
                      <span>Generate Personalized Roadmap</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
