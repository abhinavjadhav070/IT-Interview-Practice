import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Database, 
  Cpu, 
  ArrowLeft, 
  Terminal, 
  Sparkles,
  HelpCircle,
  Zap,
  RefreshCw,
  FileText,
  History,
  BookOpen,
  Code2,
  Check,
  Award
} from 'lucide-react';
import { api } from '@/lib/api';
import type { CodeSubmission } from '@/lib/types';

export default function CompilerStudio() {
  const { slug = 'two-sum' } = useParams();
  const queryClient = useQueryClient();

  const [language, setLanguage] = useState<'javascript' | 'python' | 'cpp' | 'java'>('javascript');
  const [code, setCode] = useState('');
  const [approachText, setApproachText] = useState('');
  const [leftTab, setLeftTab] = useState<'problem' | 'approach' | 'submissions'>('problem');
  const [activeConsoleTab, setActiveConsoleTab] = useState<'tests' | 'custom' | 'aiAudit'>('tests');
  const [customInput, setCustomInput] = useState('');

  const { data: problem, isLoading } = useQuery({
    queryKey: ['codingProblem', slug],
    queryFn: () => api.getCodingProblem(slug)
  });

  const { data: pastSubmissions = [], refetch: refetchSubmissions } = useQuery<CodeSubmission[]>({
    queryKey: ['problemSubmissions', problem?.id || slug],
    queryFn: () => api.getProblemSubmissions(problem?.id || slug),
    enabled: !!problem
  });

  useEffect(() => {
    if (problem && problem.starterCode) {
      setCode(problem.starterCode[language] || problem.starterCode.javascript || '');
    }
  }, [problem, language]);

  const runMutation = useMutation({
    mutationFn: () => api.runCode({
      problemId: problem?.id || slug,
      code,
      language,
      customInput
    })
  });

  const submitMutation = useMutation({
    mutationFn: () => api.submitCode({
      problemId: problem?.id || slug,
      code,
      language,
      approachText
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['codingProblems'] });
      refetchSubmissions();
      setActiveConsoleTab('tests');
    }
  });

  const aiAuditMutation = useMutation({
    mutationFn: () => api.queryAdvisor({
      query: `Analyze this ${language} solution for "${problem?.title}". Provide Big-O time and space complexity audit, detect any edge case vulnerabilities, and suggest optimal algorithmic improvements:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      mode: 'code_audit'
    })
  });

  const handleInsertApproachTemplate = () => {
    const template = `### 1. Intuition & High-Level Strategy
Explain your immediate conceptual insight for solving this problem...

### 2. Algorithmic Steps
- Step 1: Initialize data structure / pointers
- Step 2: Traverse input elements and compute state
- Step 3: Return resulting answer or boundary condition

### 3. Complexity Invariants
- **Time Complexity:** O(n) amortized time
- **Space Complexity:** O(n) auxiliary space

### 4. Edge Cases Handled
- Empty input or single element
- Duplicate keys or negative values
- Boundary limit overflows`;
    setApproachText(template);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-[#0b0f19] text-indigo-400 font-mono text-xs">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        LOADING PROBLEM RUNTIME CONSOLE...
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#0b0f19] text-slate-300 font-mono space-y-4">
        <p>Problem specification not found in repository.</p>
        <Link to="/compiler" className="text-indigo-400 hover:underline text-xs flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Return to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0b0f19] text-slate-200 h-[calc(100vh-60px)] overflow-hidden font-sans">
      {/* Studio Header Bar */}
      <div className="bg-[#0f172a] border-b border-[#1e293b] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/compiler"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm font-heading">{problem.title}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border font-mono ${
              problem.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
              problem.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
              'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              {problem.difficulty}
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="bg-[#0b0f19] border border-[#1e293b] text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="javascript">JavaScript (V8)</option>
            <option value="python">Python 3.11</option>
            <option value="cpp">C++ 20 (GCC)</option>
            <option value="java">Java 17 (OpenJDK)</option>
          </select>

          <button
            onClick={() => problem.starterCode && setCode(problem.starterCode[language] || '')}
            className="p-1.5 rounded-lg bg-[#0b0f19] hover:bg-slate-800 text-slate-400 border border-[#1e293b]"
            title="Reset code boilerplate"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="px-3 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] border border-slate-700 text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {runMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Run Tests</span>
          </button>

          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
          >
            {submitMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Submit Solution</span>
          </button>
        </div>
      </div>

      {/* Split IDE Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Column: Multi-tab Problem Inspector & Approach Manager (5 Cols) */}
        <div className="lg:col-span-5 bg-[#0f172a] border-r border-[#1e293b] flex flex-col overflow-hidden">
          
          {/* Sub-nav tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[#1e293b] bg-[#0b0f19] text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setLeftTab('problem')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                leftTab === 'problem'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Statement</span>
            </button>

            <button
              onClick={() => setLeftTab('approach')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                leftTab === 'approach'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>My Approach {approachText.trim().length > 0 && '✓'}</span>
            </button>

            <button
              onClick={() => setLeftTab('submissions')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                leftTab === 'submissions'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Submissions ({pastSubmissions.length})</span>
            </button>

          </div>

          {/* Left Tab Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs font-sans">
            
            {/* TAB 1: Problem Description */}
            {leftTab === 'problem' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Description</h2>
                  <div className="text-slate-300 whitespace-pre-line leading-relaxed">
                    {problem.description}
                  </div>
                </div>

                {/* Examples */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Example Cases</h3>
                  {problem.examples?.map((ex, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-[#0b0f19] border border-[#1e293b] space-y-1.5 font-mono">
                      <div className="text-slate-400 font-bold">Example {idx + 1}:</div>
                      <div className="text-slate-300"><span className="text-slate-500">Input:</span> {ex.input}</div>
                      <div className="text-slate-300"><span className="text-slate-500">Output:</span> {ex.output}</div>
                      {ex.explanation && (
                        <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-900">
                          <span className="text-slate-500">Explanation:</span> {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <div className="space-y-2 font-mono">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Formal Constraints</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    {problem.constraints?.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Company Tag Badges */}
                <div className="p-3.5 bg-[#0b0f19] rounded-lg border border-[#1e293b] space-y-2">
                  <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Zap className="w-3.5 h-3.5" />
                    <span>COMPANY PLACEMENT LOOP FREQUENCY</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {problem.companyTags?.map(tag => (
                      <span key={tag} className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Complexity Audit Button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setActiveConsoleTab('aiAudit');
                      aiAuditMutation.mutate();
                    }}
                    disabled={aiAuditMutation.isPending}
                    className="w-full py-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Audit Code Complexity & Edge Cases</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: My Approach & Reasoning Upload */}
            {leftTab === 'approach' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-400" />
                      <span>My Solution Approach & Invariants</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Write your reasoning and complexity bounds. This is saved with your submission and verified by the AI Evaluator.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleInsertApproachTemplate}
                    className="px-2.5 py-1 rounded bg-[#1e293b] hover:bg-slate-700 text-teal-300 text-[11px] font-semibold transition-colors"
                  >
                    Load Structured Template
                  </button>
                </div>

                <textarea
                  value={approachText}
                  onChange={(e) => setApproachText(e.target.value)}
                  placeholder="Explain your approach here (Markdown supported):&#10;&#10;1. What data structures did you pick and why?&#10;2. What is the time complexity (e.g. O(n)) and space complexity?&#10;3. What edge cases did you protect against?"
                  rows={12}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />

                <div className="p-3 bg-teal-950/20 border border-teal-500/30 rounded-lg text-[11px] text-teal-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>AI Logic-to-Code Alignment</span>
                  </div>
                  <p className="text-slate-400">
                    When you click "Submit Solution", STRATA cross-checks whether your stated complexity and reasoning match the actual algorithm executed in your code.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: Submissions History */}
            {leftTab === 'submissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span>Candidate Submission History</span>
                  </h2>
                  <span className="text-[11px] text-slate-500 font-mono">{pastSubmissions.length} records</span>
                </div>

                {pastSubmissions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-[#0b0f19] rounded-lg border border-[#1e293b]">
                    No past submissions recorded for this problem yet.
                  </div>
                ) : (
                  <div className="space-y-3 font-mono">
                    {pastSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3.5 rounded-lg bg-[#0b0f19] border border-[#1e293b] space-y-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sub.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {sub.status}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(sub.submittedAt).toLocaleTimeString()} · {new Date(sub.submittedAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span>Lang: <span className="text-white">{sub.language}</span></span>
                          <span>Runtime: <span className="text-emerald-400">{sub.runtime}</span></span>
                          <span>Memory: <span className="text-slate-300">{sub.memory}</span></span>
                        </div>

                        {/* Stored Approach Write-Up */}
                        {sub.approachText && (
                          <div className="mt-2 pt-2 border-t border-[#1e293b] space-y-1 font-sans">
                            <div className="text-[10px] font-bold text-teal-400 flex items-center justify-between">
                              <span>SAVED APPROACH WRITE-UP:</span>
                              {sub.approachReview && (
                                <span className="text-indigo-300 bg-indigo-500/10 px-1.5 rounded border border-indigo-500/20">
                                  {sub.approachReview.alignmentVerdict} ({sub.approachReview.matchScore}%)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-300 whitespace-pre-line bg-[#060911] p-2 rounded border border-slate-900 leading-relaxed font-mono">
                              {sub.approachText}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Code Editor & Execution Console (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col bg-[#0b0f19] overflow-hidden">
          
          {/* Top Half: Monaco Code Editor */}
          <div className="flex-1 relative border-b border-[#1e293b]">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language === 'python' ? 'python' : language === 'java' ? 'java' : 'javascript'}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>

          {/* Bottom Half: Execution Console, AI Audit & Approach Review */}
          <div className="h-64 bg-[#0f172a] flex flex-col">
            {/* Console Tab Header */}
            <div className="bg-[#0b0f19] border-b border-[#1e293b] px-4 py-1.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveConsoleTab('tests')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    activeConsoleTab === 'tests' ? 'bg-[#1e293b] text-indigo-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Test Results
                </button>
                <button
                  onClick={() => setActiveConsoleTab('custom')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    activeConsoleTab === 'custom' ? 'bg-[#1e293b] text-cyan-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom Input
                </button>
                <button
                  onClick={() => setActiveConsoleTab('aiAudit')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    activeConsoleTab === 'aiAudit' ? 'bg-[#1e293b] text-indigo-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  AI Complexity Audit
                </button>
              </div>

              {/* Status Indicator */}
              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>CODE EXECUTION RUNNER</span>
              </div>
            </div>
            <p role="note" className="px-4 pb-2 text-[10px] text-slate-500">
              Your code is sent to the configured Judge0 service for execution. Do not include passwords or secrets.
            </p>

            {/* Console Content */}
            <div className="flex-1 p-4 overflow-y-auto text-xs font-mono space-y-3">
              {activeConsoleTab === 'tests' && (
                <div>
                  {submitMutation.isSuccess && (
                    <div className={`p-3.5 rounded-lg mb-3 space-y-2 ${
                      submitMutation.data.status === 'Accepted'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
                    }`}>
                      <div className="font-bold flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className={`w-4 h-4 ${submitMutation.data.status === 'Accepted' ? 'text-emerald-400' : 'text-amber-300'}`} />
                          <span>{submitMutation.data.status === 'Accepted' ? 'Accepted — Test Suite Passed' : `${submitMutation.data.status} — ${submitMutation.data.passedTestCases}/${submitMutation.data.totalTestCases} cases passed`}</span>
                        </div>
                        <span className={`font-mono font-bold text-xs ${submitMutation.data.status === 'Accepted' ? 'text-emerald-400' : 'text-amber-300'}`}>
                          {submitMutation.data.placementVelocityBonus}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-4 font-mono">
                        <span>Runtime: <span className="text-white">{submitMutation.data.runtime}</span></span>
                        <span>Memory: <span className="text-white">{submitMutation.data.memory}</span></span>
                        <span>Cases: <span className="text-white">{submitMutation.data.passedTestCases}/{submitMutation.data.totalTestCases}</span></span>
                      </div>

                      {/* AI Approach Alignment Feedback Badge */}
                      {submitMutation.data.approachReviewed && submitMutation.data.approachReview && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[11px] text-slate-300 font-sans space-y-1">
                          <div className="font-bold text-teal-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                            <span>Approach Verification ({submitMutation.data.approachReview.matchScore}% Alignment):</span>
                          </div>
                          <p className="text-slate-400">
                            {submitMutation.data.approachReview.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {runMutation.data ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-slate-400 text-[11px] border-b border-slate-800 pb-2">
                        <span className={`font-bold ${runMutation.data.status === 'Accepted' ? 'text-emerald-400' : 'text-amber-300'}`}>
                          Status: {runMutation.data.status}
                        </span>
                        <span>Latency: {runMutation.data.executionTime}</span>
                        <span>Memory: {runMutation.data.memoryAllocated}</span>
                      </div>

                      <div className="space-y-2">
                        {runMutation.data.testResults?.map((res: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded bg-[#0b0f19] border border-[#1e293b] space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-300">Case {res.testCaseNumber}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded border ${
                                res.passed === true
                                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                  : res.passed === false
                                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                                    : 'text-slate-300 bg-slate-500/10 border-slate-500/20'
                              }`}>
                                {res.passed === true ? 'PASSED' : res.passed === false ? 'FAILED' : 'OUTPUT ONLY'}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px]"><span className="text-slate-500">Input:</span> {res.input}</div>
                            <div className="text-slate-300 text-[11px]"><span className="text-slate-500">Output:</span> {res.actualOutput}</div>
                          </div>
                        ))}
                        {runMutation.data.stderr && (
                          <p role="status" className="text-amber-300 text-xs">{runMutation.data.stderr}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-center py-6">
                      Run your code against the sample case or provide custom input. Use "Submit Solution" for the full evaluation.
                    </div>
                  )}
                </div>
              )}

              {activeConsoleTab === 'custom' && (
                <div className="space-y-2">
                  <label htmlFor="custom-test-input" className="text-slate-400 text-[11px]">Custom Test Input (JSON format):</label>
                  <textarea
                    id="custom-test-input"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder='{"nums": [2, 7, 11, 15], "target": 9}'
                    className="w-full h-28 bg-[#0b0f19] border border-[#1e293b] rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}

              {activeConsoleTab === 'aiAudit' && (
                <div>
                  {aiAuditMutation.isPending ? (
                    <div className="flex items-center gap-2 text-indigo-400 py-6">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Auditing time complexity invariants and edge case vulnerabilities...</span>
                    </div>
                  ) : aiAuditMutation.data ? (
                    <div className="whitespace-pre-line leading-relaxed text-slate-300 text-xs font-mono">
                      {aiAuditMutation.data.content}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-center py-6">
                      Click "Audit Code Complexity" to generate Big-O analysis and edge case alerts.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
