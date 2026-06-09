import { useState } from "react";
import { Play, Sparkles, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Key, ShieldAlert } from "lucide-react";
import { DatabaseRecord } from "../types";

interface TaskSubmitterProps {
  onExecute: (prompt: string) => Promise<any>;
  records: DatabaseRecord[];
  isGeminiOffline: boolean;
}

const TEMPLATES = [
  "Build and deploy a secure user service with rate-limiting & Redis caching.",
  "Optimize slow postgres queries with automated compound indexes.",
  "Create an ISO-27001 compliant file upload router for encrypted images."
];

export default function TaskSubmitter({ onExecute, records, isGeminiOffline }: TaskSubmitterProps) {
  const [prompt, setPrompt] = useState("");
  const [executing, setExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeRecord, setActiveRecord] = useState<DatabaseRecord | null>(null);

  const handleSubmit = async (pText: string) => {
    const activePrompt = pText || prompt;
    if (!activePrompt.trim()) return;

    setExecuting(true);
    setErrorMsg("");
    setActiveRecord(null);

    try {
      const data = await onExecute(activePrompt);
      if (data.error) {
        setErrorMsg(data.message || data.error);
      } else {
        setActiveRecord(data.record);
        setPrompt(""); // Clear input on success
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Interrupted pipeline execution.");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Prompt block */}
      <div className="lg:col-span-5 flex flex-col justify-between bg-[#0f141c] border border-slate-800 rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-teal-400 w-5 h-5 animate-pulse" />
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-350">
              Agent Workflow Pipeline Dispatched
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Submit a complex design, coding, or deployment instruction. AegisOps automatically leverages Gemini models across sequential orchestrators:
          </p>

          <div className="space-y-2 mt-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase block">Quick-Launch Blueprints:</label>
            <div className="flex flex-col gap-1.5">
              {TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(tmpl)}
                  className="text-left p-2.5 rounded border border-slate-800/80 bg-slate-900/35 hover:bg-slate-900/80 text-[10.5px] text-teal-350/95 font-sans transition duration-250 cursor-pointer text-ellipsis overflow-hidden line-clamp-1"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase block">Custom Task Definition Prompt:</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Build an auto-scaling Node microservice with PostgreSQL connection pools..."
              className="w-full h-[100px] bg-slate-950 border border-slate-800 p-2.5 rounded font-mono text-[11.5px] text-slate-300 focus:outline bg-[#07090e] focus:outline-teal-500/20 resize-none placeholder:text-slate-650"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-850 flex flex-col gap-2.5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/20 rounded flex items-start gap-2 text-rose-300 text-xs font-sans leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Execution Failure</span>
                {errorMsg}
                {errorMsg.includes("Secrets") && (
                  <span className="block mt-1 font-semibold text-teal-400">
                    Switching roles or configuring GEMINI_API_KEY solves this.
                  </span>
                )}
              </div>
            </div>
          )}

          {isGeminiOffline && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/15 rounded flex items-start gap-2 text-amber-350 text-[11px] font-sans leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">API Key Not Located</span>
                Core SDK is operating in simulated offline mode. To activate real live Gemini reasoning, configure your credential inside Settings &gt; Secrets first.
              </div>
            </div>
          )}

          <button
            onClick={() => handleSubmit("")}
            disabled={executing || !prompt.trim()}
            className="w-full bg-teal-400 hover:bg-teal-350 text-slate-950 hover:scale-[1.01] active:scale-[0.98] transition cursor-pointer disabled:bg-slate-800 disabled:text-slate-500 font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(45,212,191,0.1)]"
          >
            {executing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Executing Pipeline...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Dispatch Multi-Agent Cluster
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output / Status Tracker block */}
      <div className="lg:col-span-7 bg-[#0f141c] border border-slate-800 rounded-lg p-6 flex flex-col justify-between overflow-hidden min-h-[460px]">
        {activeRecord ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Steps & Milestones */}
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-500 block">ACTIVE TRANSACTION</span>
                <h3 className="text-xs font-bold font-mono text-teal-400 mt-0.5">{activeRecord.id}</h3>
              </div>
              <div className="flex gap-2">
                {activeRecord.securityVerified && (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> SecPass
                  </span>
                )}
                {activeRecord.optimized && (
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    Optimizer OK
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col sm:flex-row gap-5 overflow-hidden">
              {/* Vertical timeline */}
              <div className="sm:w-5/12 flex flex-col gap-2 bg-slate-900/30 border border-slate-850 rounded-lg p-3 overflow-y-auto">
                <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-wider border-b border-slate-850 pb-1 mb-2">Milestone States</span>
                {activeRecord.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-2 items-start text-[10.5px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300 font-mono italic">{step}</span>
                  </div>
                ))}
              </div>

              {/* Markdown compiled view */}
              <div className="sm:w-7/12 flex flex-col overflow-hidden">
                <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-wider mb-2">Compiled Agent Manifest</span>
                <div className="flex-1 bg-slate-950/65 border border-slate-850 rounded-lg p-3.5 overflow-y-auto text-[11px] prose prose-invert max-w-full font-mono text-slate-300 leading-relaxed select-text select-all">
                  {/* Super simple custom marked-like formatting for key MD tokens */}
                  {activeRecord.output?.split("\n").map((line, lIdx) => {
                    if (line.startsWith("###")) {
                      return <h4 key={lIdx} className="text-teal-400 font-sans font-bold text-xs mt-3 mb-1.5 border-b border-slate-800 pb-0.5">{line.replace("###", "").trim()}</h4>;
                    }
                    if (line.startsWith("####")) {
                      return <h5 key={lIdx} className="text-slate-200 font-bold text-[11px] mt-2 mb-1">{line.replace("####", "").trim()}</h5>;
                    }
                    if (line.startsWith("- ")) {
                      return <div key={lIdx} className="text-slate-400 ml-2 py-0.5 truncate flex items-center gap-1.5">▪ {line.replace("- ", "").trim()}</div>;
                    }
                    if (line.startsWith("`") || line.startsWith("  - `")) {
                      return <pre key={lIdx} className="p-1 bg-slate-900 border border-slate-800/60 rounded text-[10.5px] text-teal-350 my-1 overflow-x-auto truncate">{line.replace(/`/g, "").trim()}</pre>;
                    }
                    return <p key={lIdx} className="py-0.5 text-slate-350">{line}</p>;
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-full mb-3 shadow-[0_0_15px_rgba(45,212,191,0.03)]">
              <Sparkles className="w-8 h-8 text-slate-600" />
            </div>
            <h4 className="text-xs font-mono font-bold text-slate-450 uppercase tracking-widest uppercase">Pipeline Waiting State</h4>
            <p className="text-[11px] text-slate-600 max-w-xs mt-2 leading-relaxed">
              Define a deployment instruction prompt and dispatch the automated clusters network to compose the pipeline results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
