import { Page } from "../../types";
import { api } from "../../services/api";
import { useLoad } from "../../hooks";
import { fmt } from "../../liveData";

interface Props {
  navigate: (p: Page) => void;
}

const records = [
  { id: "LR-2024-001", survey: "Survey No. 142/A", location: "Mohanlalganj, Lucknow", status: "verified", updated: "28 Aug 2024", area: "2.4 Bigha" },
  { id: "LR-2024-002", survey: "Khasra No. 87", location: "Kakori, Lucknow", status: "processing", updated: "01 Sep 2024", area: "1.1 Bigha" },
  { id: "LR-2024-003", survey: "Survey No. 35/B", location: "Malihabad, Lucknow", status: "verification", updated: "03 Sep 2024", area: "3.7 Bigha" },
];

const statusBadge = (s: string) => {
  if (s === "verified") return <span className="badge-verified text-xs px-2.5 py-1 rounded-full font-medium">✓ Verified</span>;
  if (s === "processing") return <span className="badge-processing text-xs px-2.5 py-1 rounded-full font-medium">⟳ AI Processing</span>;
  if (s === "verification") return <span className="badge-pending text-xs px-2.5 py-1 rounded-full font-medium">⏳ Officer Review</span>;
  return null;
};

export default function LandownerDashboard({ navigate }: Props) {
  const live = api.enabled;
  const mine = useLoad(() => api.myDocuments(), live);
  const rows = live
    ? (mine.data ?? []).map((d) => ({ id: d.id, survey: `Survey ${d.survey}`, location: `${d.tehsil || "—"}, ${d.district}`, status: d.status === "officer_verified" ? "verified" : d.status === "processed" ? "verification" : "processing", updated: fmt(d.uploaded), area: d.extracted?.area ?? "area pending" }))
    : records;
  const nVer = rows.filter((r) => r.status === "verified").length;
  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA]">
      <div className="p-8 max-w-5xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {live ? "Namaste 🙏" : "Namaste, Rajesh Ji 🙏"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Here's an overview of your land records and applications.</p>
          </div>
          <button
            onClick={() => navigate("landowner-upload")}
            className="bg-[#0B2545] hover:bg-[#1A3A6B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <span>↑</span> Upload Documents
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Records", value: live ? String(rows.length) : "3", color: "bg-blue-50 border-blue-100", text: "text-blue-700" },
            { label: "Verified", value: live ? String(nVer) : "1", color: "bg-green-50 border-green-100", text: "text-green-700" },
            { label: "In Progress", value: live ? String(rows.length - nVer) : "2", color: "bg-amber-50 border-amber-100", text: "text-amber-700" },
            { label: "Total Area", value: live ? "—" : "7.2 Bigha", color: "bg-purple-50 border-purple-100", text: "text-purple-700" },
          ].map((s) => (
            <div key={s.label} className={`${s.color} border rounded-xl p-4 card-hover`}>
              <p className={`text-2xl font-bold ${s.text}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress Banner */}
        {!live && (<div className="bg-gradient-to-r from-[#0B2545] to-[#1A3A6B] rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-blue-300 text-xs font-medium uppercase tracking-widest mb-1">Latest Application</p>
              <h3 className="text-lg font-bold">Survey No. 35/B · Malihabad</h3>
              <p className="text-blue-200/70 text-sm mt-1">Submitted 03 Sep 2024 · Ref: LR-2024-003</p>
            </div>
            <span className="badge-pending text-xs px-3 py-1.5 rounded-full font-medium">Officer Review</span>
          </div>
          {/* Process Steps */}
          <div className="flex items-center gap-0 mt-2">
            {["Uploaded", "AI Processing", "Validation", "Officer Review", "Verified"].map((step, i) => (
              <div key={step} className="flex items-center">
                <div className={`flex flex-col items-center ${i < 4 ? "min-w-[80px]" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < 3 ? "bg-green-500 text-white" : i === 3 ? "bg-amber-400 text-[#0B2545] animate-pulse-ring" : "bg-white/20 text-white/40"
                  }`}>
                    {i < 3 ? "✓" : i + 1}
                  </div>
                  <p className={`text-xs mt-1 text-center ${i < 3 ? "text-green-300" : i === 3 ? "text-amber-300 font-medium" : "text-white/30"}`}>{step}</p>
                </div>
                {i < 4 && <div className={`h-0.5 w-8 mb-5 ${i < 3 ? "bg-green-500" : "bg-white/20"}`}></div>}
              </div>
            ))}
          </div>
        </div>)}

        {/* Records Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>My Land Records</h3>
            <span className="text-xs text-gray-400">{rows.length} records</span>
          </div>
          <div className="divide-y divide-gray-50">
            {rows.length === 0 && <p className="px-6 py-8 text-sm text-gray-400">{mine.loading ? "Loading…" : "No submissions yet. Upload your first document."}</p>}
            {rows.map((r) => (
              <div key={r.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">📄</div>
                  <div>
                    <p className="text-sm font-semibold text-[#0B2545]">{r.survey}</p>
                    <p className="text-xs text-gray-400">{r.location} · {r.area}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-400">Updated</p>
                    <p className="text-xs font-medium text-gray-600">{r.updated}</p>
                  </div>
                  {statusBadge(r.status)}
                  <div className="flex gap-2">
                    <button onClick={() => navigate("landowner-track")} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Track</button>
                    {r.status === "verified" && (
                      <button onClick={() => navigate("landowner-record")} className="text-xs text-green-600 hover:text-green-800 font-medium ml-2">View</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          {[
            { icon: "🗺️", label: "View on GIS Map", page: "landowner-map" as Page },
            { icon: "📥", label: "Download Records", page: "landowner-record" as Page },
            { icon: "📍", label: "Track Status", page: "landowner-track" as Page },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.page)}
              className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-blue-200 hover:shadow-md transition-all card-hover"
            >
              <span className="text-2xl mb-2 block">{a.icon}</span>
              <p className="text-sm font-medium text-[#0B2545]">{a.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
