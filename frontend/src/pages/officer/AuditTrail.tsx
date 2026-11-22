import { useState } from "react";
import { Page } from "../../types";
import { useAudit } from "../../store";
import { api } from "../../services/api";
import { useLoad } from "../../hooks";
import { toAuditEntry } from "../../liveData";

interface Props {
  navigate: (p: Page) => void;
}

const logs = [
  { id: "AUD-0891", time: "04 Sep 2024, 11:32 AM", officer: "Amitabh Kumar", action: "Verified", record: "REC-2024-0437", detail: "All 14 fields approved. Confidence: 96%", type: "verify" },
  { id: "AUD-0890", time: "04 Sep 2024, 11:18 AM", officer: "Amitabh Kumar", action: "Edited Field", record: "REC-2024-0436", detail: "Modified 'Boundary South' from '?? Sharma' to 'Gopi Lal Sharma'", type: "edit" },
  { id: "AUD-0889", time: "04 Sep 2024, 10:55 AM", officer: "Priya Verma", action: "Rejected", record: "REC-2024-0435", detail: "Critical fields unreadable. Sent back for re-scanning.", type: "reject" },
  { id: "AUD-0888", time: "04 Sep 2024, 10:41 AM", officer: "Amitabh Kumar", action: "Uploaded Batch", record: "BATCH-2024-112", detail: "3 files uploaded · AI OCR initiated", type: "upload" },
  { id: "AUD-0887", time: "04 Sep 2024, 10:12 AM", officer: "Amitabh Kumar", action: "Logged In", record: "—", detail: "2FA verified · IP: 10.142.0.8", type: "login" },
  { id: "AUD-0886", time: "03 Sep 2024, 05:44 PM", officer: "Priya Verma", action: "Verified", record: "REC-2024-0434", detail: "2 fields manually edited. Confidence: 83%", type: "verify" },
  { id: "AUD-0885", time: "03 Sep 2024, 04:30 PM", officer: "Rahul Mishra", action: "Duplicate Flagged", record: "REC-2024-0433", detail: "Duplicate of REC-2024-0291 detected by AI. Held for review.", type: "flag" },
  { id: "AUD-0884", time: "03 Sep 2024, 03:12 PM", officer: "Amitabh Kumar", action: "Verified", record: "REC-2024-0432", detail: "All 14 fields approved without edits. Confidence: 99%", type: "verify" },
];

const typeConfig: Record<string, { color: string; icon: string }> = {
  verify: { color: "bg-green-100 text-green-700 border-green-200", icon: "✓" },
  edit: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: "✏" },
  reject: { color: "bg-red-100 text-red-700 border-red-200", icon: "✕" },
  upload: { color: "bg-purple-100 text-purple-700 border-purple-200", icon: "↑" },
  login: { color: "bg-gray-100 text-gray-600 border-gray-200", icon: "⇥" },
  flag: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: "⚑" },
  ocr: { color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: "◎" },
};

export default function AuditTrail({ navigate: _navigate }: Props) {
  const { entries } = useAudit();
  const server = useLoad(() => api.getAudit(), api.enabled);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = (api.enabled ? (server.data ?? []).map(toAuditEntry) : [...entries, ...logs]).filter((l) => {
    const matchType = typeFilter === "all" || l.type === typeFilter;
    const matchSearch = l.officer.toLowerCase().includes(search.toLowerCase()) || l.record.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-5xl mx-auto animate-fadeIn">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Audit Trail</h1>
            <p className="text-gray-500 text-sm mt-1">Complete tamper-proof log of all officer actions and system events.</p>
          </div>
          <button className="border border-gray-200 bg-white text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            📥 Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="flex-1 min-w-48 bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center gap-2">
            <span className="text-gray-400">🔍</span>
            <input type="text" placeholder="Search officer, record ID, action..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 text-sm focus:outline-none placeholder-gray-400" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { val: "all", label: "All" },
              { val: "verify", label: "✓ Verified" },
              { val: "edit", label: "✏ Edited" },
              { val: "reject", label: "✕ Rejected" },
              { val: "upload", label: "↑ Uploaded" },
              { val: "flag", label: "⚑ Flagged" },
            ].map((f) => (
              <button key={f.val} onClick={() => setTypeFilter(f.val)} className={`px-3 py-2 text-xs rounded-lg border font-medium transition-all ${typeFilter === f.val ? "bg-[#0B2545] text-white border-[#0B2545]" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{f.label}</button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{filtered.length} log entries</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
              Blockchain anchored · Immutable
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {filtered.map((log) => {
              const cfg = (typeConfig[log.type] ?? typeConfig.flag);
              return (
                <div key={log.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 ${cfg.color}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#0B2545]">{log.action}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{log.type}</span>
                        </div>
                        <span className="text-xs text-gray-400">{log.time}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>👤 {log.officer}</span>
                        {log.record !== "—" && <><span className="text-gray-200">|</span><span className="mono text-blue-600 font-medium">{log.record}</span></>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{log.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="mono text-xs text-gray-300">{log.id}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm">No matching audit logs found</p>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-gray-400">
          All audit events are cryptographically hashed and anchored to a tamper-proof blockchain ledger every 60 minutes.
        </div>
      </div>
    </div>
  );
}
