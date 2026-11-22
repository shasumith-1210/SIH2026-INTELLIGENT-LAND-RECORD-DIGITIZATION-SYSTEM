import { Page } from "../../types";
import { api } from "../../services/api";
import { useLoad } from "../../hooks";

interface Props {
  navigate: (p: Page) => void;
}

const recentQueue = [
  { id: "REC-2024-0441", owner: "Suresh Patel", survey: "Survey 78/C", district: "Varanasi", confidence: 94, status: "pending" },
  { id: "REC-2024-0440", owner: "Meera Devi", survey: "Khasra 124", district: "Agra", confidence: 71, status: "review" },
  { id: "REC-2024-0439", owner: "Ramesh Yadav", survey: "Survey 15/A", district: "Kanpur", confidence: 88, status: "pending" },
  { id: "REC-2024-0438", owner: "Anita Singh", survey: "Khata 330", district: "Allahabad", confidence: 45, status: "error" },
  { id: "REC-2024-0437", owner: "Vijay Kumar", survey: "Survey 201", district: "Mathura", confidence: 96, status: "verified" },
];

const confColor = (c: number) => c >= 85 ? "text-green-600 bg-green-50" : c >= 60 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";

export default function OfficerDashboard({ navigate }: Props) {
  const live = api.enabled;
  const sum = useLoad(() => api.getSummary(), live);
  const list = useLoad(() => api.listDocuments(), live);
  const S = sum.data;
  const n = (v: number | undefined) => (v === undefined ? "…" : String(v));
  const liveStats = [
    { label: "Total Documents", value: n(S?.received), change: "all submissions", color: "bg-blue-50 border-blue-100", text: "text-blue-700", icon: "📄" },
    { label: "OCR processed", value: n(S ? S.received - S.submitted : undefined), change: "text extracted", color: "bg-green-50 border-green-100", text: "text-green-700", icon: "✅" },
    { label: "Pending Verification", value: n(S?.pending), change: "awaiting officer", color: "bg-amber-50 border-amber-100", text: "text-amber-700", icon: "⏳" },
    { label: "Rejected", value: n(S?.rejected), change: "sent back", color: "bg-red-50 border-red-100", text: "text-red-700", icon: "⚠️" },
    { label: "Avg OCR confidence", value: S?.avg_confidence != null ? `${S.avg_confidence}%` : "—", change: "mean field confidence", color: "bg-purple-50 border-purple-100", text: "text-purple-700", icon: "🤖" },
  ];
  const livePipeline = [
    { stage: "Submitted (no OCR)", count: S?.submitted ?? 0, color: "bg-blue-100 text-blue-700 border-blue-200" },
    { stage: "Awaiting officer", count: S?.processed ?? 0, color: "bg-amber-100 text-amber-700 border-amber-200" },
    { stage: "Officer verified", count: S?.officer_verified ?? 0, color: "bg-green-100 text-green-700 border-green-200" },
    { stage: "Rejected", count: S?.rejected ?? 0, color: "bg-red-100 text-red-700 border-red-200" },
  ];
  const liveProgress = [
    { label: "Verified", val: S?.officer_verified ?? 0, max: Math.max(S?.received ?? 1, 1), color: "bg-green-500" },
    { label: "Pending", val: S?.pending ?? 0, max: Math.max(S?.received ?? 1, 1), color: "bg-blue-500" },
    { label: "Rejected", val: S?.rejected ?? 0, max: Math.max(S?.received ?? 1, 1), color: "bg-red-400" },
  ];
  const queue = live
    ? (list.data ?? []).slice().reverse().slice(0, 5).map((d) => ({ id: d.id, owner: d.owner, survey: `Survey ${d.survey}`, district: d.district, confidence: d.confidence ?? 0, status: d.status === "officer_verified" ? "verified" : d.status === "rejected" ? "error" : (d.flagged ?? 0) > 0 ? "review" : "pending" }))
    : recentQueue;
  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA]">
      <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Officer Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">{live ? new Date().toDateString() : "Lucknow District · 04 Sep 2024 · Shift: Morning"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("officer-queue")} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
              <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">{live ? n(S?.pending) : "7"}</span>
              Verification Queue
            </button>
            <button onClick={() => navigate("officer-upload")} className="bg-[#0B2545] hover:bg-[#1A3A6B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              ↑ Upload Records
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {(live ? liveStats : [
            { label: "Total Documents", value: "1,842", change: "+24 today", color: "bg-blue-50 border-blue-100", text: "text-blue-700", icon: "📄" },
            { label: "Processed", value: "1,619", change: "87.9%", color: "bg-green-50 border-green-100", text: "text-green-700", icon: "✅" },
            { label: "Pending Verification", value: "147", change: "⚠ Action needed", color: "bg-amber-50 border-amber-100", text: "text-amber-700", icon: "⏳" },
            { label: "Errors / Review", value: "76", change: "Needs attention", color: "bg-red-50 border-red-100", text: "text-red-700", icon: "⚠️" },
            { label: "AI Accuracy", value: "97.3%", change: "+0.4% vs last week", color: "bg-purple-50 border-purple-100", text: "text-purple-700", icon: "🤖" },
          ]).map((s) => (
            <div key={s.label} className={`${s.color} border rounded-xl p-4 card-hover`}>
              <div className="flex items-start justify-between mb-1">
                <span className="text-lg">{s.icon}</span>
              </div>
              <p className={`text-2xl font-bold ${s.text}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
              <p className="text-xs text-gray-400 mt-1">{s.change}</p>
            </div>
          ))}
        </div>

        {/* Processing Pipeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-[#0B2545] mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>AI Processing Pipeline Status</h3>
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {(live ? livePipeline : [
              { stage: "Ingestion", count: 12, color: "bg-blue-100 text-blue-700 border-blue-200" },
              { stage: "OCR Extraction", count: 8, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
              { stage: "Field Parsing", count: 6, color: "bg-violet-100 text-violet-700 border-violet-200" },
              { stage: "Validation", count: 14, color: "bg-amber-100 text-amber-700 border-amber-200" },
              { stage: "Duplicate Check", count: 3, color: "bg-orange-100 text-orange-700 border-orange-200" },
              { stage: "Officer Queue", count: 147, color: "bg-red-100 text-red-700 border-red-200" },
              { stage: "Verified", count: 1619, color: "bg-green-100 text-green-700 border-green-200" },
            ]).map((s, i) => (
              <div key={s.stage} className="flex items-center gap-2 shrink-0">
                <div className={`border rounded-xl px-4 py-3 text-center min-w-[100px] ${s.color}`}>
                  <p className="text-xl font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>{s.count}</p>
                  <p className="text-xs font-medium mt-0.5">{s.stage}</p>
                </div>
                {i < (live ? 3 : 6) && <span className="text-gray-300 text-sm">→</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Recent Verification Queue</h3>
              <button onClick={() => navigate("officer-queue")} className="text-xs text-blue-600 hover:text-blue-800 font-medium">View All →</button>
            </div>
            <div className="divide-y divide-gray-50">
              {queue.length === 0 && <p className="px-6 py-6 text-sm text-gray-400">No submissions yet.</p>}
              {queue.map((r) => (
                <div key={r.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs">📄</div>
                    <div>
                      <p className="text-sm font-semibold text-[#0B2545]">{r.owner}</p>
                      <p className="text-xs text-gray-400">{r.survey} · {r.district}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`mono text-xs px-2 py-1 rounded-md font-bold ${confColor(r.confidence)}`}>{r.confidence}%</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      r.status === "verified" ? "badge-verified" : r.status === "review" ? "badge-pending" : r.status === "error" ? "badge-rejected" : "badge-processing"
                    }`}>
                      {r.status === "verified" ? "✓" : r.status === "review" ? "⏳" : r.status === "error" ? "✗" : "⟳"} {r.status}
                    </span>
                    <button onClick={() => navigate("officer-verify")} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Review</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h4 className="font-semibold text-[#0B2545] text-sm mb-3">Today's Progress</h4>
              <div className="space-y-3">
                {(live ? liveProgress : [
                  { label: "Documents verified", val: 34, max: 50, color: "bg-green-500" },
                  { label: "AI OCR runs", val: 48, max: 60, color: "bg-blue-500" },
                  { label: "Rejections", val: 5, max: 50, color: "bg-red-400" },
                ]).map((p) => (
                  <div key={p.label}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{p.label}</span>
                      <span className="font-medium text-[#0B2545]">{p.val}/{p.max}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${p.color} rounded-full transition-all`} style={{ width: `${(p.val/p.max)*100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h4 className="font-semibold text-[#0B2545] text-sm mb-3">Quick Actions</h4>
              <div className="space-y-2">
                {[
                  { icon: "◈", label: "Start AI Verification", page: "officer-verify" as Page, color: "text-blue-600" },
                  { icon: "⊿", label: "View Analytics", page: "officer-analytics" as Page, color: "text-purple-600" },
                  { icon: "⊟", label: "Audit Trail", page: "officer-audit" as Page, color: "text-gray-600" },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.page)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className={a.color}>{a.icon}</span>
                    <span className="text-gray-700">{a.label}</span>
                    <span className="ml-auto text-gray-300">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
