import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Page } from "../../types";
import { useAudit } from "../../store";

interface Props {
  navigate: (p: Page) => void;
}

const seedRecords = [
  { id: "REC-2024-0441", owner: "Suresh Ramesh Patel", survey: "Survey 78/C", district: "Varanasi", tehsil: "Varanasi Sadar", confidence: 94, status: "pending", uploaded: "04 Sep 09:12 AM", priority: "high" },
  { id: "REC-2024-0440", owner: "Meera Devi", survey: "Khasra 124", district: "Agra", tehsil: "Agra Sadar", confidence: 71, status: "review", uploaded: "04 Sep 09:05 AM", priority: "medium" },
  { id: "REC-2024-0439", owner: "Ramesh Yadav", survey: "Survey 15/A", district: "Kanpur", tehsil: "Kanpur Dehat", confidence: 88, status: "pending", uploaded: "03 Sep 05:44 PM", priority: "normal" },
  { id: "REC-2024-0438", owner: "Anita Singh", survey: "Khata 330", district: "Allahabad", tehsil: "Allahabad Sadar", confidence: 45, status: "error", uploaded: "03 Sep 04:20 PM", priority: "high" },
  { id: "REC-2024-0437", owner: "Vijay Kumar", survey: "Survey 201", district: "Mathura", tehsil: "Mathura Dehat", confidence: 96, status: "verified", uploaded: "03 Sep 03:11 PM", priority: "normal" },
  { id: "REC-2024-0436", owner: "Priya Gupta", survey: "Khasra 88-B", district: "Lucknow", tehsil: "Sarojini Nagar", confidence: 79, status: "review", uploaded: "03 Sep 01:30 PM", priority: "medium" },
  { id: "REC-2024-0435", owner: "Mohan Lal", survey: "Survey 442", district: "Gorakhpur", tehsil: "Gorakhpur Urban", confidence: 52, status: "error", uploaded: "03 Sep 11:00 AM", priority: "high" },
];

const confColor = (c: number) => c >= 85 ? "text-green-700 bg-green-50 border-green-200" : c >= 60 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-700 bg-red-50 border-red-200";
const priorityBadge = (p: string) => p === "high" ? "bg-red-100 text-red-700 border-red-200" : p === "medium" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-gray-100 text-gray-600 border-gray-200";

export default function VerificationQueue({ navigate }: Props) {
  const { submissions, verified } = useAudit();
  const [live, setLive] = useState<typeof seedRecords>([]);
  useEffect(() => {
    if (!api.enabled) return;
    api.listDocuments().then((ds) => setLive(ds.map((d) => ({
      id: d.id, owner: d.owner, survey: d.survey, district: d.district, tehsil: d.tehsil, confidence: d.confidence ?? 0,
      status: d.status === "officer_verified" ? "verified" : d.status === "rejected" ? "rejected" : (d.flagged ?? 0) > 0 ? "review" : "pending",
      uploaded: new Date(d.uploaded).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      priority: (d.confidence ?? 0) > 0 && (d.confidence ?? 0) < 60 ? "high" : "normal",
    })))).catch(() => {});
  }, []);
  const records = api.enabled ? live : [
    ...submissions.map((s) => ({ id: s.id, owner: s.owner, survey: s.survey, district: s.district, tehsil: s.tehsil, confidence: 0, status: "pending", uploaded: s.uploaded, priority: "normal" })),
    ...seedRecords,
  ].map((r) => (verified.includes(r.id) ? { ...r, status: "verified" } : r));
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = records.filter((r) => {
    const matchStatus = filter === "all" || r.status === filter;
    const matchSearch = r.owner.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()) || r.district.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-6xl mx-auto animate-fadeIn">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Verification Queue</h1>
            <p className="text-gray-500 text-sm mt-1">{records.filter(r => r.status !== "verified").length} records awaiting your review</p>
          </div>
          <button onClick={() => navigate("officer-verify")} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
            ◈ Start Verification
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: "All", count: records.length, val: "all", color: "bg-blue-50 text-blue-700 border-blue-200" },
            { label: "Pending", count: records.filter(r => r.status === "pending").length, val: "pending", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
            { label: "Review", count: records.filter(r => r.status === "review").length, val: "review", color: "bg-amber-50 text-amber-700 border-amber-200" },
            { label: "Error", count: records.filter(r => r.status === "error").length, val: "error", color: "bg-red-50 text-red-700 border-red-200" },
            { label: "Verified", count: records.filter(r => r.status === "verified").length, val: "verified", color: "bg-green-50 text-green-700 border-green-200" },
          ].map((f) => (
            <button
              key={f.val}
              onClick={() => setFilter(f.val)}
              className={`border rounded-xl p-3 text-center transition-all ${f.color} ${filter === f.val ? "ring-2 ring-offset-1 ring-blue-400" : "opacity-70 hover:opacity-100"}`}
            >
              <p className="text-xl font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>{f.count}</p>
              <p className="text-xs font-medium mt-0.5">{f.label}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center gap-3 mb-4">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search by owner name, record ID, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm focus:outline-none text-gray-700 placeholder-gray-400"
          />
          {search && <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">✕</button>}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Record ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Owner / Survey</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">District / Tehsil</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">AI Confidence</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Priority</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Uploaded</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="mono text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">{r.id}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[#0B2545]">{r.owner}</p>
                      <p className="text-xs text-gray-400">{r.survey}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[#0B2545]">{r.district}</p>
                      <p className="text-xs text-gray-400">{r.tehsil}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${r.confidence >= 85 ? "bg-green-500" : r.confidence >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.confidence}%` }}></div>
                        </div>
                        <span className={`mono text-xs px-1.5 py-0.5 rounded border font-bold ${confColor(r.confidence)}`}>{r.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        r.status === "verified" ? "badge-verified" : r.status === "review" ? "badge-pending" : r.status === "error" ? "badge-rejected" : "badge-processing"
                      }`}>
                        {r.status === "verified" ? "✓ Verified" : r.status === "review" ? "⏳ Review" : r.status === "error" ? "✗ Error" : "⟳ Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${priorityBadge(r.priority)}`}>{r.priority}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{r.uploaded}</td>
                    <td className="px-5 py-3.5">
                      {r.status !== "verified" && (
                        <button
                          onClick={() => navigate("officer-verify")}
                          className="text-xs bg-[#0B2545] text-white px-3 py-1.5 rounded-lg hover:bg-[#1A3A6B] transition-colors font-medium"
                        >
                          Review →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm">No records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
