import { useState, useRef, useEffect } from "react";
import { Terminal, Shield, AlertTriangle, Info, Clock, RefreshCw, Layers } from "lucide-react";
import { LogEntry } from "../types";

interface ConsoleTerminalProps {
  logs: LogEntry[];
  onRefresh: () => void;
  cacheStats: { hits: number; misses: number; ratio: number; activeKeys: number };
}

export default function ConsoleTerminal({ logs, onRefresh, cacheStats }: ConsoleTerminalProps) {
  const [filter, setFilter] = useState<"ALL" | "INFO" | "AUDIT" | "WARN" | "ERROR">("ALL");
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter(log => filter === "ALL" || log.level === filter);

  useEffect(() => {
    if (isAutoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs, isAutoScroll]);

  return (
    <div className="bg-[#0f141c] border border-slate-800 rounded-lg overflow-hidden flex flex-col h-[400px]">
      {/* Ticker Stats / Metrics Pane */}
      <div className="bg-[#131b26] border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="text-teal-400 w-4 h-4 animate-pulse" />
          <span className="text-slate-300 font-bold">SYSTEM TELEMETRY LOGS</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
            Node Gate: <span className="text-teal-400 font-medium">3000/TCP</span>
          </span>
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Sim Caching: <span className="text-blue-400 font-medium">{cacheStats.activeKeys} Keys</span>
          </span>
          <span className="text-slate-400">
            Sim Hits: <span className="text-emerald-400">{cacheStats.hits}</span> / Ratio: <span className="text-emerald-400">{cacheStats.ratio}%</span>
          </span>
        </div>
      </div>

      {/* Filter and Control Headers */}
      <div className="bg-[#111721] px-4 py-2 flex items-center justify-between border-b border-slate-850">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["ALL", "INFO", "AUDIT", "WARN", "ERROR"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition ${
                filter === lvl
                  ? "bg-slate-800 text-teal-400 border-teal-500/20"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            className={`text-[11px] font-mono px-2 py-0.5 rounded transition ${
              isAutoScroll ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" : "text-slate-500 hover:text-slate-400"
            }`}
          >
            {isAutoScroll ? "Auto:ON" : "Auto:off"}
          </button>
          <button
            onClick={onRefresh}
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition"
            title="Refresh logs from node worker"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Log Feed */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px] space-y-2 relative">
        <div className="terminal-scanline absolute inset-0 pointer-events-none" />
        
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 text-center py-10">
            {"-- NO TELEMETRY FEED PARSED UNDER FILTER CONTEXT --"}
          </div>
        ) : (
          filteredLogs.map((log) => {
            let badgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
            let Icon = Info;
            let textColor = "text-slate-300";

            if (log.level === "AUDIT") {
              badgeColor = "bg-teal-500/10 text-teal-400 border-teal-500/20";
              Icon = Shield;
              textColor = "text-teal-100/90";
            } else if (log.level === "WARN") {
              badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
              Icon = AlertTriangle;
              textColor = "text-amber-100/80";
            } else if (log.level === "ERROR") {
              badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
              Icon = AlertTriangle;
              textColor = "text-rose-200";
            }

            return (
              <div key={log.id} className="flex items-start gap-2.5 hover:bg-slate-800/20 p-1 rounded transition border-l-2 border-transparent hover:border-teal-450">
                <span className="text-slate-500 text-[10px] select-none pt-0.5 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor} uppercase tracking-wider flex items-center gap-1`}>
                  <Icon className="w-2.5 h-2.5" />
                  {log.level}
                </span>
                <span className="text-slate-400 text-[11px] font-semibold tracking-wide whitespace-nowrap">
                  [{log.service}]:
                </span>
                <span className={`flex-1 break-words leading-relaxed ${textColor}`}>
                  {log.message}
                </span>
                {log.cacheHit && (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 uppercase tracking-wide">
                    Redis Cache HIT
                  </span>
                )}
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>

      <div className="bg-[#111721] border-t border-slate-800 px-4 py-1 text-[10px] text-slate-500 font-mono text-right flex justify-between items-center">
        <span>Aegis Core Event Bus v1.2</span>
        <span>Secure ISO-27001 Agent Event Logs</span>
      </div>
    </div>
  );
}
