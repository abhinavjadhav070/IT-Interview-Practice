import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Award, 
  RefreshCw, 
  Terminal, 
  Activity, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '@/lib/api';

export default function VoiceSimulator() {
  const queryClient = useQueryClient();

  const [selectedTrack, setSelectedTrack] = useState('Technical');
  const [selectedPersona, setSelectedPersona] = useState('Staff SDE & Bar Raiser');
  const [session, setSession] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [interimSpeech, setInterimSpeech] = useState('');
  const [evaluationHistory, setEvaluationHistory] = useState<any[]>([]);
  const [finalReport, setFinalReport] = useState<any>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API for real-time STT
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';

      recog.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          setAnswerText(prev => prev ? `${prev.trim()} ${final.trim()}` : final.trim());
          setInterimSpeech('');
        } else {
          setInterimSpeech(interim);
        }
      };

      recog.onend = () => {
        setIsRecording(false);
        setInterimSpeech('');
      };

      recog.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
        setIsRecording(false);
        setInterimSpeech('');
      };

      recognitionRef.current = recog;
    }
  }, []);

  // Text-To-Speech Synthesizer
  const speakText = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeakingTTS(true);
    utterance.onend = () => setIsSpeakingTTS(false);
    utterance.onerror = () => setIsSpeakingTTS(false);
    window.speechSynthesis.speak(utterance);
  };

  const startMutation = useMutation({
    mutationFn: () => api.startSimulation({ track: selectedTrack, persona: selectedPersona }),
    onSuccess: (data) => {
      setSession(data);
      setEvaluationHistory([]);
      setFinalReport(null);
      setAnswerText('');
      setInterimSpeech('');
      speakText(data.prompt);
    }
  });

  const respondMutation = useMutation({
    mutationFn: (answerSubmission: string) => api.respondToSimulation({
      sessionId: session?.sessionId || session?.interviewId,
      responseText: answerSubmission
    }),
    onSuccess: (data) => {
      if (data.evaluation) {
        setEvaluationHistory(prev => [...prev, data.evaluation]);
      }

      if (data.isCompleted) {
        setFinalReport(data.finalReport);
        setSession(null);
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } else {
        const nextPrompt = data.followUp || data.nextQuestion;
        setSession((prev: any) => ({
          ...prev,
          prompt: nextPrompt,
          currentQuestionIndex: data.currentQuestionIndex
        }));
        speakText(nextPrompt);
      }
      setAnswerText('');
      setInterimSpeech('');
    }
  });

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Web Speech API is not supported in this browser. Please type your response in the console.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimSpeech('');
    } else {
      setInterimSpeech('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSubmitAnswer = () => {
    const answer = answerText.trim();
    if (!answer) return;
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimSpeech('');
    }
    respondMutation.mutate(answer);
  };

  return (
    <section className="relative flex-1 overflow-hidden bg-[#0B1020] px-4 pb-32 pt-6 text-slate-100 sm:px-6 sm:pt-8 lg:px-8" aria-labelledby="simulator-title">
      <div aria-hidden="true" className="pointer-events-none absolute -left-48 -top-40 h-[30rem] w-[30rem] rounded-full bg-violet-600/10 blur-[110px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-32 h-[28rem] w-[28rem] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Simulation Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-200">
            <Mic aria-hidden="true" className="h-3.5 w-3.5 text-cyan-300" />
            <span>Voice-first interview practice</span>
          </div>
          <h1 id="simulator-title" className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Real-Time Interview Simulator
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Practice speaking through technical and behavioral questions, then get clear feedback on each answer.
          </p>
        </div>

        {/* Voice Toggle */}
        <div className="inline-flex self-start items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 md:self-auto">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            aria-pressed={voiceEnabled}
            className="flex min-h-9 items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            {voiceEnabled ? <Volume2 aria-hidden="true" className="h-4 w-4 text-cyan-300" /> : <VolumeX aria-hidden="true" className="h-4 w-4 text-slate-500" />}
            <span>Voice {voiceEnabled ? 'on' : 'off'}</span>
          </button>
        </div>
      </header>

      {!session && !finalReport && (
        /* Configuration & Setup */
        <div className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#151C35] via-[#10172D] to-[#101D30] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)] sm:p-7">
          <div className="border-b border-white/10 pb-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Set up your practice</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">Choose a track and interviewer</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">Pick the kind of interview you want to rehearse. You can change this before each session.</p>
          </div>

          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-slate-300">Interview track</legend>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {['Technical', 'DSA', 'DBMS', 'HR'].map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTrack(t)}
                    aria-pressed={selectedTrack === t}
                    className={`min-h-12 rounded-xl border px-3 py-3 text-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                      selectedTrack === t
                        ? 'border-violet-300/30 bg-violet-400/[0.12] text-violet-100'
                        : 'border-white/10 bg-[#0B1020]/55 text-slate-400 hover:border-violet-300/25 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="interviewer-persona" className="mb-2 block text-sm font-medium text-slate-300">Interviewer persona</label>
              <select
                id="interviewer-persona"
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-white/10 bg-[#0B1020]/70 px-3 py-2.5 text-sm text-slate-200 focus:border-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
              >
                <option value="Staff SDE & Bar Raiser">Staff SDE & Bar Raiser (Rigorous & Trade-off Focused)</option>
                <option value="Engineering Manager">Engineering Manager (System Scalability & Team Dynamics)</option>
                <option value="Senior Frontend Architect">Senior Frontend Architect (Web Standards & Performance)</option>
                <option value="Talent & Behavioral Lead">Talent & Behavioral Lead (STAR Framework & Culture)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-[#080e1d] shadow-lg shadow-violet-950/20 transition-[filter,transform] hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60"
          >
            {startMutation.isPending ? <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Play aria-hidden="true" className="h-4 w-4" />}
            <span>{startMutation.isPending ? 'Preparing your interview…' : 'Start practice session'}</span>
          </button>
          {startMutation.isError && <p role="alert" className="text-sm text-rose-200">We couldn’t start the interview. Please try again.</p>}
        </div>
      )}

      {/* Active Voice Simulation Booth */}
      {session && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Booth Visualizer & Interviewer Stage */}
          <div className="space-y-6 rounded-3xl border border-violet-300/20 bg-gradient-to-br from-[#151C35] via-[#10172D] to-[#101D30] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)] sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300"></span>
                <span className="font-semibold text-cyan-200">Live interview</span>
              </div>
              <span className="text-slate-400">Persona: <span className="text-white font-bold">{selectedPersona}</span></span>
            </div>

            {/* Audio Waveform HUD Visualizer */}
            <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-white/10 bg-[#0B1020]/70 p-6">
              <div className="flex items-center gap-1.5 h-12">
                {[4, 12, 28, 16, 32, 20, 8, 24, 36, 18, 10, 26, 14, 6].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all ${
                      isSpeakingTTS ? 'bg-cyan-300 animate-pulse' : isRecording ? 'bg-violet-300 wave-bar-active' : 'bg-slate-700'
                    }`}
                    style={{ height: isSpeakingTTS || isRecording ? `${h}px` : '6px' }}
                  ></div>
                ))}
              </div>

              <div aria-live="polite" className="text-sm font-medium text-slate-300">
                {isSpeakingTTS ? 'Interviewer is speaking' : isRecording ? 'Listening to your answer…' : 'Ready when you are'}
              </div>
            </div>

            {/* Interviewer Prompt */}
            <div className="space-y-2 rounded-2xl border border-violet-300/20 bg-[#0B1020]/70 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-200">
                <Terminal className="w-3.5 h-3.5" />
                <span>INTERVIEWER PROMPT:</span>
              </div>
              <p className="text-base font-medium leading-relaxed text-white">
                "{session.prompt}"
              </p>
            </div>

            {/* Candidate Response Workspace */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <label htmlFor="simulator-response" className="font-medium text-slate-300">Your answer</label>
                <span className="text-xs text-slate-500">Use your microphone or type below</span>
              </div>

              <textarea
                id="simulator-response"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Spoken words will automatically transcribe here. Alternatively, type your technical answer..."
                className="min-h-36 w-full resize-y rounded-2xl border border-white/10 bg-[#0B1020]/70 p-4 text-sm leading-6 text-slate-200 placeholder:text-slate-500 focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/15"
              />

              {interimSpeech && (
                <div className="flex items-center gap-2 text-xs text-cyan-300/90 bg-cyan-950/30 border border-cyan-800/30 rounded-lg px-3 py-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Listening: <span className="italic text-white/90">{interimSpeech}</span></span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={toggleRecording}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                    isRecording
                      ? 'animate-pulse border-rose-300/40 bg-rose-500/15 text-rose-100'
                      : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-violet-300/30 hover:bg-violet-300/[0.08]'
                  }`}
                >
                  {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isRecording ? 'Stop recording' : 'Start speaking'}</span>
                </button>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={respondMutation.isPending || !answerText.trim()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#080e1d] transition-[filter,transform] hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-50"
                >
                  {respondMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{respondMutation.isPending ? 'Reviewing your answer…' : 'Submit answer'}</span>
                </button>
              </div>
            </div>

            {/* Live Evaluation Feedback from Previous Question */}
            {evaluationHistory.length > 0 && (
              <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-200">
                    <Award className="w-4 h-4" />
                    <span>LATEST EVALUATION BREAKDOWN:</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                    evaluationHistory[evaluationHistory.length - 1].overallScore >= 80 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                      : evaluationHistory[evaluationHistory.length - 1].overallScore >= 60 
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}>
                    SCORE: {evaluationHistory[evaluationHistory.length - 1].overallScore} / 100
                  </span>
                </div>

                {/* Dimension Scores Bar Grid */}
                {evaluationHistory[evaluationHistory.length - 1].dimensions && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-white/10 bg-[#0B1020]/70 p-3">
                      <div className="text-slate-500 text-[10px]">CORRECTNESS</div>
                      <div className="font-bold text-white mt-0.5">{evaluationHistory[evaluationHistory.length - 1].dimensions.correctness}%</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0B1020]/70 p-3">
                      <div className="text-slate-500 text-[10px]">COMPLETENESS</div>
                      <div className="font-bold text-cyan-400 mt-0.5">{evaluationHistory[evaluationHistory.length - 1].dimensions.completeness}%</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0B1020]/70 p-3">
                      <div className="text-slate-500 text-[10px]">CLARITY</div>
                      <div className="font-bold text-amber-400 mt-0.5">{evaluationHistory[evaluationHistory.length - 1].dimensions.clarity}%</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0B1020]/70 p-3">
                      <div className="text-slate-500 text-[10px]">EDGE CASES</div>
                      <div className="font-bold text-emerald-400 mt-0.5">{evaluationHistory[evaluationHistory.length - 1].dimensions.edgeCaseDepth}%</div>
                    </div>
                  </div>
                )}

                {/* Specific Feedback Bullets */}
                <div className="space-y-1.5 rounded-xl border border-white/10 bg-[#0B1020]/70 p-4 text-sm leading-6 text-slate-300">
                  {evaluationHistory[evaluationHistory.length - 1].feedbackLines?.map((line: string, i: number) => (
                    <div key={i} className="leading-relaxed">{line}</div>
                  ))}
                </div>

                {/* Model Answer Toggle */}
                {evaluationHistory[evaluationHistory.length - 1].modelAnswer && (
                  <details className="rounded-xl border border-violet-300/20 bg-[#0B1020]/70 p-4 text-sm">
                    <summary className="cursor-pointer font-medium text-violet-200 hover:text-white">
                      📖 View Model / Gold-Standard Answer
                    </summary>
                    <div className="mt-3 whitespace-pre-line border-t border-white/10 pt-3 leading-relaxed text-slate-300">
                      {evaluationHistory[evaluationHistory.length - 1].modelAnswer}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post-Interview Comprehensive Report */}
      {finalReport && (
        <div className="mx-auto w-full max-w-4xl space-y-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#151C35] via-[#10172D] to-[#101D30] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Your interview report</div>
              <h2 className="mt-1 text-xl font-semibold text-white">Simulation debrief</h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-violet-200">{finalReport.overallScore}<span className="text-sm text-slate-400"> / 100</span></div>
              <div className="text-sm font-medium text-slate-400">{finalReport.verdict}</div>
            </div>
          </div>

          {/* Metric Dials */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1 rounded-xl border border-white/10 bg-[#0B1020]/70 p-4">
              <div className="text-slate-500 text-[10px]">TECHNICAL PRECISION</div>
              <div className="text-lg font-bold text-white">{finalReport.metrics?.technicalKnowledge}%</div>
            </div>
            <div className="space-y-1 rounded-xl border border-white/10 bg-[#0B1020]/70 p-4">
              <div className="text-slate-500 text-[10px]">STRUCTURAL CLARITY</div>
              <div className="text-lg font-bold text-cyan-400">{finalReport.metrics?.conceptClarity}%</div>
            </div>
            <div className="space-y-1 rounded-xl border border-white/10 bg-[#0B1020]/70 p-4">
              <div className="text-slate-500 text-[10px]">PROBLEM SOLVING</div>
              <div className="text-lg font-bold text-amber-400">{finalReport.metrics?.problemSolving}%</div>
            </div>
            <div className="space-y-1 rounded-xl border border-white/10 bg-[#0B1020]/70 p-4">
              <div className="text-slate-500 text-[10px]">STAR ADHERENCE</div>
              <div className="text-lg font-bold text-emerald-400">{finalReport.metrics?.answerCompleteness}%</div>
            </div>
          </div>

          {/* Feedback Points */}
          <div className="space-y-4 text-sm">
            <div className="space-y-2 rounded-2xl border border-violet-300/20 bg-[#0B1020]/70 p-4">
              <div className="font-semibold text-violet-200">Observed strengths</div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {finalReport.strongAreas?.map((s: string, idx: number) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 rounded-2xl border border-cyan-300/15 bg-[#0B1020]/70 p-4">
              <div className="font-semibold text-cyan-200">Areas to practice next</div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {finalReport.areasToPractice?.map((a: string, idx: number) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => { setFinalReport(null); setSession(null); }}
              className="min-h-11 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#080e1d] transition-[filter,transform] hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Start New Simulation Session
            </button>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
