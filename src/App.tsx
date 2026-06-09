import { useState, useEffect } from "react";
import { 
  ShieldAlert, Activity, Wifi, ShieldCheck, Database, Terminal, Cpu, Users, Layers, Key
} from "lucide-react";

import { UserRole, UserSession, LogEntry, AgentState, DatabaseRecord, HealthStatus } from "./types";
import ConsoleTerminal from "./components/ConsoleTerminal";
import AgentStatusGrid from "./components/AgentStatusGrid";
import ApiSandbox from "./components/ApiSandbox";
import AuthSwitcher from "./components/AuthSwitcher";
import TaskSubmitter from "./components/TaskSubmitter";
import TransactionHistory from "./components/TransactionHistory";

const AGENTS_LIST_STATIC: AgentState[] = [
  { id: "agent-1", name: "Orchestrator Core", role: "Workflow Planner", status: "idle", model: "gemini-3.5-flash", lastAction: "Waiting for task request" },
  { id: "agent-2", name: "Aegis Audit", role: "Security Vulnerability Inspection", status: "idle", model: "gemini-3.5-flash", lastAction: "Monitoring inputs" },
  { id: "agent-3", name: "Apex Tuning", role: "Performance Cache Optimizer", status: "idle", model: "gemini-3.5-flash", lastAction: "Scanning Redis hit distribution" },
  { id: "agent-4", name: "Hermes Executor", role: "Continuous Assembly & Execution", status: "idle", model: "gemini-3.5-flash", lastAction: "Idle pipeline trigger" }
];

export default function App() {
  // 1. Core State Hooks
  const [session, setSession] = useState<UserSession>({ username: "anonymous", role: UserRole.GUEST, accessToken: "" });
  const [records, setRecords] = useState<DatabaseRecord[]>([]);
  const [logsList, setLogsList] = useState<LogEntry[]>([]);
  const [agentsPool, setAgentsPool] = useState<AgentState[]>(AGENTS_LIST_STATIC);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0, ratio: 0, activeKeys: 0 });
  const [activeTab, setActiveTab] = useState<"workspace" | "database" | "sandbox">("workspace");

  // Load initialized system indicators on boot
  useEffect(() => {
    fetchSystemTelemetry();
    // Default system boot logins guest
    handleLogin("root-guest", UserRole.GUEST);

    // Dynamic telemetry log updates (polled every 6 seconds)
    const loggerTimer = setInterval(() => {
      fetchLogs();
      fetchHealth();
    }, 6000);

    return () => clearInterval(loggerTimer);
  }, []);

  const fetchSystemTelemetry = async () => {
    await Promise.all([
      fetchHealth(),
      fetchRecords(),
      fetchLogs(),
      fetchCacheStats()
    ]);
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const body = await res.json();
        setHealth(body);
      }
    } catch (e) {
      console.error("Health query failure", e);
    }
  };

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/db/records");
      if (res.ok) {
        const body = await res.json();
        setRecords(body);
      }
    } catch (e) {
      console.error("Records query failure", e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const body = await res.json();
        setLogsList(body);
      }
    } catch (e) {
      console.error("Logs query failure", e);
    }
  };

  const fetchCacheStats = async () => {
    try {
      const res = await fetch("/api/cache/status");
      if (res.ok) {
        const body = await res.json();
        setCacheStats(body);
      }
    } catch (e) {
      console.error("Cache query failure", e);
    }
  };

  const handleLogin = async (username: string, targetRole: UserRole) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, role: targetRole })
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        fetchLogs(); // Capture new login audit traces
      }
    } catch (e) {
      console.error("Login verification connection error", e);
    }
  };

  const handleExecuteWorkflow = async (promptText: string) => {
    // Stagger Agent Statuses (Simulate rapid pipeline engagement visually)
    const activeAgentsState = agentsPool.map(a => ({ ...a, status: "active" as const, lastAction: "Processing orchestration request..." }));
    setAgentsPool(activeAgentsState);

    try {
      const res = await fetch("/api/agents/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": session.accessToken
        },
        body: JSON.stringify({ prompt: promptText })
      });

      const data = await res.json();
      
      // Update data components dynamically
      fetchRecords();
      fetchLogs();
      fetchCacheStats();
      fetchHealth();

      return data;
    } catch (error: any) {
      return { error: "Pipeline failure", message: error.message };
    } finally {
      // Return agents to monitoring states
      const normalAgentsState = agentsPool.map(a => ({ ...a, status: "idle" as const, lastAction: "Analysis complete. Standing by." }));
      setAgentsPool(normalAgentsState);
    }
  };

  // Stats Counters
  const validatedWorkflowsNum = records.filter(r => r.securityVerified).length;
  const isGeminiOffline = health?.services?.gemini_api?.toLowerCase().includes("offline") ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] select-none text-slate-100 antialiased font-sans">
      
      {/* 1. ENTERPRISE HEADER BAR */}
      <header className="border-b border-slate-800 bg-[#0e131d]/90 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg shadow-[0_0_15px_rgba(45,212,191,0.05)]">
            <Activity className="w-5 h-5 text-teal-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-md font-bold tracking-tight font-mono text-slate-100 uppercase sm:text-base">AegisOps AI</h1>
              <span className="text-[10px] bg-slate-800 text-teal-400 px-2 py-0.2 rounded border border-slate-700/50 font-mono tracking-widest font-bold">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans tracking-wide">Multi-Agent Orchestrator • ISO-27001 Compliance Center</p>
          </div>
        </div>

        {/* Global Connection / User Session Indicator */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] font-mono text-slate-400">CREDENTIAL PROFILE:</span>
            <span className="text-xs font-bold text-teal-400 font-mono uppercase tracking-wide">
              {session.role === UserRole.GUEST ? "UNAUTHENTICATED GUEST" : `${session.role} tier`}
            </span>
          </div>

          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-md flex items-center justify-center gap-1.5 font-mono text-xs text-slate-400">
            <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">NODE: ONLINE</span>
          </div>
        </div>
      </header>

      {/* 2. SUMMARY METRICS RIBBON */}
      <section className="bg-[#0f1521] border-b border-slate-800/60 px-6 py-4">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-[#0c1017] border border-slate-800/85 p-3.5 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Active Worker Nodes</span>
              <span className="text-lg font-bold font-mono text-teal-400 mt-1 block">4 / 4 Online</span>
            </div>
            <div className="p-2 bg-teal-500/5 rounded-md"><Cpu className="w-4 h-4 text-teal-400" /></div>
          </div>

          <div className="bg-[#0c1017] border border-slate-800/85 p-3.5 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Security Verified</span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">{validatedWorkflowsNum} Verified</span>
            </div>
            <div className="p-2 bg-emerald-500/5 rounded-md"><ShieldCheck className="w-4 h-4 text-emerald-400" /></div>
          </div>

          <div className="bg-[#0c1017] border border-slate-800/85 p-3.5 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Cache Hits (Redis)</span>
              <span className="text-lg font-bold font-mono text-blue-400 mt-1 block">{cacheStats.ratio}% Ratio</span>
            </div>
            <div className="p-2 bg-blue-500/5 rounded-md"><Layers className="w-4 h-4 text-blue-400" /></div>
          </div>

          <div className="bg-[#0c1017] border border-slate-800/85 p-3.5 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Rate Limit Window</span>
              <span className="text-lg font-bold font-mono text-amber-500 mt-1 block">
                {health?.metrics?.rate_limit_remaining ?? 100} / 100 Rem
              </span>
            </div>
            <div className="p-2 bg-amber-500/5 rounded-md"><Key className="w-4 h-4 text-amber-500" /></div>
          </div>

        </div>
      </section>

      {/* 3. WORKSPACE CORE VIEWPORTS */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6 space-y-6 overflow-hidden">
        
        {/* Navigation Selector Tabs */}
        <div className="flex border-b border-slate-800 pb-px gap-1 flex-wrap">
          <button
            onClick={() => setActiveTab("workspace")}
            className={`px-5 py-2.5 -mb-px font-mono text-xs font-bold uppercase border-t-2 select-none cursor-pointer transition ${
              activeTab === "workspace"
                ? "bg-[#0f141c] border-teal-400 text-teal-400 border-l border-r border-slate-800 rounded-t-lg"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🕹️ Workspace Controls
          </button>
          
          <button
            onClick={() => setActiveTab("database")}
            className={`px-5 py-2.5 -mb-px font-mono text-xs font-bold uppercase border-t-2 select-none cursor-pointer transition ${
              activeTab === "database"
                ? "bg-[#0f141c] border-teal-400 text-teal-400 border-l border-r border-slate-800 rounded-t-lg"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🗄️ Relational Database
          </button>

          <button
            onClick={() => setActiveTab("sandbox")}
            className={`px-5 py-2.5 -mb-px font-mono text-xs font-bold uppercase border-t-2 select-none cursor-pointer transition ${
              activeTab === "sandbox"
                ? "bg-[#0f141c] border-teal-400 text-teal-400 border-l border-r border-slate-800 rounded-t-lg"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            📡 OpenAPI REST Sandbox
          </button>
        </div>

        {/* Dynamic Panels */}
        <div className="space-y-6">
          {activeTab === "workspace" ? (
            <>
              {/* Agent Status Display */}
              <AgentStatusGrid agents={agentsPool} />

              {/* Task Generator & Pipeline Status */}
              <TaskSubmitter 
                onExecute={handleExecuteWorkflow} 
                records={records} 
                isGeminiOffline={isGeminiOffline}
              />
            </>
          ) : activeTab === "database" ? (
            <TransactionHistory records={records} />
          ) : (
            <ApiSandbox 
              accessToken={session.accessToken}
              onRefreshLogs={fetchLogs}
              onRefreshRecords={fetchRecords}
            />
          )}

          {/* Core Command Terminal */}
          <ConsoleTerminal logs={logsList} onRefresh={fetchLogs} cacheStats={cacheStats} />
          
          {/* Authenticators Card */}
          <AuthSwitcher currentSession={session} onLogin={handleLogin} />
        </div>

      </main>

      {/* 4. FOOTER & COMPLIANCE DATA */}
      <footer className="border-t border-slate-800/80 bg-[#0c1017] px-6 py-4 mt-auto">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-mono">
          <span>AegisOps Orchestration Platform • Standard NIST-Compliant Enclaves</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-400">Terms of Use</span>
            <span>•</span>
            <span className="hover:text-slate-400">Security Disclosures</span>
            <span>•</span>
            <span className="hover:text-slate-400">ISO-27001 Certification</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
