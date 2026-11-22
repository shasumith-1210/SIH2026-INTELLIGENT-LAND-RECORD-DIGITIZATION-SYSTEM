import { useState } from "react";
import { Page } from "../../types";
import { useAudit } from "../../store";
import { api } from "../../services/api";
import { useLoad } from "../../hooks";
import { fmt } from "../../liveData";

type Stage = "Processed" | "Officer-verified" | "Integrated (via LRMS)";

// DEMONSTRATION DATA. "Integrated" means a record the authorised LRMS owns; IntelliLand never edits government ownership records.
const seed = [
  { id: "REC-2024-0437", owner: "Vijay Kumar", survey: "Survey 201", village: "Mathura Dehat", district: "Mathura", area: 2.4, date: "03 Sep 2024", by: "Amitabh Kumar", stage: "Officer-verified" as Stage },
  { id: "REC-2024-0434", owner: "Kavita Rani", survey: "Khasra 17", village: "Kakori", district: "Lucknow", area: 1.1, date: "03 Sep 2024", by: "Priya Verma", stage: "Integrated (via LRMS)" as Stage },
  { id: "REC-2024-0432", owner: "Hari Om", survey: "Survey 9/A", village: "Chaubeypur", district: "Varanasi", area: 4.8, date: "03 Sep 2024", by: "Amitabh Kumar", stage: "Officer-verified" as Stage },
  { id: "REC-2024-0436", owner: "Priya Gupta", survey: "Khasra 88-B", village: "Sarojini Nagar", district: "Lucknow", area: 0.9, date: "—", by: "—", stage: "Processed" as Stage },
];

const stageCls: Record<Stage, string> = {
  Processed: "bg-gray-100 text-gray-600",
  "Officer-verified": "bg-green-100 text-green-700",
  "Integrated (via LRMS)": "bg-blue-100 text-blue-700",
};

export default function VerifiedRecords({ navigate }: { navigate: (p: Page) => void }) {
  const { verified, verifiedMeta } = useAudit();
  const server = useLoad(() => api.listDocuments(), api.enabled);
  const liveRows = ((server.data ?? []) as import("../../services/api").DocRow[]).filter((d) => d.status === "officer_verified").map((d) => ({
    id: d.id, owner: d.extracted?.owner_name ?? d.owner, survey: `Survey ${d.extracted?.survey_number ?? d.survey}`, village: d.extracted?.village ?? "—", district: d.district,
    area: parseFloat(d.extracted?.area ?? "") || 0, date: fmt(d.uploaded), by: "Officer", stage: "Officer-verified" as Stage,
  }));
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [desc, setDesc] = useState(false);

  const rows = (api.enabled ? liveRows : [
    ...verified.map((id) => {
      const m = verifiedMeta[id] ?? { owner: "Suresh Ramesh Patel", survey: "78/C", village: "Chaubeypur", district: "Varanasi", area: 3.2 };
      return { id, owner: m.owner, survey: `Survey ${m.survey}`, village: m.village, district: m.district, area: m.area, date: "Today", by: "Amitabh Kumar", stage: "Officer-verified" as Stage };
    }),
    ...seed,
  ])
    .filter((r) => (stage === "all" || r.stage === stage) && [r.id, r.owner, r.survey, r.district, r.village].some((v) => v.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (desc ? b.area - a.area : a.area - b.area));

  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-6xl mx-auto animate-fadeIn">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]">Verified Land Records</h1>
            <p className="text-sm text-gray-500 mt-1">Officer verification does not change government ownership records. Integration happens only through authorised LRMS APIs.</p>
          </div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">Demonstration data</span>
        </div>
        <div className="flex gap-3 mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, owner, survey, village, district" className="flex-1 border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm" />
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm">
            <option value="all">All stages</option>
            <option>Processed</option>
            <option>Officer-verified</option>
            <option>Integrated (via LRMS)</option>
          </select>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-400 text-left">
              <tr>
                {["Record ID", "Owner", "Survey", "Village / District"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
                <th className="px-4 py-3 cursor-pointer" onClick={() => setDesc(!desc)}>Area (Bigha) {desc ? "↓" : "↑"}</th>
                {["Verified", "By", "Stage", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 mono text-xs">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-[#0B2545]">{r.owner}</td>
                  <td className="px-4 py-3">{r.survey}</td>
                  <td className="px-4 py-3">{r.village}, {r.district}</td>
                  <td className="px-4 py-3">{r.area}</td>
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3">{r.by}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageCls[r.stage]}`}>{r.stage}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap"><button onClick={() => navigate("officer-audit")} className="text-blue-600 text-xs font-semibold">Audit history</button>{api.enabled && <button onClick={async () => { try { const d = await api.exportRecord(r.id); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" })); a.download = `${r.id}.json`; a.click(); } catch (e) { alert(`Export failed: ${(e as Error).message}`); } }} className="text-blue-600 text-xs font-semibold ml-3">Download</button>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No records match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
