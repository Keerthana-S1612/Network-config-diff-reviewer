import { Users, Shield, Key, Lock, Check } from "lucide-react";
import { UserRole, UserSession } from "../types";

interface AuthSwitcherProps {
  currentSession: UserSession;
  onLogin: (username: string, role: UserRole) => void;
}

const ROLES = [
  { role: UserRole.ADMIN, name: "Super Administrator", desc: "Full permissions: agent dispatching, log clearance, Redis buffer purges.", color: "border-teal-500/20 text-teal-400 bg-teal-500/5 hover:bg-teal-500/10 focus:border-teal-400/50" },
  { role: UserRole.OPERATOR, name: "Operations Engineer", desc: "Write access: execute orchestrator workflows, read log and latency indices.", color: "border-amber-500/20 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10 focus:border-amber-400/50" },
  { role: UserRole.AUDITOR, name: "Security Auditor", desc: "Read-only access: review diagnostic templates, policy traces, and system health.", color: "border-pink-500/20 text-pink-500 bg-pink-500/5 hover:bg-pink-500/10 focus:border-pink-400/50" },
  { role: UserRole.GUEST, name: "Unauthenticated Guest", desc: "No core authorization: isolated strictly to public health check telemetry endpoints.", color: "border-slate-500/20 text-slate-400 bg-slate-500/5 hover:bg-slate-500/10 focus:border-slate-400/50" }
];

export default function AuthSwitcher({ currentSession, onLogin }: AuthSwitcherProps) {
  return (
    <div className="bg-[#0f141c] border border-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="text-teal-400 w-5 h-5" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-350">
            RBAC Access Profile Control Center
          </h2>
        </div>
        <div className="text-[10px] font-mono text-slate-505 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded flex items-center gap-1.5 text-slate-400">
          <Lock className="w-3 h-3 text-emerald-400 animate-pulse" />
          JWT ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {ROLES.map((roleObj) => {
          const isActive = currentSession.role === roleObj.role;

          return (
            <button
              key={roleObj.role}
              onClick={() => onLogin(`auth-user-${roleObj.role}`, roleObj.role)}
              className={`text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer relative flex flex-col justify-between h-[135px] ${roleObj.color} ${
                isActive ? "ring-2 ring-teal-400 border-transparent shadow-[0_0_15px_rgba(45,212,191,0.08)] scale-[1.01]" : "opacity-75 hover:opacity-100"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider font-mono">
                    {roleObj.role === UserRole.ADMIN ? "Level 3: ADMIN" : 
                     roleObj.role === UserRole.OPERATOR ? "Level 2: OPERATOR" :
                     roleObj.role === UserRole.AUDITOR ? "Level 1: AUDITOR" : "Level 0: GUEST"}
                  </span>
                  {isActive && <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                </div>
                <h3 className="text-xs font-bold text-slate-200 truncate">{roleObj.name}</h3>
                <p className="text-[10px] text-slate-400 font-sans mt-2 line-clamp-2 leading-relaxed">
                  {roleObj.desc}
                </p>
              </div>

              <div className="mt-2 text-[10px] font-mono border-t border-slate-800/40 pt-2 text-slate-400 flex items-center justify-between">
                <span>Decoded credentials:</span>
                <span className="font-semibold capitalize text-slate-300">{roleObj.role}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
