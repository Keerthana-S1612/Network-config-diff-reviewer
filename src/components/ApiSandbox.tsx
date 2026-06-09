import { useState } from "react";
import { Terminal, Send, Lock, ShieldAlert, Cpu, Heart, Database, Trash2, Clock, Check } from "lucide-react";

interface ApiSandboxProps {
  accessToken: string;
  onRefreshLogs: () => void;
  onRefreshRecords: () => void;
}

interface ApiEndpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  rolesRequired: string[];
  payload?: string;
}

const APIS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/health",
    description: "Fetches system health indicators, CPU metrics, and active pipeline status indicators.",
    rolesRequired: ["guest", "operator", "admin", "auditor"]
  },
  {
    method: "GET",
    path: "/api/db/records",
    description: "Fetches transactional database summaries from the normalized schemas tables.",
    rolesRequired: ["guest", "operator", "admin", "auditor"]
  },
  {
    method: "GET",
    path: "/api/cache/status",
    description: "Returns statistics on simulated redis memory caches, sizing ratios, hits, and misses.",
    rolesRequired: ["guest", "operator", "admin", "auditor"]
  },
  {
    method: "GET",
    path: "/api/logs",
    description: "Returns compiled audit logs, gate alerts, and multi-model agent output summaries.",
    rolesRequired: ["guest", "operator", "admin", "auditor"]
  },
  {
    method: "POST",
    path: "/api/agents/execute",
    description: "Dispatches the multi-agent planning state machine and queries the Gemini-3.5-flash model.",
    rolesRequired: ["operator", "admin"],
    payload: JSON.stringify({ prompt: "Provide security and cache tuning rules to build a scalable authentication microservice." }, null, 2)
  },
  {
    method: "POST",
    path: "/api/cache/clear",
    description: "Manually clears the fast memory layers. Requires administrator JWT clearance.",
    rolesRequired: ["admin"]
  }
];

export default function ApiSandbox({ accessToken, onRefreshLogs, onRefreshRecords }: ApiSandboxProps) {
  const [selectedApi, setSelectedApi] = useState<ApiEndpoint>(APIS[0]);
  const [customPayload, setCustomPayload] = useState<string>(APIS[0].payload || "");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [resStatus, setResStatus] = useState<number | null>(null);
  const [headers, setHeaders] = useState<Record<string, string>>({});

  const handleApiSelect = (api: ApiEndpoint) => {
    setSelectedApi(api);
    setCustomPayload(api.payload || "");
    setResponse(null);
    setResStatus(null);
    setHeaders({});
  };

  const executeApi = async () => {
    setLoading(true);
    setResponse(null);
    setResStatus(null);
    setHeaders({});

    try {
      const options: RequestInit = {
        method: selectedApi.method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": accessToken // Will be sent standard
        }
      };

      if (selectedApi.method === "POST" && customPayload) {
        options.body = customPayload;
      }

      const res = await fetch(selectedApi.path, options);
      setResStatus(res.status);

      // Capture headers of interest
      setHeaders({
        "Content-Type": res.headers.get("Content-Type") || "",
        "X-RateLimit-Limit": res.headers.get("X-RateLimit-Limit") || "",
        "X-RateLimit-Remaining": res.headers.get("X-RateLimit-Remaining") || "",
      });

      const body = await res.json();
      setResponse(body);

      // Trigger automatic content updates
      if (res.ok) {
        onRefreshLogs();
        if (selectedApi.path === "/api/agents/execute") {
          onRefreshRecords();
        }
      }
    } catch (e: any) {
      setResponse({ error: "Network Failure", message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0f141c] border border-slate-800 rounded-lg p-6 flex flex-col h-[540px]">
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="text-teal-400 w-5 h-5" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-350">
          OpenAPI REST Sandbox (RBAC Gateways)
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
        {/* Left endpoint selector */}
        <div className="lg:col-span-4 flex flex-col gap-2 overflow-y-auto pr-1">
          {APIS.map((api, index) => {
            const isSelected = selectedApi.path === api.path && selectedApi.method === api.method;
            const isPost = api.method === "POST";
            return (
              <button
                key={index}
                onClick={() => handleApiSelect(api)}
                className={`w-full text-left p-3 rounded-lg border font-mono text-xs transition duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-[#14232a] border-teal-500/20 text-teal-350"
                    : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/30 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
                    isPost ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}>
                    {api.method}
                  </span>
                  <span className="font-semibold truncate text-[11px]">{api.path}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-sans line-clamp-1">{api.description}</p>
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {api.rolesRequired.map((r, i) => (
                    <span key={i} className="text-[9px] bg-slate-800/40 border border-slate-700/20 px-1 py-0.1 rounded text-slate-400 uppercase font-semibold">
                      {r}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Sandbox Workspace */}
        <div className="lg:col-span-8 flex flex-col overflow-hidden bg-slate-950/40 border border-slate-850 rounded-lg p-4">
          <div className="flex flex-col gap-1 pb-3 mb-3 border-b border-slate-850">
            <div className="flex items-center gap-2 justify-between">
              <span className="text-xs font-bold font-mono text-slate-300">
                {selectedApi.method} {selectedApi.path}
              </span>
              <button
                onClick={executeApi}
                disabled={loading}
                className="bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer text-slate-950 text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(45,212,191,0.1)]"
              >
                <Send className="w-3.5 h-3.5" />
                {loading ? "executing..." : "Send Request"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed mt-1">{selectedApi.description}</p>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
            {/* API Parameters/Request */}
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] font-mono text-slate-500 mb-1 flex items-center gap-1">
                Authorization Header Configuration:
              </span>
              <div className="p-2 border border-slate-800 bg-slate-900/60 rounded text-[10px] font-mono text-slate-400 mb-3 truncate">
                {accessToken ? (
                  <span className="text-teal-400">Authorization: {accessToken.slice(0, 25)}...</span>
                ) : (
                  <span className="text-rose-500">{"Authorization Token MISSING"}</span>
                )}
              </div>

              {selectedApi.payload && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <span className="text-[10px] font-mono text-slate-500 mb-1">JSON Request Body Payload:</span>
                  <textarea
                    value={customPayload}
                    onChange={(e) => setCustomPayload(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 p-2.5 rounded font-mono text-[11px] text-slate-300 focus:outline-none focus:border-teal-500/40 resize-none"
                  />
                </div>
              )}
            </div>

            {/* API Server Response */}
            <div className="flex flex-col overflow-hidden border-l border-slate-850 pl-0 md:pl-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-slate-500">Response Payload Node:</span>
                {resStatus !== null && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    resStatus >= 200 && resStatus < 300
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}>
                    HTTP {resStatus}
                  </span>
                )}
              </div>

              <div className="flex-1 bg-[#0a0d13] border border-slate-850 p-3 rounded overflow-y-auto font-mono text-[11px] text-slate-300 relative">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-400"></div>
                  </div>
                ) : null}

                {response ? (
                  <div className="space-y-3">
                    {/* Headers visualization */}
                    <div className="border-b border-slate-850/50 pb-2 mb-2">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1">HTTP Response Headers</span>
                      {Object.entries(headers).map(([k, v]) => v && (
                        <div key={k} className="flex justify-between text-[9px] text-slate-400">
                          <span className="key font-semibold">{k}:</span>
                          <span className="val text-slate-500">{v}</span>
                        </div>
                      ))}
                    </div>
                    {/* JSON visualization */}
                    <pre className="text-teal-350/90 whitespace-pre-wrap leading-relaxed select-text">{JSON.stringify(response, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="text-slate-600 text-center py-12 italic text-[11px]">
                    {"-- TRIGGER SEND REQUEST TO EXECUTE ENDPOINT --"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
