import { useState } from "react";
import { Database, HardDrive, ShieldCheck, CheckCircle2, FileText, ChevronRight, User } from "lucide-react";
import { DatabaseRecord } from "../types";

interface TransactionHistoryProps {
  records: DatabaseRecord[];
}

export default function TransactionHistory({ records }: TransactionHistoryProps) {
  const [selectedRecord, setSelectedRecord] = useState<DatabaseRecord | null>(null);

  const handleRowClick = (record: DatabaseRecord) => {
    setSelectedRecord(record === selectedRecord ? null : record);
  };

  return (
    <div className="bg-[#0f141c] border border-slate-800 rounded-lg p-6 flex flex-col h-[400px]">
      <div className="flex items-center gap-2 mb-4">
        <Database className="text-teal-400 w-5 h-5" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-350">
          PostgreSQL Transaction Log (Normalized Records)
        </h2>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
        {/* Table list */}
        <div className="md:col-span-7 overflow-y-auto flex flex-col gap-2 pr-1">
          {records.length === 0 ? (
            <div className="text-slate-500 font-mono text-center py-10 italic">
              -- NO TRANSACTIONS STORED IN TABLE POOLS --
            </div>
          ) : (
            records.map((record) => {
              const isOpen = selectedRecord?.id === record.id;
              const isFailed = record.status === "failed";
              return (
                <button
                  key={record.id}
                  onClick={() => handleRowClick(record)}
                  className={`w-full text-left p-3.5 rounded-lg border flex items-center justify-between transition cursor-pointer ${
                    isOpen
                      ? "bg-[#14232a] border-teal-500/20 text-teal-300"
                      : "bg-slate-900/40 border-slate-850 hover:bg-slate-800/20 text-slate-400"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-300">{record.id}</span>
                      <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 rounded font-mono text-slate-400 uppercase font-semibold">
                        {record.owner}
                      </span>
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                        isFailed ? "bg-rose-500/10 text-rose-450 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {record.status}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-slate-300 truncate font-semibold">
                      {record.target}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-90 text-teal-400" : ""}`} />
                </button>
              );
            })
          )}
        </div>

        {/* Selected Record Detail */}
        <div className="md:col-span-5 bg-slate-950/45 border border-slate-850 rounded-lg p-4 flex flex-col overflow-y-auto">
          {selectedRecord ? (
            <div className="space-y-4">
              <div className="border-b border-slate-850/50 pb-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase">
                  <span>Record Metadata</span>
                  <span>{new Date(selectedRecord.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-mono text-xs font-bold text-teal-350 mt-1">{selectedRecord.id}</h3>
              </div>

              <div className="space-y-1 text-slate-400 font-sans text-xs">
                <span className="text-[10px] uppercase font-mono text-slate-500">Task Objective:</span>
                <p className="text-slate-200 mt-0.5 leading-relaxed font-semibold">{selectedRecord.target}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Workflow Steps Log:</span>
                <div className="space-y-1">
                  {selectedRecord.steps.map((s, i) => (
                    <div key={i} className="flex gap-2 text-[10.5px] items-center text-slate-350">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="font-mono italic truncate">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRecord.output && (
                <div className="space-y-1.5 border-t border-slate-850/50 pt-3">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Manifest Output Extract:</span>
                  <p className="text-[10.5px] font-mono text-slate-400 leading-relaxed bg-[#0b0f17] p-2.5 rounded border border-slate-850 line-clamp-4 overflow-y-auto select-all select-text">
                    {selectedRecord.output}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-600">
              <HardDrive className="w-8 h-8 text-slate-700 mb-2" />
              <p className="font-sans text-[11px] max-w-xs leading-relaxed">
                {"-- CLICK ANY PGSQL ROW ENTRY TO VIEW COMPILED TRANSACTION DETAILS --"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
