import { Page } from "../../types";
import { useAudit } from "../../store";
import { api } from "../../services/api";
import { useLoad } from "../../hooks";
import { toTrack } from "../../liveData";

interface Props {
  navigate: (p: Page) => void;
}

const seedRecords = [
  {
    id: "LR-2024-003",
    title: "Survey No. 35/B",
    location: "Malihabad, Lucknow, UP",
    current: 3,
    timeline: [
      { step: "Document Uploaded", date: "03 Sep 2024, 11:42 AM", note: "3 files uploaded successfully", done: true },
      { step: "AI OCR Processing", date: "03 Sep 2024, 12:15 PM", note: "Text extraction completed · 97.2% confidence", done: true },
      { step: "Data Validation", date: "03 Sep 2024, 12:18 PM", note: "All fields validated · No duplicates found", done: true },
      { step: "Officer Verification", date: "In Progress", note: "Assigned to Officer Amitabh Kumar", done: false, active: true },
      { step: "Verified Record Issued", date: "Pending", note: "Estimated: 04 Sep 2024", done: false },
    ],
  },
  {
    id: "LR-2024-002",
    title: "Khasra No. 87",
    location: "Kakori, Lucknow, UP",
    current: 1,
    timeline: [
      { step: "Document Uploaded", date: "01 Sep 2024, 09:20 AM", note: "2 files uploaded", done: true },
      { step: "AI OCR Processing", date: "In Progress", note: "Extracting handwritten text...", done: false, active: true },
      { step: "Data Validation", date: "Pending", note: "", done: false },
      { step: "Officer Verification", date: "Pending", note: "", done: false },
      { step: "Verified Record Issued", date: "Pending", note: "", done: false },
    ],
  },
];

export default function TrackStatus({ navigate }: Props) {
  const { submissions, verified } = useAudit();
  const live = submissions.map((s) => ({
    id: s.id, title: `${s.docType}`, location: `${s.tehsil || "—"}, ${s.district}`, current: 1,
    timeline: [
      { step: "Document Uploaded", date: s.uploaded, note: `${s.fileCount} file(s) received`, done: true },
      { step: "AI OCR Processing", date: "Queued", note: "Awaiting processing (demo: no real OCR yet)", done: false, active: true },
      { step: "Data Validation", date: "Pending", note: "", done: false },
      { step: "Officer Verification", date: "Pending", note: "", done: false },
      { step: "Verified Record Issued", date: "Pending", note: "", done: false },
    ],
  }));
  const backend = useLoad(() => api.myDocuments(), api.enabled);
  const records = api.enabled ? (backend.data ?? []).map(toTrack) : [...live, ...seedRecords];
  void verified;
  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-3xl mx-auto animate-fadeIn">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Track Application Status</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time updates on your land record digitization applications.</p>
        </div>

        <div className="space-y-6">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{r.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{r.location} · Ref: <span className="mono font-medium text-blue-600">{r.id}</span></p>
                </div>
                <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${r.current >= 4 ? "badge-verified" : r.current === 3 ? "badge-pending" : "badge-processing"}`}>
                  {r.current >= 4 ? "✓ Verified" : r.current === 3 ? "⏳ Officer Review" : "⟳ AI Processing"}
                </span>
              </div>
              <div className="px-6 py-6">
                <div className="relative">
                  <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-gray-100"></div>
                  <div className="space-y-6">
                    {r.timeline.map((t, i) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 text-xs font-bold ${
                          t.done ? "bg-green-500 border-green-500 text-white"
                          : (t as any).active ? "bg-amber-400 border-amber-400 text-[#0B2545] animate-pulse"
                          : "bg-white border-gray-200 text-gray-300"
                        }`}>
                          {t.done ? "✓" : i + 1}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-semibold ${t.done ? "text-[#0B2545]" : (t as any).active ? "text-amber-700" : "text-gray-300"}`}>{t.step}</p>
                            <p className={`text-xs ${t.done ? "text-gray-400" : (t as any).active ? "text-amber-600 font-medium" : "text-gray-200"}`}>{t.date}</p>
                          </div>
                          {t.note && <p className={`text-xs mt-0.5 ${t.done ? "text-gray-400" : "text-amber-600"}`}>{t.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {r.current >= 4 && (
                <div className="px-6 py-4 bg-green-50 border-t border-green-100 flex items-center justify-between">
                  <p className="text-green-700 text-sm font-medium">✅ Your land record has been verified and certified</p>
                  <button onClick={() => navigate("landowner-record")} className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors">View Record</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
