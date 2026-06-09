import { Cpu, Shield, Zap, Circle, Code, HardDrive, Key } from "lucide-react";
import { AgentState } from "../types";

interface AgentStatusGridProps {
  agents: AgentState[];
}

export default function AgentStatusGrid({ agents }: AgentStatusGridProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="text-teal-400 w-5 h-5" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Autonomous Agent Pool Status
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => {
          let shadowColor = "hover:shadow-teal-500/5";
          let circleColor = "bg-slate-700";
          let borderStyle = "border-slate-800";
          let nameColor = "text-slate-300";

          if (agent.status === "active") {
            shadowColor = "shadow-[0_0_15px_rgba(45,212,191,0.15)] bg-teal-950/20";
            circleColor = "bg-teal-400 animate-pulse";
            borderStyle = "border-teal-400/30";
            nameColor = "text-teal-300";
          } else if (agent.status === "error") {
            shadowColor = "shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-rose-950/20";
            circleColor = "bg-rose-500 animate-ping";
            borderStyle = "border-rose-500/30";
            nameColor = "text-rose-400";
          }

          // Assign descriptive visual icons
          let AgentIcon = Cpu;
          if (agent.name.includes("Audit")) AgentIcon = Shield;
          if (agent.name.includes("Tuning")) AgentIcon = HardDrive;
          if (agent.name.includes("Executor")) AgentIcon = Code;

          return (
            <div
              key={agent.id}
              className={`bg-[#0f141c] border rounded-lg p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 ${borderStyle} ${shadowColor}`}
            >
              <div className="flex items-start justify-between">
                <div className="p-2 bg-slate-800/40 rounded-md border border-slate-700/50">
                  <AgentIcon className={`w-4 h-4 ${agent.status === "active" ? "text-teal-400" : "text-slate-400"}`} />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/30 px-2 py-0.5 rounded border border-slate-700/20">
                  <Circle className={`w-2 h-2 rounded-full ${circleColor}`} />
                  <span className="text-[9px] font-mono uppercase font-semibold text-slate-400">
                    {agent.status}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <h3 className={`text-sm font-bold font-mono ${nameColor}`}>{agent.name}</h3>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">{agent.role}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-850 space-y-1 text-[10px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Node model:</span>
                  <span className="text-slate-400">{agent.model}</span>
                </div>
                <div className="flex flex-col gap-0.5 mt-2">
                  <span className="text-slate-500">Operation log:</span>
                  <p className="text-[10px] text-slate-350 bg-slate-900/60 p-1.5 rounded truncate border border-slate-800/10 italic">
                    {agent.lastAction}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
